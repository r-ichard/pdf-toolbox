import { useState, useCallback } from 'react';
import { ProcessingProgress, PageSize } from '@/types';
import FileDropZone from '@/components/FileDropZone';
import ProgressBar from '@/components/ProgressBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Download, Check, Image as ImageIcon, X } from '@/components/Icons';
import { convertImagesToPDF } from '@/utils/imageUtils';
import { downloadFile } from '@/utils/pdfUtils';

interface ImageFile {
  file: File;
  id: string;
  name: string;
  size: number;
  preview: string;
}

type FitMode = 'fit' | 'fill' | 'center';
type Quality = 'high' | 'medium' | 'low';

const pageSizes: PageSize[] = [
  { id: 'a4', name: 'A4', width: 595, height: 842 },
  { id: 'letter', name: 'Letter', width: 612, height: 792 },
  { id: 'legal', name: 'Legal', width: 612, height: 1008 },
  { id: 'custom', name: 'Custom', width: 612, height: 792 }
];

const fitModes = [
  { id: 'fit' as FitMode, name: 'Fit to page', description: 'Scale to fit while maintaining aspect ratio' },
  { id: 'fill' as FitMode, name: 'Fill page', description: 'Scale to fill page, may crop image' },
  { id: 'center' as FitMode, name: 'Center original', description: 'Center image at original size' }
];

const qualityLevels = [
  { id: 'high' as Quality, name: 'High Quality', description: 'Best quality, larger file size' },
  { id: 'medium' as Quality, name: 'Medium Quality', description: 'Balanced quality and size' },
  { id: 'low' as Quality, name: 'Low Quality', description: 'Smaller size, reduced quality' }
];

