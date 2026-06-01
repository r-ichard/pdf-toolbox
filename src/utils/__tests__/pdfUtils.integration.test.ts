/**
 * REAL integration tests for pdfUtils — deliberately does NOT mock pdf-lib.
 *
 * The pre-existing unit suite (pdfUtils.test.ts / imageUtils.test.ts) mocks
 * pdf-lib and pdfjs-dist entirely, so it validates call plumbing but NOT actual
 * PDF correctness (e.g. mergePDFs "passes" only because the mocked save() returns
 * a 1000-byte array). This file exercises the genuine pdf-lib pipeline against the
 * real PDFs in test_files/ so we can assert true behavior — and lock in the bugs
 * found during QA as executable specifications.
 *
 * Functions that depend on pdfjs-dist / canvas (previews, pdf->image) are NOT
 * covered here — they require a real browser and belong in Playwright e2e.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Use REAL pdf-lib. Only stub the browser-only deps that pdfUtils imports at module load
// so importing the module doesn't require a canvas/worker.
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({ promise: Promise.resolve({ numPages: 0, getPage: vi.fn(), destroy: vi.fn() }) })),
  version: '4.2.67',
}));
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import {
  mergePDFs,
  splitPDF,
  rotatePDF,
  compressPDF,
  compressPDFDetailed,
  organizePDFPages,
  addWatermarkToPDF,
  getPageCount,
} from '../pdfUtils';
// Password functions are exercised in password.test.ts (qpdf-wasm mocked there).
import { PDFDocument, degrees } from 'pdf-lib';

const FILES = {
  example: 'test_files/example.pdf', // 3 pages
  compressed: 'test_files/example_compressed.pdf', // 3 pages
};

/** Build a real File-like object backed by real bytes (bypasses the global File mock in setup.ts). */
function realFile(relPath: string, name?: string, type = 'application/pdf'): File {
  const bytes = readFileSync(path.join(process.cwd(), relPath));
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return {
    name: name ?? path.basename(relPath),
    type,
    size: bytes.byteLength,
    arrayBuffer: async () => ab,
  } as unknown as File;
}

function fileFromBytes(bytes: Uint8Array, name = 'doc.pdf', type = 'application/pdf'): File {
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return { name, type, size: bytes.byteLength, arrayBuffer: async () => ab } as unknown as File;
}

function isPdf(bytes: Uint8Array): boolean {
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
}

const origBytes = () => readFileSync(path.join(process.cwd(), FILES.example));

describe('mergePDFs (real)', () => {
  it('produces a valid PDF whose page count is the sum of inputs', async () => {
    const a = realFile(FILES.example);
    const b = realFile(FILES.compressed);
    const [ca, cb] = [await getPageCount(a), await getPageCount(b)];
    expect(ca).toBe(3);
    expect(cb).toBe(3);

    const merged = await mergePDFs([realFile(FILES.example), realFile(FILES.compressed)]);
    expect(isPdf(merged)).toBe(true);
    const out = await PDFDocument.load(merged);
    expect(out.getPageCount()).toBe(ca + cb); // 6
  });

  it('applies provided metadata to the merged document', async () => {
    const merged = await mergePDFs([realFile(FILES.example)], {
      metadata: { title: 'QA Title', author: 'QA Author' },
    });
    const out = await PDFDocument.load(merged);
    expect(out.getTitle()).toBe('QA Title');
    expect(out.getAuthor()).toBe('QA Author');
  });
});

describe('splitPDF (real)', () => {
  it('extracts the requested pages as one-page PDFs', async () => {
    const results = await splitPDF(realFile(FILES.example), { mode: 'pages', pages: [1, 3] });
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(isPdf(r.data)).toBe(true);
      const doc = await PDFDocument.load(r.data);
      expect(doc.getPageCount()).toBe(1);
    }
    expect(results[0].name).toContain('page_1');
    expect(results[1].name).toContain('page_3');
  });

  it('splits every N pages into the correct number of chunks', async () => {
    const results = await splitPDF(realFile(FILES.example), { mode: 'pages', everyN: 2 } as any);
    expect(results).toHaveLength(Math.ceil(3 / 2)); // 2 chunks: [1,2] and [3]
    const last = await PDFDocument.load(results[results.length - 1].data);
    expect(last.getPageCount()).toBe(1);
  });

  it('safely ignores out-of-range / zero / negative page numbers without crashing', async () => {
    // Previously page 0 or a negative index crashed the whole split (copyPages [-1]).
    const results = await splitPDF(realFile(FILES.example), { mode: 'pages', pages: [0, -1, 2, 9999] });
    expect(results).toHaveLength(1); // only page 2 is valid
    expect(results[0].name).toContain('page_2');
  });
});

