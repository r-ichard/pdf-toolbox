import { useState } from 'react';
import FileDropZone from '../components/FileDropZone';
import ProgressBar from '../components/ProgressBar';
import { generatePDFPreview, addPasswordToPDF } from '../utils/pdfUtils';

export default function PasswordProtectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Password settings
  const [userPassword, setUserPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [permissions, setPermissions] = useState({
    printing: true,
    modifying: true,
    copying: true,
    annotating: true,
  });

  const handleFileSelect = async (files: File[]) => {
    const selectedFile = files[0];
    if (!selectedFile) return;

    try {
      setFile(selectedFile);
      setError(null);
      
      const previewUrl = await generatePDFPreview(selectedFile);
      setPreview(previewUrl);
    } catch (error) {
      console.error('Error generating preview:', error);
      setError('Failed to load PDF preview');
    }
  };

  const handleAddPassword = async () => {
    if (!file || (!userPassword && !ownerPassword)) return;

    try {
      setProcessing(true);
      setError(null);
      setProgress(0);

      const result = await addPasswordToPDF(file, {
        userPassword: userPassword || undefined,
        ownerPassword: ownerPassword || undefined,
        permissions,
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
      link.download = `protected_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);
      setProgressMessage('Complete!');
    } catch (error) {
      console.error('Error adding password protection:', error);
      setError(error instanceof Error ? error.message : 'Failed to add password protection');
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
    setUserPassword('');
    setOwnerPassword('');
    setPermissions({
      printing: true,
      modifying: true,
      copying: true,
      annotating: true,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Password Protect PDF</h1>
        <p className="text-gray-600">
          Add password protection and set permissions to secure your PDF documents.
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
                {preview && (
                  <img 
                    src={preview} 
                    alt="PDF Preview" 
                    className="w-16 h-20 object-cover rounded border"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
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

          {/* Password Settings */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Password Settings</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="userPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  User Password (for opening the PDF)
                </label>
                <input
                  type="password"
                  id="userPassword"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Enter password to open PDF"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Users will need this password to open the PDF
                </p>
              </div>

              <div>
                <label htmlFor="ownerPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Password (for modifying permissions)
                </label>
                <input
                  type="password"
                  id="ownerPassword"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="Enter owner password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This password allows changing document permissions
                </p>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Document Permissions</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={permissions.printing}
                  onChange={(e) => setPermissions(prev => ({ ...prev, printing: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Allow printing</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={permissions.modifying}
                  onChange={(e) => setPermissions(prev => ({ ...prev, modifying: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Allow modifying content</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={permissions.copying}
                  onChange={(e) => setPermissions(prev => ({ ...prev, copying: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Allow copying text and images</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={permissions.annotating}
                  onChange={(e) => setPermissions(prev => ({ ...prev, annotating: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Allow adding annotations</span>
              </label>
            </div>
          </div>

          {/* Process Button */}
          <div className="card">
            <button
              onClick={handleAddPassword}
              disabled={processing || (!userPassword && !ownerPassword)}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? 'Adding Password Protection...' : 'Protect PDF'}
            </button>
            
            {(!userPassword && !ownerPassword) && (
              <p className="text-sm text-amber-600 mt-2 text-center">
                Please enter at least one password to protect the PDF
              </p>
            )}
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
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}