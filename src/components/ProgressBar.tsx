interface ProgressBarProps {
  progress: number; // 0-100
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'error';
}

export default function ProgressBar({ 
  progress, 
  message,
  className = '',
  size = 'md',
  variant = 'default'
}: ProgressBarProps) {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const variantClasses = {
    default: 'bg-primary-600',
    success: 'bg-green-600',
    error: 'bg-red-600'
  };

  const backgroundClasses = {
    default: 'bg-primary-100',
    success: 'bg-green-100',
    error: 'bg-red-100'
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {message && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-700">{message}</p>
          <span className="text-sm font-medium text-gray-900">
            {Math.round(progress)}%
          </span>
        </div>
      )}
      
      <div 
        className={`w-full ${backgroundClasses[variant]} rounded-full overflow-hidden ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={message || `Progress: ${Math.round(progress)}%`}
      >
        <div
          className={`${sizeClasses[size]} ${variantClasses[variant]} transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}