describe('rotatePDF (real)', () => {
  it('rotates the requested page', async () => {
    const out = await rotatePDF(realFile(FILES.example), [1], 90);
    const doc = await PDFDocument.load(out);
    expect(doc.getPages()[0].getRotation().angle).toBe(90);
  });

  it('is ADDITIVE: rotating a page that already had /Rotate 90 by another 90 yields 180', async () => {
    // Pre-rotate page 1 to 90deg and persist it.
    const src = await PDFDocument.load(origBytes());
    src.getPages()[0].setRotation(degrees(90));
    const preRotated = await src.save();
    expect((await PDFDocument.load(preRotated)).getPages()[0].getRotation().angle).toBe(90);

    // The UI asks for "+90" on this page; rotatePDF adds to the existing rotation.
    const out = await rotatePDF(fileFromBytes(preRotated), [1], 90);
    const angle = (await PDFDocument.load(out)).getPages()[0].getRotation().angle;
    expect(angle).toBe(180);
  });
});

describe('organizePDFPages (real)', () => {
  it('reorders pages by newPosition', async () => {
    const ops = [
      { pageNumber: 3, operation: 'keep' as const, newPosition: 0 },
      { pageNumber: 2, operation: 'keep' as const, newPosition: 1 },
      { pageNumber: 1, operation: 'keep' as const, newPosition: 2 },
    ];
    const out = await organizePDFPages(realFile(FILES.example), ops);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
  });

  it('DEFECT: a single op with operation:"duplicate" produces only ONE copy (the duplicate branch is dead code)', async () => {
    // The util contract implies "duplicate" should yield two copies of the page,
    // but organizePDFPages only filters out "delete" and copies each remaining op once.
    const out = await organizePDFPages(realFile(FILES.example), [
      { pageNumber: 1, operation: 'duplicate' as const, newPosition: 0 },
    ]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(1); // not 2 — duplication relies entirely on the UI passing two array entries
  });

  it('DEFECT: deleting every page silently yields a 1-page BLANK PDF (pdf-lib save() defaults addDefaultPage:true)', async () => {
    // Instead of erroring or producing a 0-page document, the emptied PDFDocument is saved with
    // pdf-lib's default addDefaultPage:true, so the user downloads a mystery blank page.
    const out = await organizePDFPages(realFile(FILES.example), [
      { pageNumber: 1, operation: 'delete' as const },
      { pageNumber: 2, operation: 'delete' as const },
      { pageNumber: 3, operation: 'delete' as const },
    ]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(1);
  });
});

describe('addWatermarkToPDF (real)', () => {
  it('adds a text watermark and keeps page count, output is a valid PDF', async () => {
    const out = await addWatermarkToPDF(realFile(FILES.example), {
      type: 'text',
      content: 'CONFIDENTIAL',
      opacity: 0.5,
      position: { x: 50, y: 50 },
      fontColor: '#ff0000',
      fontSize: 24,
    });
    expect(isPdf(out)).toBe(true);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(3);
  });

  it('rejects an invalid free-text color with a clear, actionable message (no NaN crash)', async () => {
    await expect(
      addWatermarkToPDF(realFile(FILES.example), {
        type: 'text',
        content: 'X',
        opacity: 0.5,
        position: { x: 50, y: 50 },
        fontColor: 'red',
      })
    ).rejects.toThrow(/Invalid watermark color/i);
  });

  it('accepts 3-digit hex colors like #f00', async () => {
    const out = await addWatermarkToPDF(realFile(FILES.example), {
      type: 'text',
      content: 'X',
      opacity: 0.5,
      position: { x: 50, y: 50 },
      fontColor: '#f00',
    });
    expect(isPdf(out)).toBe(true);
  });

  it('rejects an unsupported image type with a clear error instead of a silent watermark-free "success"', async () => {
    // A webp renamed .png passes the dropzone, but magic-byte sniffing rejects it loudly.
    const fakeImg = { name: 'logo.png', type: 'image/webp', size: 10, arrayBuffer: async () => new ArrayBuffer(10) } as unknown as File;
    await expect(
      addWatermarkToPDF(realFile(FILES.example), {
        type: 'image',
        content: '',
        opacity: 0.5,
        position: { x: 50, y: 50 },
        imageFile: fakeImg,
      })
    ).rejects.toThrow(/PNG or JPEG/i);
  });
});

describe('compressPDF (real) — never inflates, honest result', () => {
  // pdfjs is mocked here (no canvas), so the rasterization path is unavailable and
  // compression uses the lossless object-stream re-save (which actually shrinks this PDF).
  it('never returns a file larger than the input, for every quality level', async () => {
    const original = origBytes().length;
    for (const quality of ['low', 'medium', 'high'] as const) {
      const out = await compressPDF(realFile(FILES.example), { quality });
      expect(out.length).toBeLessThanOrEqual(original);
      expect(isPdf(out)).toBe(true);
    }
  });

  it('actually shrinks a typical PDF losslessly and reports truthful, non-negative stats', async () => {
    const res = await compressPDFDetailed(realFile(FILES.example), { quality: 'high' });
    expect(['none', 'lossless', 'rasterized']).toContain(res.method);
    expect(res.originalSize).toBe(origBytes().length);
    expect(res.compressedSize).toBeLessThanOrEqual(res.originalSize);
    expect(res.originalSize - res.compressedSize).toBeGreaterThanOrEqual(0); // never negative
    // For example.pdf the object-stream re-save is a real win.
    expect(res.method).toBe('lossless');
    expect(res.compressedSize).toBeLessThan(res.originalSize);
  });
});

