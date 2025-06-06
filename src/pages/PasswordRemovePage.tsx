import { useState } from 'react';
import FileDropZone from '../components/FileDropZone';
import ProgressBar from '../components/ProgressBar';
import { generatePDFPreview, removePasswordFromPDF } from '../utils/pdfUtils';

export default function PasswordRemovePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  const handleFileSelect = async (files: File[]) => {
    const selectedFile = files[0];
    if (!selectedFile) return;

    try {
      setFile(selectedFile);
      setError(null);
      
      // Try to generate preview - may fail if password protected
      try {
        const previewUrl = await generatePDFPreview(selectedFile);
        setPreview(previewUrl);
      } catch (previewError) {
        // File might be password protected, that's okay
        setPreview('');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Failed to load PDF file');
    }
  };

  const handleRemovePassword = async () => {
    if (!file) return;

    try {
      setProcessing(true);
      setError(null);
      setProgress(0);

      const result = await removePasswordFromPDF(file, {
        password: password || undefined,
        onProgress: (progress, message) => {
          setProgress(progress);
          setProgressMessage(message);
        },
      });

      // Create download link
      const blob = new Blob([result], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `unlocked_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);
      setProgressMessage('Complete!');
    } catch (error) {
      console.error('Error removing password protection:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove password protection');
    } finally {
      setProcessing(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setPreview('');
    setProgress(0);
    setProgressMessage('');
    setError(null);
    setPassword('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Remove Password Protection</h1>
        <p className="text-gray-600">
          Remove password protection from encrypted PDF documents.
        </p>
      </div>

      {!file ? (
        <FileDropZone
          onFilesSelected={handleFileSelect}
          acceptedTypes={['.pdf', 'application/pdf']}
          maxFiles={1}
          maxSizePerFile={50 * 1024 * 1024} // 50MB
        />
      ) : (
        <div className="space-y-6">
          {/* File Info */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Selected PDF</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {preview ? (
                  <img 
                    src={preview} 
                    alt="PDF Preview" 
                    className="w-16 h-20 object-cover rounded border"
                  />
                ) : (
                  <div className="w-16 h-20 bg-gray-100 rounded border flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  {!preview && (
                    <p className="text-sm text-amber-600">
                      ⚠️ Password protected
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={resetState}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Change file
              </button>
            </div>
          </div>

          {/* Password Input */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Password</h3>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Enter the current password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Current PDF password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the password required to open this PDF (if any)
              </p>
            </div>
          </div>

          {/* Process Button */}
          <div className="card">
            <button
              onClick={handleRemovePassword}
              disabled={processing}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? 'Removing Password Protection...' : 'Remove Password Protection'}
            </button>
          </div>

          {/* Progress */}
          {processing && (
            <ProgressBar 
              progress={progress} 
              message={progressMessage}
            />
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  {error.includes('password') && (
                    <p className="text-sm text-red-600 mt-2">
                      Please check that you've entered the correct password.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}