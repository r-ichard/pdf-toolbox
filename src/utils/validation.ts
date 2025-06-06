// File validation utilities

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  maxFiles?: number;
  requirePDF?: boolean;
}

export function validateFile(file: File, options: FileValidationOptions = {}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const {
    maxSizeBytes = 100 * 1024 * 1024, // 100MB default
    allowedTypes = [],
    allowedExtensions = [],
    requirePDF = false
  } = options;

  // Check file existence
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors, warnings };
  }

  // Check file size
  if (file.size === 0) {
    errors.push('File is empty');
  }

  if (file.size > maxSizeBytes) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSizeBytes)})`);
  }

  // Large file warning
  if (file.size > 50 * 1024 * 1024) { // 50MB
    warnings.push('Large files may take longer to process and consume more memory');
  }

  // Check file type
  if (requirePDF) {
    if (!isPDFFile(file)) {
      errors.push('File must be a PDF document');
    }
  }

  if (allowedTypes.length > 0) {
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const extension = getFileExtension(file.name);
    if (!allowedExtensions.some(ext => ext.toLowerCase() === extension.toLowerCase())) {
      errors.push(`File extension "${extension}" is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }
  }

  // Check for suspicious file names
  if (containsSuspiciousPatterns(file.name)) {
    warnings.push('File name contains unusual characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateFiles(files: File[], options: FileValidationOptions = {}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { maxFiles = 10 } = options;

  // Check file count
  if (files.length === 0) {
    errors.push('No files provided');
    return { isValid: false, errors, warnings };
  }

  if (files.length > maxFiles) {
    errors.push(`Too many files. Maximum ${maxFiles} files allowed, but ${files.length} provided`);
  }

  // Validate each file
  files.forEach((file, index) => {
    const result = validateFile(file, options);
    
    result.errors.forEach(error => {
      errors.push(`File ${index + 1} (${file.name}): ${error}`);
    });
    
    result.warnings.forEach(warning => {
      warnings.push(`File ${index + 1} (${file.name}): ${warning}`);
    });
  });

  // Check for duplicate files
  const duplicates = findDuplicateFiles(files);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate files detected: ${duplicates.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function isPDFFile(file: File): boolean {
  // Check MIME type
  if (file.type === 'application/pdf') {
    return true;
  }

  // Check file extension as fallback
  const extension = getFileExtension(file.name);
  return extension.toLowerCase() === '.pdf';
}

export function isImageFile(file: File): boolean {
  const imageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'image/tiff'
  ];

  return imageTypes.includes(file.type) || 
         ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif']
           .includes(getFileExtension(file.name).toLowerCase());
}

export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex === -1 ? '' : filename.substring(lastDotIndex);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function containsSuspiciousPatterns(filename: string): boolean {
  // Check for potentially problematic characters or patterns
  const suspiciousPatterns = [
    /[<>:"|?*]/,  // Windows reserved characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,  // Windows reserved names
    /^\./,  // Hidden files (starting with dot)
    /\s{2,}/,  // Multiple consecutive spaces
    /[\x00-\x1f\x7f-\x9f]/,  // Control characters
  ];

  return suspiciousPatterns.some(pattern => pattern.test(filename));
}

export function findDuplicateFiles(files: File[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  files.forEach(file => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (seen.has(key)) {
      duplicates.push(file.name);
    } else {
      seen.add(key);
    }
  });

  return duplicates;
}

export async function validatePDFStructure(file: File): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Check PDF header
    const header = uint8Array.slice(0, 8);
    const headerString = new TextDecoder().decode(header);
    
    if (!headerString.startsWith('%PDF-')) {
      errors.push('Invalid PDF header - file may be corrupted or not a valid PDF');
    } else {
      // Extract PDF version
      const version = headerString.substring(5, 8);
      if (!['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '2.0'].includes(version)) {
        warnings.push(`Unusual PDF version: ${version}`);
      }
    }

    // Check for EOF marker
    const tail = uint8Array.slice(-1024);
    const tailString = new TextDecoder().decode(tail);
    
    if (!tailString.includes('%%EOF')) {
      warnings.push('PDF may be truncated - missing EOF marker');
    }

    // Check file size consistency
    if (arrayBuffer.byteLength < 100) {
      errors.push('File is too small to be a valid PDF');
    }

    // Basic structure validation
    const content = new TextDecoder().decode(uint8Array);
    if (!content.includes('xref') && !content.includes('/Root')) {
      warnings.push('PDF structure appears incomplete');
    }

  } catch (error) {
    errors.push(`Failed to validate PDF structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function createFileValidationError(message: string, details?: any): Error {
  const error = new Error(message);
  error.name = 'FileValidationError';
  if (details) {
    (error as any).details = details;
  }
  return error;
}

export function handleValidationResult(result: ValidationResult): void {
  if (!result.isValid) {
    throw createFileValidationError(
      `Validation failed: ${result.errors.join(', ')}`,
      { errors: result.errors, warnings: result.warnings }
    );
  }

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('File validation warnings:', result.warnings);
  }
}