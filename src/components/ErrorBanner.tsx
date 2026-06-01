import { AlertCircle, X } from './Icons';

interface ErrorBannerProps {
  message: string | null;
  onDismiss?: () => void;
}

/** Consistent, accessible error surface so tool failures are never silent. */
export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start space-x-2 bg-red-50 border border-red-200 rounded-md p-4">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-800 flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-600 hover:text-red-700" aria-label="Dismiss error">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
