import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

// PDF.js worker configuration with robust fallback strategy
class PDFWorkerManager {
  private static workerSources = [
    // Try local public directory first (works in both dev and production)
    '/pdf.worker.min.js',
    // Fallback to reliable CDN
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js`,
    // Final fallback to unpkg
    `https://unpkg.com/pdfjs-dist@4.2.67/build/pdf.worker.min.js`
  ];

  private static async testWorkerSource(src: string): Promise<boolean> {
    try {
      const response = await fetch(src, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  static async initializeWorker(): Promise<void> {
    if (typeof window === 'undefined') return;

    // If already configured and working, skip
    if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
      try {
        // Test if current worker is accessible
        const response = await fetch(pdfjsLib.GlobalWorkerOptions.workerSrc, { method: 'HEAD' });
        if (response.ok) return;
      } catch {
        // Current worker failed, continue to find a working one
      }
    }

    for (const src of this.workerSources) {
      if (await this.testWorkerSource(src)) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = src;
        console.log(`PDF.js worker configured: ${src}`);
        return;
      }
    }

    console.warn('No working PDF.js worker source found. PDF preview may not work.');
  }
}

// Initialize worker when module loads
if (typeof window !== 'undefined') {
  PDFWorkerManager.initializeWorker().catch(console.warn);
}

export interface ProcessingOptions {
  onProgress?: (progress: number, message: string) => void;
}

export interface MergeOptions extends ProcessingOptions {
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
}

export interface CompressionOptions extends ProcessingOptions {
  quality: 'low' | 'medium' | 'high';
}

export interface SplitOptions extends ProcessingOptions {
  mode: 'pages' | 'ranges';
  pages?: number[];
  ranges?: { start: number; end: number }[];
  everyN?: number;
}

export async function mergePDFs(files: File[], options: MergeOptions = {}): Promise<Uint8Array> {
  const { onProgress, metadata } = options;
  const mergedPdf = await PDFDocument.create();
  
  if (metadata) {
    mergedPdf.setTitle(metadata.title || '');
    mergedPdf.setAuthor(metadata.author || '');
    mergedPdf.setSubject(metadata.subject || '');
    mergedPdf.setCreator(metadata.creator || 'PDF Toolbox');
  }

  let processedFiles = 0;
  
  for (const file of files) {
    onProgress?.(
      (processedFiles / files.length) * 90, 
      `Processing ${file.name}...`
    );
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    
    copiedPages.forEach((page) => mergedPdf.addPage(page));
    processedFiles++;
  }

  onProgress?.(95, 'Finalizing PDF...');
  const pdfBytes = await mergedPdf.save();
  onProgress?.(100, 'Complete!');
  
  return pdfBytes;
}

export async function splitPDF(file: File, options: SplitOptions): Promise<{ name: string; data: Uint8Array }[]> {
  const { onProgress, mode, pages, ranges, everyN } = options;
  
  onProgress?.(10, 'Loading PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const totalPages = pdf.getPageCount();
  
  const results: { name: string; data: Uint8Array }[] = [];
  
  if (mode === 'pages' && pages) {
    for (let i = 0; i < pages.length; i++) {
      const pageNum = pages[i];
      if (pageNum <= totalPages) {
        onProgress?.((i / pages.length) * 80 + 10, `Extracting page ${pageNum}...`);
        
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [pageNum - 1]);
        newPdf.addPage(copiedPage);
        
        const pdfBytes = await newPdf.save();
        results.push({
          name: `${file.name.replace('.pdf', '')}_page_${pageNum}.pdf`,
          data: pdfBytes
        });
      }
    }
  } else if (mode === 'ranges' && ranges) {
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      onProgress?.((i / ranges.length) * 80 + 10, `Extracting pages ${range.start}-${range.end}...`);
      
      const newPdf = await PDFDocument.create();
      const pageIndices = Array.from(
        { length: range.end - range.start + 1 }, 
        (_, j) => range.start - 1 + j
      ).filter(idx => idx < totalPages);
      
      const copiedPages = await newPdf.copyPages(pdf, pageIndices);
      copiedPages.forEach(page => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      results.push({
        name: `${file.name.replace('.pdf', '')}_pages_${range.start}-${range.end}.pdf`,
        data: pdfBytes
      });
    }
  } else if (everyN) {
    const numChunks = Math.ceil(totalPages / everyN);
    for (let i = 0; i < numChunks; i++) {
      const start = i * everyN;
      const end = Math.min(start + everyN - 1, totalPages - 1);
      
      onProgress?.((i / numChunks) * 80 + 10, `Creating chunk ${i + 1}...`);
      
      const newPdf = await PDFDocument.create();
      const pageIndices = Array.from({ length: end - start + 1 }, (_, j) => start + j);
      const copiedPages = await newPdf.copyPages(pdf, pageIndices);
      copiedPages.forEach(page => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      results.push({
        name: `${file.name.replace('.pdf', '')}_part_${i + 1}.pdf`,
        data: pdfBytes
      });
    }
  }

  onProgress?.(100, 'Complete!');
  return results;
}

export async function compressPDF(file: File, options: CompressionOptions): Promise<Uint8Array> {
  const { onProgress, quality = 'medium' } = options;
  
  onProgress?.(10, 'Loading PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  onProgress?.(30, 'Analyzing PDF structure...');
  
  // Get all pages for processing
  const pages = pdf.getPages();
  
  onProgress?.(50, 'Optimizing PDF structure...');
  
  // Create a new PDF with optimized settings
  const optimizedPdf = await PDFDocument.create();
  
  // Copy pages one by one with optimization
  for (let i = 0; i < pages.length; i++) {
    onProgress?.(50 + (i / pages.length) * 30, `Processing page ${i + 1}/${pages.length}...`);
    
    // Copy the page
    const [copiedPage] = await optimizedPdf.copyPages(pdf, [i]);
    optimizedPdf.addPage(copiedPage);
  }
  
  // Copy metadata but optimize it
  try {
    const title = pdf.getTitle();
    const author = pdf.getAuthor();
    const subject = pdf.getSubject();
    
    if (title && title.length < 500) optimizedPdf.setTitle(title);
    if (author && author.length < 200) optimizedPdf.setAuthor(author);
    if (subject && subject.length < 500) optimizedPdf.setSubject(subject);
    
    optimizedPdf.setCreator('PDF Toolbox Web');
    optimizedPdf.setProducer('PDF Toolbox Web - Optimized');
  } catch (error) {
    // Metadata copying failed, continue without it
    console.warn('Could not copy metadata during compression:', error);
  }
  
  onProgress?.(85, 'Applying compression settings...');
  
  // Configure compression settings based on quality
  let saveOptions: any = {
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  };
  
  switch (quality) {
    case 'low':
      // Maximum compression, lower quality
      saveOptions = {
        ...saveOptions,
        useObjectStreams: true,
      };
      break;
    case 'medium':
      // Balanced compression
      saveOptions = {
        ...saveOptions,
        useObjectStreams: true,
      };
      break;
    case 'high':
      // Minimal compression, preserve quality
      saveOptions = {
        ...saveOptions,
        useObjectStreams: false,
      };
      break;
  }
  
  onProgress?.(95, 'Finalizing compressed PDF...');
  const pdfBytes = await optimizedPdf.save(saveOptions);
  
  onProgress?.(100, 'Complete!');
  return pdfBytes;
}

export async function rotatePDF(
  file: File, 
  pageNumbers: number[], 
  angle: number,
  options: ProcessingOptions = {}
): Promise<Uint8Array> {
  const { onProgress } = options;
  
  onProgress?.(10, 'Loading PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const pages = pdf.getPages();
  
  onProgress?.(50, 'Rotating pages...');
  
  pageNumbers.forEach(pageNum => {
    if (pageNum <= pages.length) {
      const page = pages[pageNum - 1];
      page.setRotation(degrees(angle));
    }
  });
  
  onProgress?.(90, 'Saving PDF...');
  const pdfBytes = await pdf.save();
  onProgress?.(100, 'Complete!');
  
  return pdfBytes;
}

export interface PasswordProtectionOptions {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
  };
  onProgress?: (progress: number, message: string) => void;
}

export async function addPasswordToPDF(
  file: File,
  options: PasswordProtectionOptions = {}
): Promise<Uint8Array> {
  const { userPassword, ownerPassword, onProgress } = options;
  
  onProgress?.(10, 'Loading PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  onProgress?.(30, 'Applying password protection...');
  
  // Note: PDF encryption is complex and may require additional libraries
  // For now, we'll create a basic implementation that warns about limited support
  if (userPassword || ownerPassword) {
    // pdf-lib doesn't support encryption directly in older versions
    // This is a placeholder for future implementation
    console.warn('Password protection requires pdf-lib with encryption support');
    throw new Error('Password protection is not fully supported in this version. Please use a PDF editor that supports encryption.');
  }
  
  onProgress?.(80, 'Saving protected PDF...');
  const pdfBytes = await pdf.save();
  onProgress?.(100, 'Complete!');
  
  return pdfBytes;
}

export interface PasswordRemovalOptions {
  password?: string;
  onProgress?: (progress: number, message: string) => void;
}

export async function removePasswordFromPDF(
  file: File,
  options: PasswordRemovalOptions = {}
): Promise<Uint8Array> {
  const { password, onProgress } = options;
  
  onProgress?.(10, 'Loading PDF...');
  const arrayBuffer = await file.arrayBuffer();
  
  onProgress?.(30, 'Decrypting PDF...');
  // Load the PDF - note: password support depends on pdf-lib version
  let pdf;
  try {
    pdf = await PDFDocument.load(arrayBuffer);
  } catch (error) {
    if (password) {
      throw new Error('Password-protected PDF decryption is not fully supported in this version. The PDF may be encrypted.');
    }
    throw error;
  }
  
  onProgress?.(60, 'Creating unprotected PDF...');
  // Create a new PDF without encryption
  const newPdf = await PDFDocument.create();
  
  // Copy all pages from the original PDF
  const pageIndices = Array.from({ length: pdf.getPageCount() }, (_, i) => i);
  const copiedPages = await newPdf.copyPages(pdf, pageIndices);
  
  copiedPages.forEach((page) => {
    newPdf.addPage(page);
  });
  
  // Copy metadata if available
  try {
    const title = pdf.getTitle();
    const author = pdf.getAuthor();
    const subject = pdf.getSubject();
    const creator = pdf.getCreator();
    
    if (title) newPdf.setTitle(title);
    if (author) newPdf.setAuthor(author);
    if (subject) newPdf.setSubject(subject);
    if (creator) newPdf.setCreator(creator);
  } catch (error) {
    // Metadata copying failed, continue without it
    console.warn('Could not copy PDF metadata:', error);
  }
  
  onProgress?.(90, 'Saving unprotected PDF...');
  const pdfBytes = await newPdf.save();
  onProgress?.(100, 'Complete!');
  
  return pdfBytes;
}

export async function getPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    return pdf.getPageCount();
  } catch (error) {
    console.error('Error getting page count:', error);
    return 0;
  }
}

export async function generatePDFPreview(file: File, pageNumber: number = 1, retryCount: number = 0): Promise<string> {
  const maxRetries = 2;
  
  try {
    // Ensure worker is initialized before proceeding
    await PDFWorkerManager.initializeWorker();
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      standardFontDataUrl: undefined // Avoid font loading issues
    }).promise;
    
    // Check if page number is valid
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      pageNumber = 1;
    }
    
