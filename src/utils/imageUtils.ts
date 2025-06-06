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
  const { onProgress, pageSize, fitMode } = options;
  const pdfDoc = await PDFDocument.create();
  
  let processedFiles = 0;
  
  for (const file of files) {
    onProgress?.(
      (processedFiles / files.length) * 90,
      `Processing ${file.name}...`
    );
    
    const imageBytes = await file.arrayBuffer();
    let image: PDFImage;
    
    try {
      if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
        image = await pdfDoc.embedJpg(imageBytes);
      } else if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        // Convert other formats to PNG first
        const canvas = await createCanvasFromImage(file);
        const pngBytes = await canvasToPng(canvas);
        image = await pdfDoc.embedPng(pngBytes);
      }
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
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
        const scaleX = pageSize.width / imgWidth;
        const scaleY = pageSize.height / imgHeight;
        const scale = Math.min(scaleX, scaleY);
        drawWidth = imgWidth * scale;
        drawHeight = imgHeight * scale;
        x = (pageSize.width - drawWidth) / 2;
        y = (pageSize.height - drawHeight) / 2;
        break;
      }
        
      case 'fill': {
        const scaleXFill = pageSize.width / imgWidth;
        const scaleYFill = pageSize.height / imgHeight;
        const scaleFill = Math.max(scaleXFill, scaleYFill);
        drawWidth = imgWidth * scaleFill;
        drawHeight = imgHeight * scaleFill;
        x = (pageSize.width - drawWidth) / 2;
        y = (pageSize.height - drawHeight) / 2;
        break;
      }
        
      case 'center':
        x = (pageSize.width - imgWidth) / 2;
        y = (pageSize.height - imgHeight) / 2;
        break;
    }
    
    page.drawImage(image, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
    
    processedFiles++;
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
  
  for (let i = 0; i < pagesToProcess.length; i++) {
    const pageNum = pagesToProcess[i];
    if (pageNum > totalPages) continue;
    
    onProgress?.(
      10 + (i / pagesToProcess.length) * 80,
      `Converting page ${pageNum}...`
    );
    
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
    
    const blob = await canvasToBlob(canvas, format, quality);
    if (blob) {
      const extension = format === 'jpg' ? 'jpg' : 'png';
      results.push({
        name: `${file.name.replace('.pdf', '')}_page_${pageNum}.${extension}`,
        data: blob
      });
    }
  }
  
  onProgress?.(100, 'Complete!');
  return results;
}

async function createCanvasFromImage(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function canvasToPng(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        blob.arrayBuffer().then(resolve).catch(reject);
      } else {
        reject(new Error('Could not convert canvas to blob'));
      }
    }, 'image/png');
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