import { useState, useCallback } from 'react';
import { PDFFile, ProcessingProgress, ImageFormat, Resolution } from '@/types';
import FileDropZone from '@/components/FileDropZone';
import ProgressBar from '@/components/ProgressBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Download, Check, FileText, Image } from '@/components/Icons';
import { convertPdfToImages, downloadImageZip } from '@/utils/imageUtils';
import { getPageCount, generatePDFPreview } from '@/utils/pdfUtils';

interface PageSelection {
  pageNumber: number;
  selected: boolean;
  preview?: string;
}

const imageFormats: ImageFormat[] = [
  { id: 'jpg', name: 'JPEG', extension: 'jpg' },
  { id: 'png', name: 'PNG', extension: 'png' }
];

const resolutions: Resolution[] = [
  { id: '72', name: '72 DPI (Web)', dpi: 72 },
  { id: '150', name: '150 DPI (Print)', dpi: 150 },
  { id: '300', name: '300 DPI (High Quality)', dpi: 300 }
];

export default function PdfToImagePage() {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ImageFormat>(imageFormats[0]);
  const [selectedResolution, setSelectedResolution] = useState<Resolution>(resolutions[1]);
  const [quality, setQuality] = useState(0.9);
  const [pageSelections, setPageSelections] = useState<PageSelection[]>([]);
  const [selectAll, setSelectAll] = useState(true);
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
      id: Math.random().toString(36).substr(2, 9),
      name: selectedFile.name,
      size: selectedFile.size,
      pageCount,
      preview
    };

    setFile(pdfFile);
    setIsComplete(false);
    
    // Initialize page selections (all selected by default)
    const selections: PageSelection[] = Array.from({ length: pageCount }, (_, i) => ({
      pageNumber: i + 1,
      selected: true
    }));
    setPageSelections(selections);
    setSelectAll(true);
    
    // Load page previews in background
    loadPagePreviews(selectedFile);
  }, []);

  const loadPagePreviews = async (file: File) => {
    setIsLoadingPreviews(true);
    // For now, we'll use the same preview for all pages
    // In a real implementation, you'd generate individual page previews
    const preview = await generatePDFPreview(file);
    
    setPageSelections(prev => prev.map(page => ({
      ...page,
      preview
    })));
    setIsLoadingPreviews(false);
  };

  const togglePageSelection = useCallback((pageNumber: number) => {
    setPageSelections(prev => {
      const newSelections = prev.map(page => 
        page.pageNumber === pageNumber 
          ? { ...page, selected: !page.selected }
          : page
      );
      const allSelected = newSelections.every(page => page.selected);
      setSelectAll(allSelected);
      return newSelections;
    });
    setIsComplete(false);
  }, []);

  const toggleSelectAll = useCallback(() => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setPageSelections(prev => prev.map(page => ({ ...page, selected: newSelectAll })));
    setIsComplete(false);
  }, [selectAll]);

  const handleConvert = async () => {
    if (!file) return;

    const selectedPages = selectAll 
      ? undefined 
      : pageSelections.filter(page => page.selected).map(page => page.pageNumber);
    
    if (!selectAll && (!selectedPages || selectedPages.length === 0)) {
      alert('Please select at least one page to convert');
      return;
    }
    
    setIsProcessing(true);
    setIsComplete(false);
    
    try {
      const images = await convertPdfToImages(file.file, {
        format: selectedFormat.id,
        quality: quality,
        dpi: selectedResolution.dpi,
        pages: selectedPages,
        onProgress: (current, message) => setProgress({ current, total: 100, message })
      });
      
      if (images.length > 0) {
        const zipName = `${file.name.replace('.pdf', '')}_images.zip`;
        await downloadImageZip(images, zipName);
        setIsComplete(true);
      }
    } catch (error) {
      console.error('Conversion failed:', error);
      setProgress({ current: 0, total: 100, message: 'Error occurred during conversion' });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCount = pageSelections.filter(page => page.selected).length;
  const canConvert = file && (selectAll || selectedCount > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">PDF to Images</h1>
        <p className="text-gray-600">
          Convert PDF pages to JPG or PNG images.
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
                Select a PDF file to convert
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

          {/* Conversion Settings */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Conversion Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Format
                </label>
                <div className="space-y-2">
                  {imageFormats.map((format) => (
                    <label key={format.id} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="format"
                        value={format.id}
                        checked={selectedFormat.id === format.id}
                        onChange={() => setSelectedFormat(format)}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-sm text-gray-900">{format.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Resolution Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution
                </label>
                <div className="space-y-2">
                  {resolutions.map((resolution) => (
                    <label key={resolution.id} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="resolution"
                        value={resolution.id}
                        checked={selectedResolution.id === resolution.id}
                        onChange={() => setSelectedResolution(resolution)}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-sm text-gray-900">{resolution.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Quality Slider (only for JPG) */}
            {selectedFormat.id === 'jpg' && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality: {Math.round(quality * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Smaller size</span>
                  <span>Better quality</span>
                </div>
              </div>
            )}
          </div>

          {/* Page Selection */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Select Pages to Convert
              </h3>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm text-gray-700">All pages</span>
              </label>
            </div>

            {!selectAll && (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  {selectedCount} of {file.pageCount} pages selected
                </div>

                {isLoadingPreviews ? (
                  <div className="text-center py-8">
                    <LoadingSpinner message="Loading page previews..." />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {pageSelections.map((page) => (
                      <div
                        key={page.pageNumber}
                        className={`
                          relative border-2 rounded-lg p-2 cursor-pointer transition-colors
                          ${page.selected 
                            ? 'border-primary-500 bg-primary-50' 
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                        onClick={() => togglePageSelection(page.pageNumber)}
                      >
                        <div className="aspect-[3/4] bg-gray-100 rounded mb-2 flex items-center justify-center">
                          {page.preview ? (
                            <img
                              src={page.preview}
                              alt={`Page ${page.pageNumber}`}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <FileText className="w-8 h-8 text-gray-400" />
                          )}
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
              </>
            )}
          </div>

          {/* Conversion Summary */}
          {canConvert && (
            <div className="card bg-blue-50 border-blue-200">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Image className="w-5 h-5 text-blue-600" />
                  <p className="font-medium text-blue-900">
                    {selectAll ? `Convert all ${file.pageCount} pages` : `Convert ${selectedCount} selected page${selectedCount !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <p className="text-sm text-blue-700">
                  Format: {selectedFormat.name} • Resolution: {selectedResolution.dpi} DPI
                  {selectedFormat.id === 'jpg' && ` • Quality: ${Math.round(quality * 100)}%`}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Images will be downloaded as a ZIP file
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
                  <p className="font-medium text-green-900">PDF converted successfully!</p>
                  <p className="text-sm text-green-700">Your images have been downloaded as a ZIP file.</p>
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
              onClick={handleConvert}
              disabled={!canConvert || isProcessing}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Convert & Download</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}