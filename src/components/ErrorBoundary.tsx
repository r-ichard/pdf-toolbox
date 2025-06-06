import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, Home } from './Icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  eventId?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      eventId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Log error details for debugging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      eventId: this.state.eventId
    };
    
    console.error('Error details:', errorDetails);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, errorDetails);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <div className="card text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h1>
              
              <p className="text-gray-600 mb-4">
                We encountered an unexpected error. This could be due to:
              </p>
              
              <ul className="text-sm text-gray-600 text-left mb-6 space-y-1">
                <li>• A corrupted or invalid PDF file</li>
                <li>• Browser compatibility issues</li>
                <li>• Insufficient memory for large files</li>
                <li>• Network connectivity problems</li>
              </ul>
              
              {this.state.eventId && (
                <p className="text-xs text-gray-500 mb-4">
                  Error ID: {this.state.eventId}
                </p>
              )}
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left mb-6">
                  <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                    Error details (development only)
                  </summary>
                  <pre className="text-xs bg-gray-100 p-3 rounded border overflow-x-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="btn-primary flex-1"
                >
                  Refresh Page
                </button>
                
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: undefined });
                    window.location.href = '/';
                  }}
                  className="btn-secondary flex-1 flex items-center justify-center space-x-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Go Home</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}