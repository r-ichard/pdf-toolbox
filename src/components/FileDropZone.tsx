import { useCallback, useState } from 'react';
import { Upload, X, AlertCircle } from './Icons';

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes: string[];
  maxFiles?: number;
  maxSizePerFile?: number; // in bytes
  className?: string;
  children?: React.ReactNode;
}

export default function FileDropZone({
  onFilesSelected,
  acceptedTypes,
  maxFiles = 10,
  maxSizePerFile = 100 * 1024 * 1024, // 100MB
  className = '',
  children
}: FileDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback((files: File[]): { valid: File[], errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return { valid, errors };
    }

    files.forEach(file => {
      if (file.size > maxSizePerFile) {
        errors.push(`${file.name} is too large (max ${Math.round(maxSizePerFile / 1024 / 1024)}MB)`);
        return;
      }

      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type === type;
      });

      if (!isValidType) {
        errors.push(`${file.name} is not a supported file type`);
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  }, [acceptedTypes, maxFiles, maxSizePerFile]);

  const handleFiles = useCallback((files: File[]) => {
    setError(null);
    const { valid, errors } = validateFiles(files);
    
    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }

    if (valid.length > 0) {
      onFilesSelected(valid);
    }
  }, [validateFiles, onFilesSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    e.target.value = '';
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const acceptedTypesDisplay = acceptedTypes
    .map(type => type.startsWith('.') ? type.toUpperCase() : type.split('/')[1]?.toUpperCase())
    .join(', ');

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        className={`drag-zone ${isDragActive ? 'drag-active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input')?.click()}
        role="button"
        tabIndex={0}
        aria-label={`Drop files here or click to select. Accepted types: ${acceptedTypesDisplay}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            document.getElementById('file-input')?.click();
          }
        }}
      >
        <input
          id="file-input"
          type="file"
          multiple={maxFiles > 1}
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          aria-describedby="file-restrictions"
        />
        
        <div className="flex flex-col items-center space-y-4">
          <Upload className={`w-12 h-12 ${isDragActive ? 'text-primary-600' : 'text-gray-400'}`} />
          
          {children || (
            <>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">
                  Drop your files here
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  or{' '}
                  <button
                    type="button"
                    onClick={() => document.getElementById('file-input')?.click()}
                    className="text-primary-600 hover:text-primary-700 font-medium focus:outline-none focus:underline"
                  >
                    browse to choose files
                  </button>
                </p>
              </div>
              
              <div id="file-restrictions" className="text-xs text-gray-500 text-center">
                <p>Supported formats: {acceptedTypesDisplay}</p>
                <p>Max {maxFiles} file{maxFiles > 1 ? 's' : ''}, {Math.round(maxSizePerFile / 1024 / 1024)}MB each</p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-700"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}