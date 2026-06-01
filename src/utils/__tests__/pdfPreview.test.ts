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

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => mockCanvas)
  },
  writable: true
});

// Import after mocks are set up
import { generatePDFPreview } from '../pdfUtils';

describe('PDF Preview Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas.getContext.mockReturnValue({});
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

    it('should handle canvas context errors by returning an empty string', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });

      mockCanvas.getContext.mockReturnValueOnce(null);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await generatePDFPreview(mockFile);

      expect(result).toBe('');
      consoleSpy.mockRestore();
    });

    it('should handle PDF loading errors by returning an empty string', async () => {
      const mockFile = new File(['invalid content'], 'test.pdf', { type: 'application/pdf' });

      const { getDocument } = await import('pdfjs-dist');
      vi.mocked(getDocument).mockReturnValueOnce({
        promise: Promise.reject(new Error('Invalid PDF'))
      } as any);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await generatePDFPreview(mockFile);

      expect(result).toBe('');
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle file reading errors by returning an empty string', async () => {
      const mockFile = {
        arrayBuffer: vi.fn().mockRejectedValue(new Error('File read error'))
      } as unknown as File;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await generatePDFPreview(mockFile);

      expect(result).toBe('');
      consoleSpy.mockRestore();
    });
  });
});