export default function ImageToPdfPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>(pageSizes[0]);
  const [customWidth, setCustomWidth] = useState(612);
  const [customHeight, setCustomHeight] = useState(792);
  const [fitMode, setFitMode] = useState<FitMode>('fit');
  const [quality, setQuality] = useState<Quality>('medium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({ current: 0, total: 100, message: '' });
  const [isComplete, setIsComplete] = useState(false);

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const imageFiles: ImageFile[] = [];
    
    for (const file of files) {
      const preview = await createImagePreview(file);
      imageFiles.push({
        file,
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        preview
      });
    }
    
    setImages(prev => [...prev, ...imageFiles]);
    setIsComplete(false);
  }, []);

  const handleRemoveImage = useCallback((imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    setIsComplete(false);
  }, []);

  const handleReorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setImages(prev => {
      const newImages = [...prev];
      const [removed] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, removed);
      return newImages;
    });
    setIsComplete(false);
  }, []);

  const handleConvert = async () => {
    if (images.length === 0) return;
    
    setIsProcessing(true);
    setIsComplete(false);
    
    try {
      const currentPageSize = pageSize.id === 'custom' 
        ? { width: customWidth, height: customHeight }
        : pageSize;

      const pdfBytes = await convertImagesToPDF(
        images.map(img => img.file),
        {
          pageSize: currentPageSize,
          fitMode,
          quality,
          onProgress: (current, message) => setProgress({ current, total: 100, message })
        }
      );
      
      const fileName = `images_to_pdf_${Date.now()}.pdf`;
      downloadFile(pdfBytes, fileName);
      setIsComplete(true);
    } catch (error) {
      console.error('Conversion failed:', error);
      setProgress({ current: 0, total: 100, message: 'Error occurred during conversion' });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSize = images.reduce((sum, img) => sum + img.size, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Images to PDF</h1>
        <p className="text-gray-600">
          Create a PDF from multiple image files.
        </p>
      </div>

      <FileDropZone
        onFilesSelected={handleFilesSelected}
        acceptedTypes={['.jpg', '.jpeg', '.png', '.bmp', '.tiff', 'image/jpeg', 'image/png', 'image/bmp', 'image/tiff']}
        maxFiles={50}
        maxSizePerFile={50 * 1024 * 1024}
        className={images.length > 0 ? 'border-dashed border-2 border-gray-300 rounded-lg p-4' : ''}
      >
        <div className="text-center space-y-4">
          <div className="text-4xl">🖼️</div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {images.length > 0 ? 'Add more images' : 'Select image files'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              JPG, PNG, BMP, TIFF (up to 50 files, 50MB each)
            </p>
          </div>
        </div>
      </FileDropZone>

      {images.length > 0 && (
        <div className="space-y-6">
          {/* Image Preview */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Images ({images.length}) • {formatFileSize(totalSize)}
              </h3>
              <button
                onClick={() => setImages([])}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="relative border border-gray-200 rounded-lg p-2 bg-white hover:bg-gray-50 transition-colors cursor-move"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', index.toString())}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    handleReorderImages(fromIndex, index);
                  }}
                >
                  <div className="aspect-[3/4] bg-gray-100 rounded mb-2 overflow-hidden">
                    <img
                      src={image.preview}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-center font-medium truncate">
                    {image.name}
                  </p>
                  <div className="text-xs text-center text-gray-500">
                    {formatFileSize(image.size)}
                  </div>
                  <button
                    onClick={() => handleRemoveImage(image.id)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                    aria-label={`Remove ${image.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute top-1 left-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Drag and drop to reorder images
            </p>
          </div>

          {/* Page Settings */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">PDF Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Page Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Size
                </label>
                <div className="space-y-2">
                  {pageSizes.map((size) => (
                    <label key={size.id} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="pageSize"
                        value={size.id}
                        checked={pageSize.id === size.id}
                        onChange={() => setPageSize(size)}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-sm text-gray-900">
                        {size.name} {size.id !== 'custom' && `(${size.width} × ${size.height})`}
                      </span>
                    </label>
                  ))}
                </div>
                
                {pageSize.id === 'custom' && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Width (px)</label>
                      <input
                        type="number"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(parseInt(e.target.value) || 612)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        min="100"
                        max="2000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Height (px)</label>
                      <input
                        type="number"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(parseInt(e.target.value) || 792)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        min="100"
                        max="2000"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Fit Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Fit
                </label>
                <div className="space-y-2">
                  {fitModes.map((mode) => (
                    <label key={mode.id} className="flex items-start space-x-2">
                      <input
                        type="radio"
                        name="fitMode"
                        value={mode.id}
                        checked={fitMode === mode.id}
                        onChange={() => setFitMode(mode.id)}
                        className="w-4 h-4 text-primary-600 mt-0.5"
                      />
                      <div>
                        <span className="text-sm text-gray-900 block">{mode.name}</span>
                        <span className="text-xs text-gray-600">{mode.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Quality */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quality
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {qualityLevels.map((level) => (
                  <div
                    key={level.id}
                    className={`
                      border-2 rounded-lg p-3 cursor-pointer transition-colors
                      ${quality === level.id 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                    onClick={() => setQuality(level.id)}
                  >
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-900">{level.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{level.description}</p>
                    </div>
                    {quality === level.id && (
                      <div className="flex justify-center mt-2">
                        <div className="w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Conversion Summary */}
          <div className="card bg-blue-50 border-blue-200">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                <p className="font-medium text-blue-900">
                  Create PDF with {images.length} image{images.length !== 1 ? 's' : ''}
                </p>
              </div>
              <p className="text-sm text-blue-700">
                Page Size: {pageSize.name} • Fit: {fitModes.find(m => m.id === fitMode)?.name} • Quality: {qualityLevels.find(q => q.id === quality)?.name}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Total size: {formatFileSize(totalSize)}
              </p>
            </div>
          </div>

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
                  <p className="font-medium text-green-900">PDF created successfully!</p>
                  <p className="text-sm text-green-700">Your PDF has been downloaded.</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setImages([])}
              className="btn-secondary flex-1"
              disabled={isProcessing}
            >
              Clear All Images
            </button>
            <button
              onClick={handleConvert}
              disabled={images.length === 0 || isProcessing}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Create PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}