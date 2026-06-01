import { PDFDocument, PDFImage } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ProcessingOptions } from './pdfUtils';

export interface ImageToPdfOptions extends ProcessingOptions {
  pageSize: { width: number; height: number };
  fitMode: 'fit' | 'fill' | 'center';
  quality: 'high' | 'medium' | 'low';
}

export interface PdfToImageOptions extends ProcessingOptions {
  format: 'jpg' | 'png';
  quality: number; // 0.1 to 1.0 for JPG
  dpi: number;
  pages?: number[]; // specific pages, or all if undefined
}

export async function convertImagesToPDF(files: File[], options: ImageToPdfOptions): Promise<Uint8Array> {
  const { onProgress, pageSize, fitMode, quality } = options;
  const pdfDoc = await PDFDocument.create();
  // The "Quality" setting now genuinely applies to images we have to re-encode
  // (anything that isn't already a JPEG/PNG); native JPEG/PNG are embedded losslessly.
  const jpegQuality = quality === 'high' ? 0.92 : quality === 'medium' ? 0.75 : 0.5;

  let embedded = 0;
  const skipped: string[] = [];

  for (const file of files) {
    onProgress?.((embedded / files.length) * 90, `Processing ${file.name}...`);

    const imageBytes = await file.arrayBuffer();
    let image: PDFImage;

    try {
      const name = file.name.toLowerCase();
      if (file.type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
        image = await pdfDoc.embedJpg(imageBytes);
      } else if (file.type === 'image/png' || name.endsWith('.png')) {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        // Other browser-decodable raster formats (BMP, GIF, WEBP...) -> re-encode to JPEG
        // at the chosen quality. Formats the browser can't decode (e.g. TIFF) throw here.
        const canvas = await createCanvasFromImage(file);
        image = await pdfDoc.embedJpg(await canvasToJpegBytes(canvas, jpegQuality));
      }
    } catch (error) {
      console.warn(`Skipped ${file.name}:`, error);
      skipped.push(file.name);
      continue;
    }

    const page = pdfDoc.addPage([pageSize.width, pageSize.height]);
    const { width: imgWidth, height: imgHeight } = image;

    let drawWidth = imgWidth;
    let drawHeight = imgHeight;
    let x = 0;
    let y = 0;

    switch (fitMode) {
      case 'fit': {
        const scale = Math.min(pageSize.width / imgWidth, pageSize.height / imgHeight);
        drawWidth = imgWidth * scale;
        drawHeight = imgHeight * scale;
        x = (pageSize.width - drawWidth) / 2;
        y = (pageSize.height - drawHeight) / 2;
        break;
      }

      case 'fill': {
        const scaleFill = Math.max(pageSize.width / imgWidth, pageSize.height / imgHeight);
        drawWidth = imgWidth * scaleFill;
        drawHeight = imgHeight * scaleFill;
        x = (pageSize.width - drawWidth) / 2;
        y = (pageSize.height - drawHeight) / 2;
        break;
      }

      case 'center': {
        // Center at native size, but scale DOWN if the image is larger than the page so it
        // never overflows/clips off the page.
        const downscale = Math.min(1, pageSize.width / imgWidth, pageSize.height / imgHeight);
        drawWidth = imgWidth * downscale;
        drawHeight = imgHeight * downscale;
        x = (pageSize.width - drawWidth) / 2;
        y = (pageSize.height - drawHeight) / 2;
        break;
      }
    }

    page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });
    embedded++;
  }

  // Don't hand back a blank "success": if nothing could be added, say so clearly.
  if (embedded === 0) {
    throw new Error(
      'None of the selected images could be added to the PDF. ' +
        'Supported formats are JPG, PNG, BMP, GIF and WEBP.'
    );
  }
  if (skipped.length > 0) {
    console.warn(`${skipped.length} image(s) were skipped: ${skipped.join(', ')}`);
  }

  onProgress?.(95, 'Finalizing PDF...');
  const pdfBytes = await pdfDoc.save();
  onProgress?.(100, 'Complete!');

  return pdfBytes;
}

export async function convertPdfToImages(file: File, options: PdfToImageOptions): Promise<{ name: string; data: Blob }[]> {
  const { onProgress, format, quality, dpi, pages } = options;
  
  onProgress?.(10, 'Loading PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  
  const pagesToProcess = pages || Array.from({ length: totalPages }, (_, i) => i + 1);
  const results: { name: string; data: Blob }[] = [];

  const scale = dpi / 72; // Convert DPI to scale factor

  // Browsers cap canvas dimensions (~most allow ≤ 16384px/side and a total-area limit).
  // Clamp the effective scale so high-DPI requests on large pages don't silently produce
  // blank images.
  const MAX_CANVAS_DIMENSION = 8192;

  try {
    for (let i = 0; i < pagesToProcess.length; i++) {
      const pageNum = pagesToProcess[i];
      if (pageNum < 1 || pageNum > totalPages) continue;

      onProgress?.(10 + (i / pagesToProcess.length) * 80, `Converting page ${pageNum}...`);

      const page = await pdf.getPage(pageNum);
      const baseViewport = page.getViewport({ scale });
      const clamp = Math.min(
        1,
        MAX_CANVAS_DIMENSION / baseViewport.width,
        MAX_CANVAS_DIMENSION / baseViewport.height
      );
      const viewport = clamp < 1 ? page.getViewport({ scale: scale * clamp }) : baseViewport;

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // JPEG has no alpha — paint white first so transparent regions don't render black.
      if (format === 'jpg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({ canvasContext: context, viewport }).promise;

      const blob = await canvasToBlob(canvas, format, quality);
      if (blob) {
        const extension = format === 'jpg' ? 'jpg' : 'png';
        results.push({
          name: `${file.name.replace(/\.pdf$/i, '')}_page_${pageNum}.${extension}`,
          data: blob
        });
      }
    }
  } finally {
    pdf.destroy(); // release the worker-side document; large/multi-page jobs leaked otherwise
  }

  if (results.length === 0) {
    throw new Error('No pages could be converted to images. The PDF may be empty or corrupted.');
  }

  onProgress?.(100, 'Complete!');
  return results;
}

async function createCanvasFromImage(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url); // avoid leaking the object URL
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      // White background so transparency doesn't turn black when we encode to JPEG.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`This image format can't be decoded by the browser: ${file.name}`));
    };
    img.src = url;
  });
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement, quality: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) blob.arrayBuffer().then(resolve).catch(reject);
        else reject(new Error('Could not convert canvas to image data'));
      },
      'image/jpeg',
      quality
    );
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, format: 'jpg' | 'png', quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob(resolve, mimeType, quality);
  });
}

export async function downloadImageZip(images: { name: string; data: Blob }[], zipName: string): Promise<void> {
  const zip = new JSZip();
  
  for (const image of images) {
    zip.file(image.name, image.data);
  }
  
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, zipName);
}