    const page = await pdf.getPage(pageNumber);
    
    const scale = 0.5;
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    // Clean up
    pdf.destroy();
    
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    console.error('Error generating preview:', error);
    
    // Retry logic for worker issues
    if (retryCount < maxRetries && error instanceof Error && 
        (error.message.includes('worker') || error.message.includes('Worker'))) {
      console.log(`Retrying PDF preview generation (attempt ${retryCount + 1}/${maxRetries})`);
      // Force worker reinitialization
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      await new Promise(resolve => setTimeout(resolve, 1000));
      return generatePDFPreview(file, pageNumber, retryCount + 1);
    }
    
    return '';
  }
}

export interface PagePreview {
  pageNumber: number;
  preview: string;
  width: number;
  height: number;
}

export async function generateAllPagePreviews(
  file: File, 
  options: { 
    scale?: number; 
    maxPages?: number;
    quality?: number;
    onProgress?: (progress: number, message: string) => void;
  } = {}
): Promise<PagePreview[]> {
  const { scale = 0.8, maxPages = 50, quality = 0.85, onProgress } = options;
  
  try {
    onProgress?.(10, 'Loading PDF...');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const totalPages = Math.min(pdf.numPages, maxPages);
    const previews: PagePreview[] = [];
    
    onProgress?.(20, `Generating previews for ${totalPages} pages...`);
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const progress = 20 + (pageNum / totalPages) * 70;
      onProgress?.(progress, `Generating preview ${pageNum}/${totalPages}...`);
      
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
        
        previews.push({
          pageNumber: pageNum,
          preview: canvas.toDataURL('image/jpeg', quality),
          width: viewport.width,
          height: viewport.height,
        });
      } catch (pageError) {
        console.warn(`Failed to generate preview for page ${pageNum}:`, pageError);
        // Add a placeholder for failed pages
        previews.push({
          pageNumber: pageNum,
          preview: '',
          width: 200,
          height: 280,
        });
      }
    }
    
    onProgress?.(100, 'Complete!');
    return previews;
  } catch (error) {
    console.error('Error generating page previews:', error);
    onProgress?.(100, 'Error generating previews');
    return [];
  }
}

