import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
// Vite emits the worker as a hashed, SAME-ORIGIN asset. The worker version is
// therefore always in lock-step with the installed pdfjs-dist, and no script or
// document data is ever fetched from a third party — this is what keeps the app
// "fully in-browser" and able to run offline / under a strict CSP.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

// Configure the PDF.js worker exactly once, from our own origin. There is
// deliberately NO CDN fallback: a missing worker is surfaced as a normal error
// rather than silently reaching out to the network.
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
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
      // Guard BOTH bounds (1-based). Without the lower guard, page 0/negative produced
      // a copyPages index of -1 and crashed the entire split.
      if (pageNum >= 1 && pageNum <= totalPages) {
        onProgress?.((i / pages.length) * 80 + 10, `Extracting page ${pageNum}...`);

        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [pageNum - 1]);
        newPdf.addPage(copiedPage);

        const pdfBytes = await newPdf.save();
        results.push({
          name: `${file.name.replace(/\.pdf$/i, '')}_page_${pageNum}.pdf`,
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
      ).filter(idx => idx >= 0 && idx < totalPages);
      
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

export type CompressionMethod = 'none' | 'lossless' | 'rasterized';

export interface CompressionResult {
  data: Uint8Array;
  originalSize: number;
  compressedSize: number;
  method: CompressionMethod;
}

function dataURLToUint8Array(dataURL: string): Uint8Array {
  const base64 = dataURL.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Aggressive path: render each page to a JPEG and rebuild the PDF. This shrinks
// image-heavy/scanned PDFs dramatically. It rasterizes text (no longer selectable),
// so the caller only KEEPS this result when it is meaningfully smaller. Browser-only.
async function rasterizeToPdf(
  sourceBytes: Uint8Array,
  dpi: number,
  jpegQuality: number,
  onProgress?: (progress: number, message: string) => void
): Promise<Uint8Array | null> {
  if (typeof document === 'undefined') return null; // no canvas (e.g. Node test env)

  const pdf = await pdfjsLib.getDocument({ data: sourceBytes.slice() }).promise;
  if (!pdf.numPages) {
    pdf.destroy();
    return null;
  }

  const out = await PDFDocument.create();
  const scale = dpi / 72;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    onProgress?.(40 + (pageNum / pdf.numPages) * 50, `Re-encoding page ${pageNum}/${pdf.numPages}...`);
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // JPEG has no alpha — paint a white background so transparent areas don't go black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;

    const jpgBytes = dataURLToUint8Array(canvas.toDataURL('image/jpeg', jpegQuality));
    const img = await out.embedJpg(jpgBytes);

    const pointSize = page.getViewport({ scale: 1 }); // page size in PDF points
    const outPage = out.addPage([pointSize.width, pointSize.height]);
    outPage.drawImage(img, { x: 0, y: 0, width: pointSize.width, height: pointSize.height });
  }

  pdf.destroy();
  return out.save({ useObjectStreams: true });
}

/**
 * Compress a PDF entirely in the browser, guaranteeing the output is NEVER larger
 * than the input (it returns the smallest of: original, lossless re-save, and — for
 * medium/high — a rasterized re-encode that is only kept when it's clearly smaller).
 */
export async function compressPDFDetailed(file: File, options: CompressionOptions): Promise<CompressionResult> {
  const { onProgress, quality = 'medium' } = options;

  onProgress?.(5, 'Loading PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const originalBytes = new Uint8Array(arrayBuffer);

  let best = originalBytes;
  let method: CompressionMethod = 'none';

  // 1) Lossless structural optimization (object streams + dropped bloat). Always safe.
  onProgress?.(20, 'Optimizing structure...');
  try {
    const src = await PDFDocument.load(arrayBuffer);
    src.setProducer('PDF Toolbox Web');
    const lossless = await src.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 100 });
    if (lossless.length < best.length) {
      best = lossless;
      method = 'lossless';
    }
  } catch (error) {
    console.warn('Lossless optimization skipped:', error);
  }

  // 2) Aggressive image re-encode for medium/high — kept only if >=10% smaller than
  //    the best lossless result, so we don't rasterize crisp text for a trivial gain.
  if (quality !== 'low') {
    onProgress?.(40, 'Re-encoding pages...');
    try {
      const dpi = quality === 'high' ? 100 : 144;
      const jpegQuality = quality === 'high' ? 0.5 : 0.7;
      const rasterized = await rasterizeToPdf(originalBytes, dpi, jpegQuality, onProgress);
      if (rasterized && rasterized.length < best.length * 0.9) {
        best = rasterized;
        method = 'rasterized';
      }
    } catch (error) {
      console.warn('Aggressive compression unavailable, kept lossless result:', error);
    }
  }

  onProgress?.(100, 'Complete!');
  return { data: best, originalSize: originalBytes.length, compressedSize: best.length, method };
}

