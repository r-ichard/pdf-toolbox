import { useState, useCallback } from 'react';
import { PDFFile, ProcessingProgress } from '@/types';
import FileDropZone from '@/components/FileDropZone';
import ProgressBar from '@/components/ProgressBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Download, Check, FileText, Upload } from '@/components/Icons';
import { addWatermarkToPDF, downloadFile, getPageCount, generatePDFPreview } from '@/utils/pdfUtils';

interface PageSelection {
  pageNumber: number;
  selected: boolean;
  preview?: string;
}

type WatermarkType = 'text' | 'image';

const presetPositions = [
  { id: 'center', name: 'Center', x: 50, y: 50 },
  { id: 'top-left', name: 'Top Left', x: 15, y: 15 },
  { id: 'top-right', name: 'Top Right', x: 85, y: 15 },
  { id: 'bottom-left', name: 'Bottom Left', x: 15, y: 85 },
  { id: 'bottom-right', name: 'Bottom Right', x: 85, y: 85 },
  { id: 'custom', name: 'Custom', x: 50, y: 50 }
];

export default function WatermarkPage() {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [watermarkType, setWatermarkType] = useState<WatermarkType>('text');
  const [textContent, setTextContent] = useState('CONFIDENTIAL');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState('#ff0000');
  const [opacity, setOpacity] = useState(0.5);
  const [selectedPosition, setSelectedPosition] = useState(presetPositions[0]);
  const [customPosition, setCustomPosition] = useState({ x: 50, y: 50 });
  const [pageSelections, setPageSelections] = useState<PageSelection[]>([]);
  const [applyToAll, setApplyToAll] = useState(true);
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
    
    // Initialize page selections
    const selections: PageSelection[] = Array.from({ length: pageCount }, (_, i) => ({
      pageNumber: i + 1,
      selected: true
    }));
    setPageSelections(selections);
    
    // Load page previews in background
    loadPagePreviews(selectedFile);
  }, []);

  const loadPagePreviews = async (file: File) => {
    setIsLoadingPreviews(true);
    const preview = await generatePDFPreview(file);
    
    setPageSelections(prev => prev.map(page => ({
      ...page,
      preview
    })));
    setIsLoadingPreviews(false);
  };

  const handleImageSelected = useCallback(async (files: File[]) => {
    const selectedFile = files[0];
    if (!selectedFile) return;

    setImageFile(selectedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const togglePageSelection = useCallback((pageNumber: number) => {
    setPageSelections(prev => prev.map(page => 
      page.pageNumber === pageNumber 
        ? { ...page, selected: !page.selected }
        : page
    ));
    setIsComplete(false);
  }, []);

  const toggleApplyToAll = useCallback(() => {
    const newApplyToAll = !applyToAll;
    setApplyToAll(newApplyToAll);
    
    if (newApplyToAll) {
      setPageSelections(prev => prev.map(page => ({ ...page, selected: true })));
    }
    setIsComplete(false);
  }, [applyToAll]);

  const handlePositionChange = useCallback((position: typeof presetPositions[0]) => {
    setSelectedPosition(position);
    if (position.id !== 'custom') {
      setCustomPosition({ x: position.x, y: position.y });
    }
  }, []);

  const handleWatermark = async () => {
    if (!file) return;

    if (watermarkType === 'text' && !textContent.trim()) {
      alert('Please enter watermark text');
      return;
    }

    if (watermarkType === 'image' && !imageFile) {
      alert('Please select an image file');
      return;
    }

    const selectedPages = applyToAll 
      ? undefined 
      : pageSelections.filter(page => page.selected).map(page => page.pageNumber);
    
    if (!applyToAll && (!selectedPages || selectedPages.length === 0)) {
      alert('Please select at least one page');
      return;
    }
    
    setIsProcessing(true);
    setIsComplete(false);
    
    try {
      const position = selectedPosition.id === 'custom' ? customPosition : selectedPosition;
      
      const watermarkedPdf = await addWatermarkToPDF(file.file, {
        type: watermarkType,
        content: watermarkType === 'text' ? textContent : '',
        opacity: opacity,
        position: { x: position.x, y: position.y },
        pages: selectedPages,
        fontSize: fontSize,
        fontColor: fontColor,
        imageFile: watermarkType === 'image' ? imageFile || undefined : undefined,
        onProgress: (current, message) => setProgress({ current, total: 100, message })
      });
      
      const fileName = file.name.replace('.pdf', '_watermarked.pdf');
      downloadFile(watermarkedPdf, fileName);
      setIsComplete(true);
    } catch (error) {
      console.error('Watermarking failed:', error);
      setProgress({ current: 0, total: 100, message: 'Error occurred during watermarking' });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCount = pageSelections.filter(page => page.selected).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Add Watermark</h1>
        <p className="text-gray-600">
          Add text or image watermarks to your PDF pages.
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
                Select a PDF file to add watermark
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

          {/* Watermark Type */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Watermark Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${watermarkType === 'text' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="radio"
                  name="watermarkType"
                  value="text"
                  checked={watermarkType === 'text'}
                  onChange={() => setWatermarkType('text')}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="text-2xl mb-2">📝</div>
                  <h4 className="font-medium text-gray-900">Text Watermark</h4>
                  <p className="text-sm text-gray-600">Add custom text as watermark</p>
                </div>
              </label>

              <label className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${watermarkType === 'image' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="radio"
                  name="watermarkType"
                  value="image"
                  checked={watermarkType === 'image'}
                  onChange={() => setWatermarkType('image')}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="text-2xl mb-2">🖼️</div>
                  <h4 className="font-medium text-gray-900">Image Watermark</h4>
                  <p className="text-sm text-gray-600">Add image as watermark</p>
                </div>
              </label>
            </div>
          </div>

          {/* Watermark Content */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Watermark Content</h3>
            
            {watermarkType === 'text' ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="text-content" className="block text-sm font-medium text-gray-700 mb-1">
                    Text Content
                  </label>
                  <input
                    id="text-content"
                    type="text"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Enter watermark text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="font-size" className="block text-sm font-medium text-gray-700 mb-1">
                      Font Size: {fontSize}px
                    </label>
                    <input
                      id="font-size"
                      type="range"
                      min="8"
                      max="72"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label htmlFor="font-color" className="block text-sm font-medium text-gray-700 mb-1">
                      Font Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        id="font-color"
                        type="color"
                        value={fontColor}
                        onChange={(e) => setFontColor(e.target.value)}
                        className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={fontColor}
                        onChange={(e) => setFontColor(e.target.value)}
                        className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {!imageFile ? (
                  <FileDropZone
                    onFilesSelected={handleImageSelected}
                    acceptedTypes={['.jpg', '.jpeg', '.png', 'image/jpeg', 'image/png']}
                    maxFiles={1}
                    maxSizePerFile={10 * 1024 * 1024}
                    className="border-dashed border-2 border-gray-300 rounded-lg p-6"
                  >
                    <div className="text-center space-y-2">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                      <p className="text-sm text-gray-600">
                        Drop image here or click to select
                      </p>
                      <p className="text-xs text-gray-500">
                        JPG, PNG (up to 10MB)
                      </p>
                    </div>
                  </FileDropZone>
                ) : (
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <img
                      src={imagePreview}
                      alt="Watermark preview"
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{imageFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(imageFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Position and Opacity */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Position & Appearance</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {presetPositions.map((position) => (
                    <button
                      key={position.id}
                      onClick={() => handlePositionChange(position)}
                      className={`p-2 text-sm border rounded transition-colors ${
                        selectedPosition.id === position.id
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {position.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedPosition.id === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      X Position: {customPosition.x}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={customPosition.x}
                      onChange={(e) => setCustomPosition(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Y Position: {customPosition.y}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={customPosition.y}
                      onChange={(e) => setCustomPosition(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opacity: {Math.round(opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Page Selection */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Apply to Pages</h3>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={toggleApplyToAll}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm text-gray-700">All pages</span>
              </label>
            </div>

            {!applyToAll && (
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
                        <div className="aspect-[3/4] bg-gray-100 rounded mb-2 flex items-center justify-center relative">
                          {page.preview ? (
                            <img
                              src={page.preview}
                              alt={`Page ${page.pageNumber}`}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <FileText className="w-8 h-8 text-gray-400" />
                          )}
                          
                          {/* Watermark Preview */}
                          {(watermarkType === 'text' ? textContent.trim() : imageFile) && (
                            <div 
                              className="absolute text-xs opacity-50"
                              style={{
                                left: `${selectedPosition.id === 'custom' ? customPosition.x : selectedPosition.x}%`,
                                top: `${selectedPosition.id === 'custom' ? customPosition.y : selectedPosition.y}%`,
                                transform: 'translate(-50%, -50%)',
                                color: watermarkType === 'text' ? fontColor : undefined
                              }}
                            >
                              {watermarkType === 'text' ? textContent.substring(0, 10) : '🖼️'}
                            </div>
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
                  <p className="font-medium text-green-900">Watermark added successfully!</p>
                  <p className="text-sm text-green-700">Your watermarked PDF has been downloaded.</p>
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
              onClick={handleWatermark}
              disabled={
                isProcessing || 
                (watermarkType === 'text' && !textContent.trim()) ||
                (watermarkType === 'image' && !imageFile) ||
                (!applyToAll && selectedCount === 0)
              }
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Add Watermark & Download</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}