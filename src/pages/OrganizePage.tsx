import { useState, useCallback } from 'react';
import { PDFFile, ProcessingProgress } from '@/types';
import FileDropZone from '@/components/FileDropZone';
import ProgressBar from '@/components/ProgressBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import LazyThumbnail from '@/components/LazyThumbnail';
import { Download, Check, FileText, Copy, Trash2 } from '@/components/Icons';
import { organizePDFPages, downloadFile, getPageCount, generatePDFPreview, generatePageThumbnailsBatch } from '@/utils/pdfUtils';

interface PageInfo {
  id: string;
  originalPageNumber: number;
  currentPosition: number;
  operation: 'keep' | 'duplicate' | 'delete';
  preview?: string;
  isDuplicate?: boolean;
}

export default function OrganizePage() {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({ current: 0, total: 100, message: '' });
  const [isComplete, setIsComplete] = useState(false);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (files: File[]) => {
    const selectedFile = files[0];
    if (!selectedFile) return;

    const pageCount = await getPageCount(selectedFile);
    const preview = await generatePDFPreview(selectedFile);
    
    const pdfFile: PDFFile = {
      file: selectedFile,
      id: Math.random().toString(36).substring(2, 11),
      name: selectedFile.name,
      size: selectedFile.size,
      pageCount,
      preview
    };

    setFile(pdfFile);
    setIsComplete(false);
    
    // Initialize pages
    const initialPages: PageInfo[] = Array.from({ length: pageCount }, (_, i) => ({
      id: `page-${i + 1}`,
      originalPageNumber: i + 1,
      currentPosition: i,
      operation: 'keep'
    }));
    setPages(initialPages);
    
    // Load page previews in background
    await loadPagePreviews(selectedFile);
  }, []);

  const loadPagePreviews = async (file: File) => {
    setIsLoadingPreviews(true);
    
    try {
      // Get page count from the PDFFile object that has pageCount
      const pageCount = await getPageCount(file);
      const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);
      
      // Generate thumbnails for all pages with progress tracking
      const thumbnails = await generatePageThumbnailsBatch(file, pageNumbers, {
        scale: 1.5,
        quality: 0.8,
        batchSize: 3,
        onProgress: (_completed, _total) => {
          // Optional: could show progress here
        }
      });
      
      // Update pages with individual previews
      setPages(prev => prev.map(page => ({
        ...page,
        preview: thumbnails.get(page.originalPageNumber) || ''
      })));
    } catch (error) {
      console.error('Failed to load page previews:', error);
      // Fallback to first page preview for all pages
      const fallbackPreview = await generatePDFPreview(file);
      setPages(prev => prev.map(page => ({
        ...page,
        preview: fallbackPreview
      })));
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDraggedPageId(pageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault();
    
    if (!draggedPageId) return;
    
    setPages(prev => {
      const newPages = [...prev];
      const draggedIndex = newPages.findIndex(p => p.id === draggedPageId);
      
      if (draggedIndex === -1) return prev;
      
      const draggedPage = newPages[draggedIndex];
      newPages.splice(draggedIndex, 1);
      newPages.splice(targetPosition, 0, draggedPage);
      
      // Update positions
      return newPages.map((page, index) => ({
        ...page,
        currentPosition: index
      }));
    });
    
    setDraggedPageId(null);
    setIsComplete(false);
  };

  const duplicatePage = useCallback((pageId: string) => {
    setPages(prev => {
      const pageIndex = prev.findIndex(p => p.id === pageId);
      if (pageIndex === -1) return prev;
      
      const originalPage = prev[pageIndex];
      const newPage: PageInfo = {
        ...originalPage,
        id: `${originalPage.id}-duplicate-${Date.now()}`,
        isDuplicate: true,
        preview: originalPage.preview // Preserve the thumbnail
      };
      
      const newPages = [...prev];
      newPages.splice(pageIndex + 1, 0, newPage);
      
      // Update positions
      return newPages.map((page, index) => ({
        ...page,
        currentPosition: index
      }));
    });
    setIsComplete(false);
  }, []);

  const deletePage = useCallback((pageId: string) => {
    setPages(prev => {
      const newPages = prev.filter(p => p.id !== pageId);
      
      // Update positions
      return newPages.map((page, index) => ({
        ...page,
        currentPosition: index
      }));
    });
    setIsComplete(false);
  }, []);

  const resetPages = useCallback(() => {
    if (!file) return;
    
    // Create a map of existing previews to preserve them
    const existingPreviews = new Map<number, string>();
    pages.forEach(page => {
      if (page.preview) {
        existingPreviews.set(page.originalPageNumber, page.preview);
      }
    });
    
    const initialPages: PageInfo[] = Array.from({ length: file.pageCount || 0 }, (_, i) => ({
      id: `page-${i + 1}`,
      originalPageNumber: i + 1,
      currentPosition: i,
      operation: 'keep',
      preview: existingPreviews.get(i + 1) || pages[0]?.preview || ''
    }));
    setPages(initialPages);
    setIsComplete(false);
  }, [file, pages]);

  const handleOrganize = async () => {
    if (!file || pages.length === 0) return;
    
    setIsProcessing(true);
    setIsComplete(false);
    
    try {
      // Create page operations
      const operations = pages.map((page, index) => ({
        pageNumber: page.originalPageNumber,
        operation: page.operation,
        newPosition: index
      }));
      
      const organizedPdf = await organizePDFPages(file.file, operations, {
        onProgress: (current, message) => setProgress({ current, total: 100, message })
      });
      
      const fileName = file.name.replace('.pdf', '_organized.pdf');
      downloadFile(organizedPdf, fileName);
      setIsComplete(true);
    } catch (error) {
      console.error('Organization failed:', error);
      setProgress({ current: 0, total: 100, message: 'Error occurred during organization' });
    } finally {
      setIsProcessing(false);
    }
  };

  const hasChanges = file && pages.length !== (file.pageCount || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Organize Pages</h1>
        <p className="text-gray-600">
          Reorder, duplicate, or delete PDF pages with drag and drop.
        </p>
      </div>

      {!file ? (
        <FileDropZone
          onFilesSelected={handleFileSelected}
          acceptedTypes={['.pdf', 'application/pdf']}
          maxFiles={1}
          maxSizePerFile={100 * 1024 * 1024}
        >
          <div className="text-center space-y-4">
            <div className="text-4xl">📄</div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Select a PDF file to organize
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Choose a PDF file (up to 100MB)
              </p>
            </div>
          </div>
        </FileDropZone>
      ) : (
        <div className="space-y-6">
          {/* File Info */}
          <div className="card">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-600">
                  {file.pageCount || 0} original pages • {pages.length} pages in document
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="btn-secondary"
              >
                Change File
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Document Structure</h3>
              <div className="flex space-x-2">
                <button
                  onClick={resetPages}
                  className="btn-secondary py-2 px-3 text-sm"
                >
                  Reset to Original
                </button>
              </div>
            </div>
            
            {pages.length !== (file.pageCount || 0) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  {pages.length > (file.pageCount || 0)
                    ? `Added ${pages.length - (file.pageCount || 0)} page${pages.length - (file.pageCount || 0) !== 1 ? 's' : ''} (duplicates)`
                    : `Removed ${(file.pageCount || 0) - pages.length} page${(file.pageCount || 0) - pages.length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
            )}
          </div>

          {/* Page Grid */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Pages ({pages.length})
            </h3>

            {isLoadingPreviews ? (
              <div className="text-center py-8">
                <LoadingSpinner message="Loading page previews..." />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8" data-testid="page-grid">
                {pages.map((page, index) => (
                  <div
                    key={page.id}
                    data-testid="page-item"
                    className="relative border-2 border-gray-200 rounded-lg p-2 bg-white hover:border-gray-300 transition-colors cursor-move"
                    draggable
                    onDragStart={(e) => handleDragStart(e, page.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <div className="aspect-[3/4] bg-gray-100 rounded mb-2 min-h-[200px]">
                      <LazyThumbnail
                        src={page.preview}
                        alt={`Page ${page.originalPageNumber}`}
                        className="w-full h-full"
                        pageNumber={page.originalPageNumber}
                        showPageNumber={false}
                      />
                    </div>
                    
                    <div className="text-xs text-center mb-2">
                      <p className="font-medium">
                        Page {page.originalPageNumber}
                        {page.isDuplicate && ' (Copy)'}
                      </p>
                      <p className="text-gray-500">Position {index + 1}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center space-x-1">
                      <button
                        onClick={() => duplicatePage(page.id)}
                        className="w-6 h-6 bg-blue-100 hover:bg-blue-200 rounded flex items-center justify-center transition-colors"
                        title="Duplicate page"
                      >
                        <Copy className="w-3 h-3 text-blue-600" />
                      </button>
                      <button
                        onClick={() => deletePage(page.id)}
                        className="w-6 h-6 bg-red-100 hover:bg-red-200 rounded flex items-center justify-center transition-colors"
                        title="Delete page"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>

                    {/* Position indicator */}
                    <div className="absolute top-1 left-1 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>

                    {page.isDuplicate && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Copy className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>💡 Drag pages to reorder • Use duplicate/delete buttons to modify structure</p>
            </div>
          </div>

          {/* Organization Summary */}
          {hasChanges && (
            <div className="card bg-blue-50 border-blue-200">
              <div className="text-center">
                <p className="font-medium text-blue-900">
                  Document structure has been modified
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Original: {file.pageCount || 0} pages → New: {pages.length} pages
                </p>
              </div>
            </div>
          )}

          {/* Processing */}
          {isProcessing && (
            <div className="card">
              <div className="text-center space-y-4">
                <LoadingSpinner size="lg" />
                <ProgressBar 
                  progress={progress.current}
                  message={progress.message}
                />
              </div>
            </div>
          )}

          {/* Success */}
          {isComplete && (
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900">PDF organized successfully!</p>
                  <p className="text-sm text-green-700">Your organized PDF has been downloaded.</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setFile(null)}
              className="btn-secondary flex-1"
              disabled={isProcessing}
            >
              Select Different File
            </button>
            <button
              onClick={handleOrganize}
              disabled={pages.length === 0 || isProcessing}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Apply Changes & Download</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}