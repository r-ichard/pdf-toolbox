import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => {
  const mockPage = {
    getViewport: vi.fn(() => ({
      width: 100,
      height: 140
    })),
    render: vi.fn(() => ({
      promise: Promise.resolve()
    }))
  };

  const mockPDFDocument = {
    numPages: 3,
    getPage: vi.fn().mockResolvedValue(mockPage),
    destroy: vi.fn()
  };

  const mockGetDocument = vi.fn(() => ({
    promise: Promise.resolve(mockPDFDocument)
  }));

  return {
    getDocument: mockGetDocument,
    GlobalWorkerOptions: {
      workerSrc: ''
    }
  };
});

// Mock global objects
const mockCanvas: any = {
  getContext: vi.fn(() => ({})),
  toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockimage'),
  height: 140,
  width: 100
};

Object.defineProperty(global, 'fetch', {
  value: vi.fn(() => Promise.resolve({ ok: true })),
  writable: true
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => mockCanvas)
  },
  writable: true
});

Object.defineProperty(global, 'console', {
  value: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  writable: true
});

// Import after mocks are set up
import { generatePDFPreview } from '../pdfUtils';

describe('PDF Preview Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({ ok: true });
  });

  describe('generatePDFPreview', () => {
    it('should generate a preview for the first page by default', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      const result = await generatePDFPreview(mockFile);
      
      expect(result).toBe('data:image/jpeg;base64,mockimage');
    });

    it('should generate a preview for a specific page', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      const result = await generatePDFPreview(mockFile, 2);
      
      expect(result).toBe('data:image/jpeg;base64,mockimage');
    });

    it('should default to page 1 if invalid page number is provided', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      const result = await generatePDFPreview(mockFile, 10); // Page doesn't exist
      
      expect(result).toBe('data:image/jpeg;base64,mockimage');
    });

    it('should handle worker initialization errors gracefully', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      // Mock worker error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      const result = await generatePDFPreview(mockFile);
      
      // Should still work with fallback
      expect(result).toBe('data:image/jpeg;base64,mockimage');
    });

    it('should handle canvas context errors', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      // Mock canvas getContext to return null
      mockCanvas.getContext.mockReturnValueOnce(null);
      
      // Mock console.error to avoid noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await generatePDFPreview(mockFile);
      
      expect(result).toBe('');
      
      consoleSpy.mockRestore();
    });

    it('should handle PDF loading errors', async () => {
      const mockFile = new File(['invalid content'], 'test.pdf', { type: 'application/pdf' });
      
      // Mock pdfjs to throw error
      const { getDocument } = await import('pdfjs-dist');
      vi.mocked(getDocument).mockReturnValueOnce({
        promise: Promise.reject(new Error('Invalid PDF'))
      } as any);
      
      // Mock console.error to avoid noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await generatePDFPreview(mockFile);
      
      expect(result).toBe('');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Worker Management', () => {
    it('should test multiple worker sources on initialization', async () => {
      // Mock first two sources to fail, third to succeed
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('404'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true });

      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      const result = await generatePDFPreview(mockFile);
      
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result).toBe('data:image/jpeg;base64,mockimage');
    });

    it('should warn when no working worker source is found', async () => {
      // All worker sources fail
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      await generatePDFPreview(mockFile);
      
      expect(console.warn).toHaveBeenCalledWith(
        'No working PDF.js worker source found. PDF preview may not work.'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle file reading errors', async () => {
      const mockFile = {
        arrayBuffer: vi.fn().mockRejectedValue(new Error('File read error'))
      } as unknown as File;
      
      // Mock console.error to avoid noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await generatePDFPreview(mockFile);
      
      expect(result).toBe('');
      
      consoleSpy.mockRestore();
    });
  });
});