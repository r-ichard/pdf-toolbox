export interface PDFFile {
  file: File;
  id: string;
  name: string;
  size: number;
  preview?: string;
  pageCount?: number;
  error?: string;
}

export interface ProcessingProgress {
  current: number;
  total: number;
  message: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  category: 'basic' | 'advanced';
}

export interface CompressionLevel {
  id: 'low' | 'medium' | 'high';
  name: string;
  description: string;
  quality: number;
}

export interface ImageFormat {
  id: 'jpg' | 'png';
  name: string;
  extension: string;
}

export interface Resolution {
  id: string;
  name: string;
  dpi: number;
}

export interface PageSize {
  id: string;
  name: string;
  width: number;
  height: number;
}

export interface WatermarkConfig {
  type: 'text' | 'image';
  content: string;
  opacity: number;
  position: {
    x: number;
    y: number;
  };
  fontSize?: number;
  fontColor?: string;
  imageFile?: File;
}

export interface PasswordConfig {
  userPassword?: string;
  ownerPassword?: string;
  permissions: {
    print: boolean;
    copy: boolean;
    edit: boolean;
    fillForms: boolean;
  };
}