/**
 * Worker configuration tests. The app no longer probes the network or falls back
 * to a CDN for the PDF.js worker — it is bundled by Vite and served from our own
 * origin. These tests guard that privacy/offline guarantee: the configured worker
 * must be same-origin and must never point at a third party.
 */
import { describe, it, expect, vi } from 'vitest';

// Light pdfjs mock so importing pdfUtils doesn't need a real worker/canvas.
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({ promise: Promise.resolve({ numPages: 0, getPage: vi.fn(), destroy: vi.fn() }) })),
  version: '4.10.38',
}));
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import * as pdfjsLib from 'pdfjs-dist';
import '../pdfUtils'; // side effect: configures GlobalWorkerOptions.workerSrc on import

describe('PDF.js worker configuration', () => {
  it('configures a worker source on module load', () => {
    expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBeTruthy();
    expect(typeof pdfjsLib.GlobalWorkerOptions.workerSrc).toBe('string');
  });

  it('never points at an external CDN (fully in-browser / offline-safe)', () => {
    const src = String(pdfjsLib.GlobalWorkerOptions.workerSrc);
    expect(src).not.toMatch(/cdnjs|unpkg|jsdelivr|https?:\/\//i);
  });

  it('references the bundled pdf worker asset', () => {
    expect(String(pdfjsLib.GlobalWorkerOptions.workerSrc)).toMatch(/pdf\.worker/i);
  });
});
