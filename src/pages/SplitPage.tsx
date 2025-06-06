import { useState, useCallback } from 'react';
import { PDFFile, ProcessingProgress } from '@/types';
import FileDropZone from '@/components/FileDropZone';
import ProgressBar from '@/components/ProgressBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import LazyThumbnail from '@/components/LazyThumbnail';
import { Download, Check, FileText } from '@/components/Icons';
import { splitPDF, downloadZip, getPageCount, generatePDFPreview, generatePageThumbnailsBatch } from '@/utils/pdfUtils';

interface PageSelection {
  pageNumber: number;
  selected: boolean;
  preview?: string;
}

type SplitMode = 'pages' | 'ranges' | 'every-n';

export default function SplitPage() {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>('pages');
  const [everyN, setEveryN] = useState(1);
  const [pageSelections, setPageSelections] = useState<PageSelection[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({ current: 0, total: 100, message: '' });
  const [isComplete, setIsComplete] = useState(false);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);

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
    
    // Initialize page selections
    const selections: PageSelection[] = Array.from({ length: pageCount }, (_, i) => ({
      pageNumber: i + 1,
      selected: false
    }));
    setPageSelections(selections);
    
    // Load page previews in background
    await loadPagePreviews(selectedFile);
  }, []);

  const loadPagePreviews = async (file: File) => {
    setIsLoadingPreviews(true);
    
    try {
      // Get page count from the file
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
      
      // Update page selections with individual previews
      setPageSelections(prev => prev.map(page => ({
        ...page,
        preview: thumbnails.get(page.pageNumber) || ''
      })));
    } catch (error) {
      console.error('Failed to load page previews:', error);
      // Fallback to first page preview for all pages
      const fallbackPreview = await generatePDFPreview(file);
      setPageSelections(prev => prev.map(page => ({
        ...page,
        preview: fallbackPreview
      })));
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  const togglePageSelection = useCallback((pageNumber: number) => {
    setPageSelections(prev => prev.map(page => 
      page.pageNumber === pageNumber 
        ? { ...page, selected: !page.selected }
        : page
    ));
    setIsComplete(false);
  }, []);

  const selectAllPages = useCallback(() => {
    setPageSelections(prev => prev.map(page => ({ ...page, selected: true })));
    setIsComplete(false);
  }, []);

  const deselectAllPages = useCallback(() => {
    setPageSelections(prev => prev.map(page => ({ ...page, selected: false })));
    setIsComplete(false);
  }, []);

  const handleSplit = async () => {
    if (!file) return;

    setIsProcessing(true);
    setIsComplete(false);

    try {
      let splitOptions;
      
      if (splitMode === 'every-n') {
        splitOptions = {
          mode: 'ranges' as const,
          everyN: everyN,
          onProgress: (current: number, message: string) => setProgress({ current, total: 100, message })
        };
      } else if (splitMode === 'pages') {
        const selectedPages = pageSelections
          .filter(page => page.selected)
          .map(page => page.pageNumber);
        
        if (selectedPages.length === 0) {
          alert('Please select at least one page to split');
          setIsProcessing(false);
          return;
        }
        
        splitOptions = {
          mode: 'pages' as const,
          pages: selectedPages,
          onProgress: (current: number, message: string) => setProgress({ current, total: 100, message })
        };
      } else {
        // ranges mode - simplified for now
        const selectedPages = pageSelections
          .filter(page => page.selected)
          .map(page => page.pageNumber);
        
        if (selectedPages.length === 0) {
          alert('Please select at least one page to split');
          setIsProcessing(false);
          return;
        }
        
        splitOptions = {
          mode: 'pages' as const,
          pages: selectedPages,
          onProgress: (current: number, message: string) => setProgress({ current, total: 100, message })
        };
      }

      const splitResults = await splitPDF(file.file, splitOptions);
      
      if (splitResults.length > 0) {
        const zipName = `${file.name.replace('.pdf', '')}_split.zip`;
        await downloadZip(splitResults, zipName);
        setIsComplete(true);
      }
    } catch (error) {
      console.error('Split failed:', error);
      setProgress({ current: 0, total: 100, message: 'Error occurred during split' });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCount = pageSelections.filter(page => page.selected).length;
  const canSplit = file && (
    (splitMode === 'every-n' && everyN > 0) ||
    (splitMode !== 'every-n' && selectedCount > 0)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Split PDF</h1>
        <p className="text-gray-600">
          Divide a PDF into separate pages or sections.
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
                Select a PDF file to split
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
                  {file.pageCount} pages • {(file.size / 1024 / 1024).toFixed(1)}MB
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

          {/* Split Mode Selection */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Split Method</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="splitMode"
                  value="pages"
                  checked={splitMode === 'pages'}
                  onChange={(e) => setSplitMode(e.target.value as SplitMode)}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm font-medium text-gray-900">
                  Extract specific pages
                </span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="splitMode"
                  value="every-n"
                  checked={splitMode === 'every-n'}
                  onChange={(e) => setSplitMode(e.target.value as SplitMode)}
                  className="w-4 h-4 text-primary-600"
                />
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    Split every
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={file.pageCount || 1}
                    value={everyN}
                    onChange={(e) => setEveryN(parseInt(e.target.value) || 1)}
                    disabled={splitMode !== 'every-n'}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    pages
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Page Selection */}
          {splitMode === 'pages' && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Select Pages ({selectedCount} selected)
                </h3>
                <div className="space-x-2">
                  <button
                    onClick={selectAllPages}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllPages}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {isLoadingPreviews ? (
                <div className="text-center py-8">
                  <LoadingSpinner message="Loading page previews..." />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8" data-testid="page-grid">
                  {pageSelections.map((page) => (
                    <div
                      key={page.pageNumber}
                      data-testid="page-item"
                      className={`
                        relative border-2 rounded-lg p-2 cursor-pointer transition-colors
                        ${page.selected 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                      onClick={() => togglePageSelection(page.pageNumber)}
                    >
                      <div className="aspect-[3/4] bg-gray-100 rounded mb-2 min-h-[200px]">
                        <LazyThumbnail
                          src={page.preview}
                          alt={`Page ${page.pageNumber}`}
                          className="w-full h-full"
                          pageNumber={page.pageNumber}
                          showPageNumber={false}
                        />
                      </div>
                      <p className="text-xs text-center font-medium">
                        Page {page.pageNumber}
                      </p>
                      {page.selected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Split Summary */}
          {canSplit && (
            <div className="card bg-blue-50 border-blue-200">
              <div className="text-center">
                <p className="font-medium text-blue-900">
                  {splitMode === 'every-n' 
                    ? `Will create ${Math.ceil((file.pageCount || 1) / everyN)} PDF files`
                    : `Will extract ${selectedCount} page${selectedCount !== 1 ? 's' : ''} as separate PDF${selectedCount !== 1 ? 's' : ''}`
                  }
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Result will be downloaded as a ZIP file
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
                  <p className="font-medium text-green-900">PDF split successfully!</p>
                  <p className="text-sm text-green-700">Your split PDFs have been downloaded as a ZIP file.</p>
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
              onClick={handleSplit}
              disabled={!canSplit || isProcessing}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Split & Download</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}