export async function compressPDF(file: File, options: CompressionOptions): Promise<Uint8Array> {
  return (await compressPDFDetailed(file, options)).data;
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
    // Guard both bounds (1-based). Rotation is ADDITIVE: we add to whatever rotation
    // the page already has (e.g. a scanned page with /Rotate 90) so the result matches
    // what the user saw in the preview, instead of overwriting the original orientation.
    if (pageNum >= 1 && pageNum <= pages.length) {
      const page = pages[pageNum - 1];
      const current = page.getRotation().angle || 0;
      const next = ((current + angle) % 360 + 360) % 360;
      page.setRotation(degrees(next));
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
  const { userPassword, ownerPassword, permissions, onProgress } = options;

  if (!userPassword && !ownerPassword) {
    throw new Error('Please enter at least one password to protect the PDF.');
  }

  onProgress?.(10, 'Loading PDF...');
  const bytes = new Uint8Array(await file.arrayBuffer());

  onProgress?.(40, 'Encrypting PDF...');
  // Real 256-bit AES encryption via qpdf-wasm, lazily code-split and run fully in-browser.
  const { encryptPDF } = await import('./qpdf');
  const result = await encryptPDF(bytes, { userPassword, ownerPassword, permissions });

  onProgress?.(100, 'Complete!');
  return result;
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
  const bytes = new Uint8Array(await file.arrayBuffer());

  onProgress?.(40, 'Removing password...');
  // qpdf actually decrypts using the supplied password (in-browser); a wrong password
  // surfaces a clear "Incorrect password" error instead of silently producing junk.
  const { decryptPDF } = await import('./qpdf');
  const result = await decryptPDF(bytes, password ?? '');

  onProgress?.(100, 'Complete!');
  return result;
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

export async function generatePDFPreview(file: File, pageNumber: number = 1): Promise<string> {
  try {
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
    
    const scale = 1.2;
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
  const { scale = 1.2, maxPages = 50, quality = 0.85, onProgress } = options;
  
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
  options: { scale?: number; format?: 'png' | 'jpeg'; quality?: number } = {}
): Promise<string> {
  const { scale = 1.2, format = 'png', quality = 1.0 } = options;

  try {
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

// Parse a CSS-ish hex color into pdf-lib's 0..1 rgb. Accepts #rgb, #rrggbb, with or
// without '#'. Returns null for anything invalid so callers never feed NaN into rgb()
// (which throws). This is what kept a typed color like "red" from crashing watermarking.
export function parseHexColor(input: string): { r: number; g: number; b: number } | null {
  let hex = (input || '').trim().replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
}

// Decide how to embed an image watermark by sniffing magic bytes (not the MIME/extension,
// which can lie). Throws a clear error for anything that isn't PNG or JPEG so the UI can
// tell the user instead of silently producing a watermark-free "success".
async function embedWatermarkImage(pdfDoc: PDFDocument, imageFile: File) {
  const bytes = new Uint8Array(await imageFile.arrayBuffer());
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isPng) return pdfDoc.embedPng(bytes);
  if (isJpg) return pdfDoc.embedJpg(bytes);
  throw new Error('Unsupported watermark image. Please use a PNG or JPEG image.');
}

export async function addWatermarkToPDF(file: File, options: WatermarkOptions): Promise<Uint8Array> {
  const { onProgress, type, content, position, pages, fontSize = 24, fontColor = '#000000' } = options;
  const opacity = Math.min(1, Math.max(0.05, options.opacity)); // clamp to a sane, visible range

  onProgress?.(10, 'Loading PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();

  const pagesToProcess = pages || Array.from({ length: totalPages }, (_, i) => i + 1);

  onProgress?.(20, 'Preparing watermark...');

  let watermarkImage;
  if (type === 'image') {
    if (!options.imageFile) throw new Error('Please choose an image for the watermark.');
    watermarkImage = await embedWatermarkImage(pdfDoc, options.imageFile);
  }

  // Validate the text color up-front so we fail fast with a clear message rather than mid-loop.
  const color = type === 'text' ? parseHexColor(fontColor) : { r: 0, g: 0, b: 0 };
  if (type === 'text' && !color) {
    throw new Error(`Invalid watermark color "${fontColor}". Use a hex value like #ff0000.`);
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let processedCount = 0;

  for (const pageNum of pagesToProcess) {
    if (pageNum < 1 || pageNum > totalPages) continue;

    onProgress?.(
      20 + (processedCount / pagesToProcess.length) * 70,
      `Adding watermark to page ${pageNum}...`
    );

    const page = pdfDoc.getPages()[pageNum - 1];
    const { width, height } = page.getSize();

    // Treat the chosen position as the CENTER of the watermark (matches the UI preview,
    // which centers via translate(-50%, -50%)).
    const xCenter = (position.x / 100) * width;
    const yCenter = ((100 - position.y) / 100) * height; // Flip Y for PDF coordinate space

    if (type === 'text') {
      const textWidth = font.widthOfTextAtSize(content, fontSize);
      page.drawText(content, {
        x: xCenter - textWidth / 2,
        y: yCenter - fontSize / 2,
        size: fontSize,
        font,
        color: rgb(color!.r, color!.g, color!.b),
        opacity,
      });
    } else if (watermarkImage) {
      const imageScale = Math.min(width * 0.3 / watermarkImage.width, height * 0.3 / watermarkImage.height);
      page.drawImage(watermarkImage, {
        x: xCenter - (watermarkImage.width * imageScale) / 2,
        y: yCenter - (watermarkImage.height * imageScale) / 2,
        width: watermarkImage.width * imageScale,
        height: watermarkImage.height * imageScale,
        opacity,
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
  const { scale = 1.2, quality = 0.85, useCache = true } = options;
  
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
    scale = 1.2, 
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