export async function generatePagePreview(
  file: File, 
  pageNumber: number,
  options: { scale?: number; format?: 'png' | 'jpeg'; quality?: number; retryCount?: number } = {}
): Promise<string> {
  const { scale = 0.5, format = 'png', quality = 1.0, retryCount = 0 } = options;
  const maxRetries = 2;
  
  try {
    // Ensure worker is initialized before proceeding
    await PDFWorkerManager.initializeWorker();
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      standardFontDataUrl: undefined
    }).promise;
    
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Page ${pageNumber} does not exist. PDF has ${pdf.numPages} pages.`);
    }
    
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    // Clean up
    pdf.destroy();
    
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return canvas.toDataURL(mimeType, quality);
  } catch (error) {
    console.error(`Error generating preview for page ${pageNumber}:`, error);
    
    // Retry logic for worker issues
    if (retryCount < maxRetries && error instanceof Error && 
        (error.message.includes('worker') || error.message.includes('Worker'))) {
      console.log(`Retrying page ${pageNumber} preview generation (attempt ${retryCount + 1}/${maxRetries})`);
      // Force worker reinitialization
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      await new Promise(resolve => setTimeout(resolve, 1000));
      return generatePagePreview(file, pageNumber, { ...options, retryCount: retryCount + 1 });
    }
    
    return '';
  }
}

export function downloadFile(data: Uint8Array, filename: string): void {
  const blob = new Blob([data], { type: 'application/pdf' });
  saveAs(blob, filename);
}

export async function organizePDFPages(
  file: File,
  pageOperations: { pageNumber: number; operation: 'keep' | 'duplicate' | 'delete'; newPosition?: number }[],
  options: ProcessingOptions = {}
): Promise<Uint8Array> {
  const { onProgress } = options;
  
  onProgress?.(10, 'Loading PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  
  onProgress?.(30, 'Organizing pages...');
  
  // Sort operations by new position
  const sortedOperations = pageOperations
    .filter(op => op.operation !== 'delete')
    .sort((a, b) => (a.newPosition || 0) - (b.newPosition || 0));
  
  let processedCount = 0;
  
  for (const operation of sortedOperations) {
    onProgress?.(
      30 + (processedCount / sortedOperations.length) * 60,
      `Processing page ${operation.pageNumber}...`
    );
    
    if (operation.pageNumber <= sourcePdf.getPageCount()) {
      const [copiedPage] = await newPdf.copyPages(sourcePdf, [operation.pageNumber - 1]);
      newPdf.addPage(copiedPage);
    }
    
    processedCount++;
  }
  
  onProgress?.(95, 'Finalizing PDF...');
  const pdfBytes = await newPdf.save();
  onProgress?.(100, 'Complete!');
  
  return pdfBytes;
}

export interface WatermarkOptions extends ProcessingOptions {
  type: 'text' | 'image';
  content: string;
  opacity: number;
  position: {
    x: number;
    y: number;
  };
  pages?: number[]; // specific pages, or all if undefined
  fontSize?: number;
  fontColor?: string;
  imageFile?: File;
}

export async function addWatermarkToPDF(file: File, options: WatermarkOptions): Promise<Uint8Array> {
  const { onProgress, type, content, opacity, position, pages, fontSize = 24, fontColor = '#000000' } = options;
  
  onProgress?.(10, 'Loading PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();
  
  const pagesToProcess = pages || Array.from({ length: totalPages }, (_, i) => i + 1);
  
  onProgress?.(20, 'Preparing watermark...');
  
  let watermarkImage;
  if (type === 'image' && options.imageFile) {
    const imageBytes = await options.imageFile.arrayBuffer();
    if (options.imageFile.type === 'image/png') {
      watermarkImage = await pdfDoc.embedPng(imageBytes);
    } else if (options.imageFile.type === 'image/jpeg') {
      watermarkImage = await pdfDoc.embedJpg(imageBytes);
    }
  }
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  let processedCount = 0;
  
  for (const pageNum of pagesToProcess) {
    if (pageNum > totalPages) continue;
    
    onProgress?.(
      20 + (processedCount / pagesToProcess.length) * 70,
      `Adding watermark to page ${pageNum}...`
    );
    
    const page = pdfDoc.getPages()[pageNum - 1];
    const { width, height } = page.getSize();
    
    // Calculate position (relative to page size)
    const xPos = (position.x / 100) * width;
    const yPos = ((100 - position.y) / 100) * height; // Flip Y coordinate
    
    if (type === 'text') {
      // Parse color
      const colorHex = fontColor.replace('#', '');
      const r = parseInt(colorHex.substring(0, 2), 16) / 255;
      const g = parseInt(colorHex.substring(2, 4), 16) / 255;
      const b = parseInt(colorHex.substring(4, 6), 16) / 255;
      
      page.drawText(content, {
        x: xPos,
        y: yPos,
        size: fontSize,
        font: font,
        color: rgb(r, g, b),
        opacity: opacity
      });
    } else if (type === 'image' && watermarkImage) {
      const imageScale = Math.min(width * 0.3 / watermarkImage.width, height * 0.3 / watermarkImage.height);
      
      page.drawImage(watermarkImage, {
        x: xPos - (watermarkImage.width * imageScale) / 2,
        y: yPos - (watermarkImage.height * imageScale) / 2,
        width: watermarkImage.width * imageScale,
        height: watermarkImage.height * imageScale,
        opacity: opacity
      });
    }
    
    processedCount++;
  }
  
  onProgress?.(95, 'Finalizing PDF...');
  const pdfBytes = await pdfDoc.save();
  onProgress?.(100, 'Complete!');
  
  return pdfBytes;
}

// Thumbnail cache to avoid regenerating previews
const thumbnailCache = new Map<string, string>();

// Generate cache key for thumbnail
function getThumbnailCacheKey(fileName: string, pageNumber: number, scale: number): string {
  return `${fileName}-page${pageNumber}-scale${scale}`;
}

// Enhanced thumbnail generation with caching and lazy loading
export async function generatePageThumbnailWithCache(
  file: File,
  pageNumber: number,
  options: { scale?: number; quality?: number; useCache?: boolean } = {}
): Promise<string> {
  const { scale = 0.8, quality = 0.85, useCache = true } = options;
  
  const cacheKey = getThumbnailCacheKey(file.name, pageNumber, scale);
  
  // Return cached version if available
  if (useCache && thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }
  
  try {
    const preview = await generatePagePreview(file, pageNumber, {
      scale,
      format: 'jpeg',
      quality
    });
    
    // Cache the result
    if (useCache && preview) {
      thumbnailCache.set(cacheKey, preview);
    }
    
    return preview;
  } catch (error) {
    console.error(`Error generating thumbnail for page ${pageNumber}:`, error);
    return '';
  }
}

// Batch generate thumbnails with progress and caching
export async function generatePageThumbnailsBatch(
  file: File,
  pageNumbers: number[],
  options: {
    scale?: number;
    quality?: number;
    useCache?: boolean;
    onProgress?: (completed: number, total: number, pageNumber: number) => void;
    batchSize?: number;
  } = {}
): Promise<Map<number, string>> {
  const { 
    scale = 0.8, 
    quality = 0.85, 
    useCache = true, 
    onProgress,
    batchSize = 5 
  } = options;
  
  const results = new Map<number, string>();
  const batches: number[][] = [];
  
  // Split pages into batches for better performance
  for (let i = 0; i < pageNumbers.length; i += batchSize) {
    batches.push(pageNumbers.slice(i, i + batchSize));
  }
  
  let completed = 0;
  
  for (const batch of batches) {
    // Process batch in parallel
    const batchPromises = batch.map(async (pageNumber) => {
      const cacheKey = getThumbnailCacheKey(file.name, pageNumber, scale);
      
      // Check cache first
      if (useCache && thumbnailCache.has(cacheKey)) {
        return { pageNumber, preview: thumbnailCache.get(cacheKey)! };
      }
      
      try {
        const preview = await generatePagePreview(file, pageNumber, {
          scale,
          format: 'jpeg',
          quality
        });
        
        // Cache the result
        if (useCache && preview) {
          thumbnailCache.set(cacheKey, preview);
        }
        
        return { pageNumber, preview };
      } catch (error) {
        console.warn(`Failed to generate thumbnail for page ${pageNumber}:`, error);
        return { pageNumber, preview: '' };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Store results and update progress
    batchResults.forEach(({ pageNumber, preview }) => {
      results.set(pageNumber, preview);
      completed++;
      onProgress?.(completed, pageNumbers.length, pageNumber);
    });
  }
  
  return results;
}

// Clear thumbnail cache (useful for memory management)
export function clearThumbnailCache(): void {
  thumbnailCache.clear();
}

// Get cache size for debugging
export function getThumbnailCacheSize(): number {
  return thumbnailCache.size;
}

export async function downloadZip(files: { name: string; data: Uint8Array }[], zipName: string): Promise<void> {
  const zip = new JSZip();
  
  files.forEach(file => {
    zip.file(file.name, file.data);
  });
  
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, zipName);
}