import { useState, useCallback } from 'react';
import { PDFFile, ProcessingProgress, CompressionLevel } from '@/types';
import FileDropZone from '@/components/FileDropZone';
import ProgressBar from '@/components/ProgressBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Download, Check, FileText, Compress } from '@/components/Icons';
import { compressPDF, downloadFile, getPageCount, generatePDFPreview } from '@/utils/pdfUtils';

const compressionLevels: CompressionLevel[] = [
  {
    id: 'low',
    name: 'Low Compression',
    description: 'Best quality, larger file size',
    quality: 0.9
  },
  {
    id: 'medium',
    name: 'Medium Compression',
    description: 'Balanced quality and size',
    quality: 0.7
  },
  {
    id: 'high',
    name: 'High Compression',
    description: 'Smallest size, reduced quality',
    quality: 0.5
  }
];

export default function CompressPage() {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<CompressionLevel>(compressionLevels[1]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({ current: 0, total: 100, message: '' });
  const [isComplete, setIsComplete] = useState(false);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

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
    setCompressedSize(null);
  }, []);

  const handleCompress = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setIsComplete(false);
    setCompressedSize(null);
    
    try {
      const compressedPdf = await compressPDF(file.file, {
        quality: selectedLevel.id,
        onProgress: (current, message) => setProgress({ current, total: 100, message })
      });
      
      const fileName = file.name.replace('.pdf', '_compressed.pdf');
      setCompressedSize(compressedPdf.byteLength);
      
      downloadFile(compressedPdf, fileName);
      setIsComplete(true);
    } catch (error) {
      console.error('Compression failed:', error);
      setProgress({ current: 0, total: 100, message: 'Error occurred during compression' });
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

  const calculateSizeReduction = (): { percentage: number; savedBytes: number } => {
    if (!file || !compressedSize) return { percentage: 0, savedBytes: 0 };
    const savedBytes = file.size - compressedSize;
    const percentage = (savedBytes / file.size) * 100;
    return { percentage, savedBytes };
  };

  const sizeReduction = calculateSizeReduction();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Compress PDF</h1>
        <p className="text-gray-600">
          Reduce PDF file size while maintaining quality.
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
                Select a PDF file to compress
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
                  {file.pageCount} pages • {formatFileSize(file.size)}
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

          {/* Compression Level Selection */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Compression Level</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {compressionLevels.map((level) => (
                <div
                  key={level.id}
                  className={`
                    relative border-2 rounded-lg p-4 cursor-pointer transition-colors
                    ${selectedLevel.id === level.id 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => setSelectedLevel(level)}
                >
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto bg-blue-100 rounded-lg flex items-center justify-center">
                      <Compress className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">{level.name}</h4>
                    <p className="text-sm text-gray-600">{level.description}</p>
                  </div>
                  {selectedLevel.id === level.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Compression */}
          <div className="card bg-blue-50 border-blue-200">
            <div className="text-center space-y-2">
              <h4 className="font-medium text-blue-900">Selected: {selectedLevel.name}</h4>
              <p className="text-sm text-blue-700">{selectedLevel.description}</p>
              <div className="flex items-center justify-center space-x-4 mt-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-900">{formatFileSize(file.size)}</p>
                  <p className="text-xs text-blue-600">Current Size</p>
                </div>
                <div className="text-blue-400">→</div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-900">
                    ~{formatFileSize(Math.round(file.size * selectedLevel.quality))}
                  </p>
                  <p className="text-xs text-blue-600">Estimated Size</p>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Estimated reduction: ~{Math.round((1 - selectedLevel.quality) * 100)}%
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

          {/* Success with Results */}
          {isComplete && compressedSize && (
            <div className="card bg-green-50 border-green-200">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">PDF compressed successfully!</p>
                    <p className="text-sm text-green-700">Your compressed PDF has been downloaded.</p>
                  </div>
                </div>
                
                {/* Size Comparison */}
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="font-medium text-gray-900 mb-3">Compression Results</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{formatFileSize(file.size)}</p>
                      <p className="text-xs text-gray-600">Original Size</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary-600">{formatFileSize(compressedSize)}</p>
                      <p className="text-xs text-gray-600">Compressed Size</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">
                        -{sizeReduction.percentage.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-600">Size Reduction</p>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-sm text-gray-600">
                      You saved {formatFileSize(sizeReduction.savedBytes)} of disk space
                    </p>
                  </div>
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
              onClick={handleCompress}
              disabled={isProcessing}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Compress & Download</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}