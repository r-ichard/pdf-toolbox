import { useState, useCallback } from 'react';
import { PDFFile, ProcessingProgress } from '@/types';
import FileDropZone from '@/components/FileDropZone';
import ProgressBar from '@/components/ProgressBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Download, Check, FileText, Rotate as RotateIcon } from '@/components/Icons';
import { rotatePDF, downloadFile, getPageCount, generatePDFPreview } from '@/utils/pdfUtils';

interface PageRotation {
  pageNumber: number;
  rotation: number; // 0, 90, 180, 270
  selected: boolean;
  preview?: string;
}

const rotationAngles = [
  { value: 0, label: '0°', icon: '⬆️' },
  { value: 90, label: '90°', icon: '➡️' },
  { value: 180, label: '180°', icon: '⬇️' },
  { value: 270, label: '270°', icon: '⬅️' }
];

export default function RotatePage() {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [pageRotations, setPageRotations] = useState<PageRotation[]>([]);
  const [globalRotation, setGlobalRotation] = useState(90);
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
    
    // Initialize page rotations
    const rotations: PageRotation[] = Array.from({ length: pageCount }, (_, i) => ({
      pageNumber: i + 1,
      rotation: 0,
      selected: false
    }));
    setPageRotations(rotations);
    
    // Load page previews in background
    loadPagePreviews(selectedFile);
  }, []);

  const loadPagePreviews = async (file: File) => {
    setIsLoadingPreviews(true);
    // For now, we'll use the same preview for all pages
    // In a real implementation, you'd generate individual page previews
    const preview = await generatePDFPreview(file);
    
    setPageRotations(prev => prev.map(page => ({
      ...page,
      preview
    })));
    setIsLoadingPreviews(false);
  };

  const togglePageSelection = useCallback((pageNumber: number) => {
    setPageRotations(prev => prev.map(page => 
      page.pageNumber === pageNumber 
        ? { ...page, selected: !page.selected }
        : page
    ));
    setIsComplete(false);
  }, []);

  const selectAllPages = useCallback(() => {
    setPageRotations(prev => prev.map(page => ({ ...page, selected: true })));
    setIsComplete(false);
  }, []);

  const deselectAllPages = useCallback(() => {
    setPageRotations(prev => prev.map(page => ({ ...page, selected: false })));
    setIsComplete(false);
  }, []);

  const rotateSelectedPages = useCallback((angle: number) => {
    setPageRotations(prev => prev.map(page => 
      page.selected 
        ? { ...page, rotation: (page.rotation + angle) % 360 }
        : page
    ));
    setIsComplete(false);
  }, []);

  const rotatePage = useCallback((pageNumber: number, angle: number) => {
    setPageRotations(prev => prev.map(page => 
      page.pageNumber === pageNumber 
        ? { ...page, rotation: (page.rotation + angle) % 360 }
        : page
    ));
    setIsComplete(false);
  }, []);

  const applyGlobalRotation = useCallback(() => {
    setPageRotations(prev => prev.map(page => ({
      ...page,
      rotation: (page.rotation + globalRotation) % 360
    })));
    setIsComplete(false);
  }, [globalRotation]);

  const resetRotations = useCallback(() => {
    setPageRotations(prev => prev.map(page => ({ ...page, rotation: 0 })));
    setIsComplete(false);
  }, []);

  const handleRotate = async () => {
    if (!file) return;

    const pagesToRotate = pageRotations.filter(page => page.rotation !== 0);
    if (pagesToRotate.length === 0) {
      alert('No rotations to apply. Please rotate some pages first.');
      return;
    }
    
    setIsProcessing(true);
    setIsComplete(false);
    
    try {
      // Apply rotations one by one for each unique angle
      let currentPdfBytes = await file.file.arrayBuffer();
      const rotationGroups = new Map<number, number[]>();
      
      // Group pages by rotation angle
      pagesToRotate.forEach(page => {
        if (!rotationGroups.has(page.rotation)) {
          rotationGroups.set(page.rotation, []);
        }
        rotationGroups.get(page.rotation)!.push(page.pageNumber);
      });

      let processedCount = 0;
      const totalOperations = rotationGroups.size;

      for (const [angle, pages] of rotationGroups) {
        if (angle === 0) continue;
        
        setProgress({ 
          current: (processedCount / totalOperations) * 80, 
          total: 100, 
          message: `Rotating pages by ${angle}°...` 
        });

        const rotatedBytes = await rotatePDF(
          new File([currentPdfBytes], file.name),
          pages,
          angle,
          {
            onProgress: (current, message) => {
              const overallProgress = (processedCount / totalOperations) * 80 + (current / totalOperations) * 0.8;
              setProgress({ current: overallProgress, total: 100, message });
            }
          }
        );
        
        currentPdfBytes = rotatedBytes.buffer;
        processedCount++;
      }
      
      setProgress({ current: 95, total: 100, message: 'Finalizing...' });
      
      const fileName = file.name.replace('.pdf', '_rotated.pdf');
      downloadFile(new Uint8Array(currentPdfBytes), fileName);
      setIsComplete(true);
      
      setProgress({ current: 100, total: 100, message: 'Complete!' });
    } catch (error) {
      console.error('Rotation failed:', error);
      setProgress({ current: 0, total: 100, message: 'Error occurred during rotation' });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCount = pageRotations.filter(page => page.selected).length;
  const rotatedCount = pageRotations.filter(page => page.rotation !== 0).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Rotate PDF</h1>
        <p className="text-gray-600">
          Rotate pages in your PDF document by 90°, 180°, or 270°.
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
                Select a PDF file to rotate
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

          {/* Global Actions */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Rotate all pages:</span>
                <select
                  value={globalRotation}
                  onChange={(e) => setGlobalRotation(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  {rotationAngles.slice(1).map(angle => (
                    <option key={angle.value} value={angle.value}>
                      {angle.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={applyGlobalRotation}
                  className="btn-primary py-1 px-3 text-sm"
                >
                  Apply
                </button>
              </div>
              
              <button
                onClick={resetRotations}
                className="btn-secondary py-1 px-3 text-sm"
              >
                Reset All
              </button>
            </div>

            {selectedCount > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  {selectedCount} page{selectedCount !== 1 ? 's' : ''} selected
                </p>
                <div className="flex space-x-2">
                  {rotationAngles.slice(1).map(angle => (
                    <button
                      key={angle.value}
                      onClick={() => rotateSelectedPages(angle.value)}
                      className="btn-primary py-1 px-3 text-sm flex items-center space-x-1"
                    >
                      <span>{angle.icon}</span>
                      <span>{angle.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Page Selection */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Pages ({rotatedCount} with rotations)
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {pageRotations.map((page) => (
                  <div
                    key={page.pageNumber}
                    className={`
                      relative border-2 rounded-lg p-2 transition-colors
                      ${page.selected 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <div 
                      className="aspect-[3/4] bg-gray-100 rounded mb-2 flex items-center justify-center cursor-pointer"
                      onClick={() => togglePageSelection(page.pageNumber)}
                    >
                      {page.preview ? (
                        <img
                          src={page.preview}
                          alt={`Page ${page.pageNumber}`}
                          className="max-w-full max-h-full object-contain"
                          style={{ 
                            transform: `rotate(${page.rotation}deg)`,
                            transition: 'transform 0.3s ease'
                          }}
                        />
                      ) : (
                        <FileText className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    
                    <p className="text-xs text-center font-medium mb-2">
                      Page {page.pageNumber}
                      {page.rotation !== 0 && (
                        <span className="text-primary-600 block">
                          {page.rotation}°
                        </span>
                      )}
                    </p>

                    {/* Rotation Controls */}
                    <div className="flex justify-center space-x-1">
                      {rotationAngles.slice(1).map(angle => (
                        <button
                          key={angle.value}
                          onClick={() => rotatePage(page.pageNumber, angle.value)}
                          className="w-6 h-6 text-xs bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center transition-colors"
                          title={`Rotate ${angle.label}`}
                        >
                          {angle.icon}
                        </button>
                      ))}
                    </div>

                    {page.selected && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}

                    {page.rotation !== 0 && (
                      <div className="absolute top-1 left-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <RotateIcon className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rotation Summary */}
          {rotatedCount > 0 && (
            <div className="card bg-blue-50 border-blue-200">
              <div className="text-center">
                <p className="font-medium text-blue-900">
                  {rotatedCount} page{rotatedCount !== 1 ? 's' : ''} will be rotated
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Click the rotation buttons to adjust individual pages, or use the quick actions above
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
                  <p className="font-medium text-green-900">PDF rotated successfully!</p>
                  <p className="text-sm text-green-700">Your rotated PDF has been downloaded.</p>
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
              onClick={handleRotate}
              disabled={rotatedCount === 0 || isProcessing}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Apply Rotations & Download</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}