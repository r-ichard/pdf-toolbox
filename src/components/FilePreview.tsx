import { PDFFile } from '@/types';
import { X, FileText } from './Icons';

interface FilePreviewProps {
  files: PDFFile[];
  onRemove?: (fileId: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  className?: string;
  showReorder?: boolean;
}

export default function FilePreview({ 
  files, 
  onRemove, 
  onReorder,
  className = '',
  showReorder = false
}: FilePreviewProps) {
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex !== dropIndex && onReorder) {
      onReorder(dragIndex, dropIndex);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900">
        Selected Files ({files.length})
      </h3>
      
      <div className="space-y-2">
        {files.map((file, index) => (
          <div
            key={file.id}
            className={`
              bg-white border border-gray-200 rounded-lg p-4 flex items-center space-x-4
              ${showReorder ? 'cursor-move hover:bg-gray-50' : ''}
            `}
            draggable={showReorder}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <div className="flex-shrink-0">
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={`Preview of ${file.name}`}
                  className="w-12 h-12 object-cover rounded border"
                  loading="lazy"
                />
              ) : (
                <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </p>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>{formatFileSize(file.size)}</span>
                {file.pageCount && (
                  <span>{file.pageCount} page{file.pageCount !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
            
            {showReorder && (
              <div className="flex-shrink-0 text-gray-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </div>
            )}
            
            {onRemove && (
              <button
                onClick={() => onRemove(file.id)}
                className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
      </div>
      
      {showReorder && files.length > 1 && (
        <p className="text-xs text-gray-500 text-center">
          Drag and drop to reorder files
        </p>
      )}
    </div>
  );
}