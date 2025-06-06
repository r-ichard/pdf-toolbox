// Comprehensive error handling utilities

export interface ErrorContext {
  operation: string;
  file?: string;
  timestamp: string;
  userAgent: string;
  url: string;
}

export interface ProcessingError extends Error {
  code: string;
  context?: ErrorContext;
  recoverable: boolean;
  userMessage: string;
}

export enum ErrorCodes {
  FILE_VALIDATION_ERROR = 'FILE_VALIDATION_ERROR',
  PDF_PARSING_ERROR = 'PDF_PARSING_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  BROWSER_COMPATIBILITY = 'BROWSER_COMPATIBILITY',
  CORRUPTED_FILE = 'CORRUPTED_FILE',
  UNSUPPORTED_FEATURE = 'UNSUPPORTED_FEATURE',
  PROCESSING_TIMEOUT = 'PROCESSING_TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export function createProcessingError(
  message: string,
  code: ErrorCodes,
  recoverable: boolean = true,
  userMessage?: string,
  context?: Partial<ErrorContext>
): ProcessingError {
  const error = new Error(message) as ProcessingError;
  error.name = 'ProcessingError';
  error.code = code;
  error.recoverable = recoverable;
  error.userMessage = userMessage || getDefaultUserMessage(code);
  error.context = {
    operation: context?.operation || 'unknown',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...context
  };
  
  return error;
}

export function getDefaultUserMessage(code: ErrorCodes): string {
  switch (code) {
    case ErrorCodes.FILE_VALIDATION_ERROR:
      return 'The file you selected is not valid or supported. Please check the file format and try again.';
    
    case ErrorCodes.PDF_PARSING_ERROR:
      return 'Unable to read the PDF file. The file may be corrupted or password-protected.';
    
    case ErrorCodes.MEMORY_ERROR:
      return 'The file is too large to process. Try using a smaller file or close other browser tabs.';
    
    case ErrorCodes.NETWORK_ERROR:
      return 'Network connection error. Please check your internet connection and try again.';
    
    case ErrorCodes.BROWSER_COMPATIBILITY:
      return 'Your browser may not support this feature. Try using a modern browser like Chrome, Firefox, or Safari.';
    
    case ErrorCodes.CORRUPTED_FILE:
      return 'The PDF file appears to be corrupted or damaged. Try using a different file.';
    
    case ErrorCodes.UNSUPPORTED_FEATURE:
      return 'This feature is not supported for the selected file type or format.';
    
    case ErrorCodes.PROCESSING_TIMEOUT:
      return 'The operation took too long to complete. Try with a smaller file or try again later.';
    
    default:
      return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }
}

export function classifyError(error: any): ProcessingError {
  if (error.name === 'ProcessingError') {
    return error as ProcessingError;
  }

  let code = ErrorCodes.UNKNOWN_ERROR;
  let recoverable = true;
  let userMessage = '';

  // Classify based on error message or type
  const message = error.message?.toLowerCase() || '';

  if (message.includes('pdf') && (message.includes('invalid') || message.includes('corrupt'))) {
    code = ErrorCodes.PDF_PARSING_ERROR;
  } else if (message.includes('memory') || message.includes('out of memory')) {
    code = ErrorCodes.MEMORY_ERROR;
  } else if (message.includes('network') || message.includes('fetch')) {
    code = ErrorCodes.NETWORK_ERROR;
  } else if (message.includes('timeout')) {
    code = ErrorCodes.PROCESSING_TIMEOUT;
  } else if (message.includes('not supported') || message.includes('unsupported')) {
    code = ErrorCodes.UNSUPPORTED_FEATURE;
  } else if (error.name === 'TypeError' && message.includes('constructor')) {
    code = ErrorCodes.BROWSER_COMPATIBILITY;
  }

  return createProcessingError(
    error.message || 'Unknown error',
    code,
    recoverable,
    userMessage
  );
}

export function handleError(error: any, context?: Partial<ErrorContext>): ProcessingError {
  const processedError = classifyError(error);
  
  // Update context if provided
  if (context) {
    processedError.context = { 
      operation: context.operation || processedError.context?.operation || 'unknown',
      file: context.file || processedError.context?.file,
      timestamp: processedError.context?.timestamp || new Date().toISOString(),
      userAgent: processedError.context?.userAgent || navigator.userAgent,
      url: processedError.context?.url || window.location.href
    };
  }

  // Log error for debugging
  console.error('Processing error:', {
    message: processedError.message,
    code: processedError.code,
    recoverable: processedError.recoverable,
    context: processedError.context,
    stack: processedError.stack
  });

  return processedError;
}

export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleError(error, { operation });
    }
  };
}

export function createRetryableOperation<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  maxRetries: number = 2,
  delay: number = 1000
) {
  return async (...args: T): Promise<R> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        const processedError = classifyError(error);
        
        // Don't retry if error is not recoverable
        if (!processedError.recoverable || attempt > maxRetries) {
          throw processedError;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw handleError(lastError);
  };
}

export function logError(error: ProcessingError): void {
  // In production, you might want to send this to an error tracking service
  const errorLog = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    code: error.code,
    userMessage: error.userMessage,
    recoverable: error.recoverable,
    context: error.context,
    stack: error.stack,
    // Don't log sensitive information
    sanitized: true
  };

  console.error('Error logged:', errorLog);

  // Example: Send to error tracking service in production
  if (process.env.NODE_ENV === 'production') {
    // errorTrackingService.captureException(error, errorLog);
  }
}

export function displayUserFriendlyError(error: any): string {
  const processedError = classifyError(error);
  return processedError.userMessage;
}

export function isRecoverableError(error: any): boolean {
  const processedError = classifyError(error);
  return processedError.recoverable;
}

export function getErrorSuggestions(error: ProcessingError): string[] {
  const suggestions: string[] = [];

  switch (error.code) {
    case ErrorCodes.FILE_VALIDATION_ERROR:
      suggestions.push('Check that the file is a valid PDF');
      suggestions.push('Try using a different file');
      suggestions.push('Ensure the file is not corrupted');
      break;

    case ErrorCodes.PDF_PARSING_ERROR:
      suggestions.push('Try using a different PDF viewer to verify the file works');
      suggestions.push('If the PDF is password-protected, remove the password first');
      suggestions.push('Re-save the PDF from the original application');
      break;

    case ErrorCodes.MEMORY_ERROR:
      suggestions.push('Close other browser tabs to free up memory');
      suggestions.push('Try using a smaller file or split large PDFs first');
      suggestions.push('Restart your browser');
      break;

    case ErrorCodes.BROWSER_COMPATIBILITY:
      suggestions.push('Update your browser to the latest version');
      suggestions.push('Try using Chrome, Firefox, or Safari');
      suggestions.push('Enable JavaScript in your browser');
      break;

    case ErrorCodes.PROCESSING_TIMEOUT:
      suggestions.push('Try with a smaller file');
      suggestions.push('Check your internet connection');
      suggestions.push('Try again later when server load is lower');
      break;

    default:
      suggestions.push('Refresh the page and try again');
      suggestions.push('Try using a different browser');
      suggestions.push('Contact support if the problem persists');
  }

  return suggestions;
}