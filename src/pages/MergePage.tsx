import { useState, useCallback } from 'react';
import { PDFFile, ProcessingProgress } from '@/types';
import FileDropZone from '@/components/FileDropZone';
import FilePreview from '@/components/FilePreview';
import ProgressBar from '@/components/ProgressBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Download, Check, AlertCircle } from '@/components/Icons';
import { mergePDFs, downloadFile, getPageCount, generatePDFPreview } from '@/utils/pdfUtils';
import { validateFiles } from '@/utils/validation';
import { handleError, displayUserFriendlyError } from '@/utils/errorHandling';

export default function MergePage() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({ current: 0, total: 100, message: '' });
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [metadata, setMetadata] = useState({
    title: '',
    author: '',
    subject: ''
  });

  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    try {
      setError(null);
      setValidationWarnings([]);
      
      // Validate files
      const validation = validateFiles(selectedFiles, {
        maxFiles: 20,
        maxSizeBytes: 100 * 1024 * 1024, // 100MB per file
        requirePDF: true,
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf']
      });
      
      if (!validation.isValid) {
        setError(validation.errors.join('\n'));
        return;
      }
      
      if (validation.warnings.length > 0) {
        setValidationWarnings(validation.warnings);
      }
      
      const pdfFiles: PDFFile[] = [];
      
      for (const file of selectedFiles) {
        try {
          const id = Math.random().toString(36).substr(2, 9);
          const pageCount = await getPageCount(file);
          const preview = await generatePDFPreview(file);
          
          pdfFiles.push({
            file,
            id,
            name: file.name,
            size: file.size,
            pageCount,
            preview
          });
        } catch (fileError) {
          const processedError = handleError(fileError, { 
            operation: 'file_processing',
            file: file.name 
          });
          console.warn(`Failed to process file ${file.name}:`, processedError);
          
          // Add file with error state
          pdfFiles.push({
            file,
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            pageCount: 0,
            preview: '',
            error: displayUserFriendlyError(processedError)
          });
        }
      }
      
      setFiles(prev => [...prev, ...pdfFiles]);
      setIsComplete(false);
    } catch (error) {
      const processedError = handleError(error, { operation: 'file_selection' });
      setError(displayUserFriendlyError(processedError));
    }
  }, []);

  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setIsComplete(false);
  }, []);

  const handleReorderFiles = useCallback((fromIndex: number, toIndex: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const [removed] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, removed);
      return newFiles;
    });
    setIsComplete(false);
  }, []);

  const handleMerge = async () => {
    if (files.length < 2) return;
    
    setIsProcessing(true);
    setIsComplete(false);
    
    try {
      const fileObjects = files.map(f => f.file);
      const mergedPdf = await mergePDFs(fileObjects, {
        onProgress: (current, message) => setProgress({ current, total: 100, message }),
        metadata: {
          title: metadata.title || `Merged PDF - ${new Date().toLocaleDateString()}`,
          author: metadata.author,
          subject: metadata.subject,
          creator: 'PDF Toolbox'
        }
      });
      
      const fileName = metadata.title 
        ? `${metadata.title}.pdf`
        : `merged-${Date.now()}.pdf`;
      
      downloadFile(mergedPdf, fileName);
      setIsComplete(true);
    } catch (error) {
      console.error('Merge failed:', error);
      setProgress({ current: 0, total: 100, message: 'Error occurred during merge' });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = files.reduce((sum, file) => sum + (file.pageCount || 0), 0);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const formattedSize = (totalSize / 1024 / 1024).toFixed(1);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Merge PDFs</h1>
        <p className="text-gray-600">
          Combine multiple PDF files into a single document. Drag and drop to reorder.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <pre className="whitespace-pre-wrap">{error}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Warnings</h3>
              <div className="mt-2 text-sm text-amber-700">
                <ul className="space-y-1">
                  {validationWarnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {files.length === 0 ? (
        <FileDropZone
          onFilesSelected={handleFilesSelected}
          acceptedTypes={['.pdf', 'application/pdf']}
          maxFiles={10}
          maxSizePerFile={100 * 1024 * 1024}
        >
          <div className="text-center space-y-4">
            <div className="text-4xl">📄</div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Select PDF files to merge
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Choose up to 10 PDF files (100MB each)
              </p>
            </div>
          </div>
        </FileDropZone>
      ) : (
        <div className="space-y-6">
          <FilePreview
            files={files}
            onRemove={handleRemoveFile}
            onReorder={handleReorderFiles}
            showReorder
          />

          {files.length > 0 && (
            <div className="card">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary-600">{files.length}</p>
                  <p className="text-sm text-gray-600">Files</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary-600">{totalPages}</p>
                  <p className="text-sm text-gray-600">Total Pages</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary-600">{formattedSize}MB</p>
                  <p className="text-sm text-gray-600">Total Size</p>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Metadata (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={metadata.title}
                  onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter document title"
                />
              </div>
              <div>
                <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  id="author"
                  value={metadata.author}
                  onChange={(e) => setMetadata(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter author name"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  value={metadata.subject}
                  onChange={(e) => setMetadata(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter document subject"
                />
              </div>
            </div>
          </div>

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

          {isComplete && (
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900">PDF merged successfully!</p>
                  <p className="text-sm text-green-700">Your merged PDF has been downloaded.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => document.getElementById('file-input')?.click()}
              className="btn-secondary flex-1"
              disabled={isProcessing}
            >
              Add More Files
            </button>
            <button
              onClick={handleMerge}
              disabled={files.length < 2 || isProcessing}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Merge & Download</span>
            </button>
          </div>

          <div className="hidden">
            <FileDropZone
              onFilesSelected={handleFilesSelected}
              acceptedTypes={['.pdf', 'application/pdf']}
              maxFiles={10}
              maxSizePerFile={100 * 1024 * 1024}
            />
          </div>
        </div>
      )}
    </div>
  );
}