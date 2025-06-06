import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock PDF.js before imports
const mockPDFDocument = {

  numPages: 3,
  getPage: vi.fn(),
  destroy: vi.fn()
};

const mockPage = {
  getViewport: vi.fn(() => ({
    width: 100,
    height: 140,
    scale: 0.5
  })),
  render: vi.fn(() => ({
    promise: Promise.resolve()
  }))
};

const mockCanvas: any = {
  getContext: vi.fn(() => ({
    canvas: mockCanvas
  })),
  toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockimage'),
  height: 140,
  width: 100
};

const mockGetDocument = vi.fn(() => ({
  promise: Promise.resolve(mockPDFDocument)
}));

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  getDocument: mockGetDocument,
  GlobalWorkerOptions: {
    workerSrc: ''
  }
}));

// Mock global objects
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
import { generatePDFPreview, generatePagePreview } from '../pdfUtils';

describe('PDF Preview Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPDFDocument.getPage.mockResolvedValue(mockPage);
    (global.fetch as any).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generatePDFPreview', () => {
    it('should generate a preview for the first page by default', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      const result = await generatePDFPreview(mockFile);
      
      expect(result).toBe('data:image/jpeg;base64,mockimage');
      expect(mockPDFDocument.getPage).toHaveBeenCalledWith(1);
      expect(mockPage.getViewport).toHaveBeenCalledWith({ scale: 0.5 });
      expect(mockPDFDocument.destroy).toHaveBeenCalled();
    });

    it('should generate a preview for a specific page', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      const result = await generatePDFPreview(mockFile, 2);
      
      expect(result).toBe('data:image/jpeg;base64,mockimage');
      expect(mockPDFDocument.getPage).toHaveBeenCalledWith(2);
    });

    it('should default to page 1 if invalid page number is provided', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      const result = await generatePDFPreview(mockFile, 10); // Page doesn't exist
      
      expect(result).toBe('data:image/jpeg;base64,mockimage');
      expect(mockPDFDocument.getPage).toHaveBeenCalledWith(1);
    });

    it('should handle worker initialization errors gracefully', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      // Mock worker error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      const result = await generatePDFPreview(mockFile);
      
      // Should still work with fallback
      expect(result).toBe('data:image/jpeg;base64,mockimage');
    });

    it('should retry on worker-related errors', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      // First call fails with worker error, second succeeds
      mockGetDocument
        .mockRejectedValueOnce(new Error('Setting up fake worker failed'))
        .mockResolvedValueOnce({ promise: Promise.resolve(mockPDFDocument) });
      
      const result = await generatePDFPreview(mockFile);
      
      expect(mockGetDocument).toHaveBeenCalledTimes(2);
      expect(result).toBe('data:image/jpeg;base64,mockimage');
    });

    it('should return empty string after max retries', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      // Always fail with worker error
      mockGetDocument.mockRejectedValue(new Error('Setting up fake worker failed'));
      
      const result = await generatePDFPreview(mockFile);
      
      expect(result).toBe('');
      expect(mockGetDocument).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle canvas context errors', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      // Mock canvas getContext to return null
      mockCanvas.getContext.mockReturnValueOnce(null);
      
      const result = await generatePDFPreview(mockFile);
      
      expect(result).toBe('');
    });
  });

  describe('generatePagePreview', () => {
    it('should generate a preview with custom options', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      const result = await generatePagePreview(mockFile, 1, {
        scale: 1.0,
        format: 'png',
        quality: 0.9
      });
      
      expect(result).toBe('data:image/jpeg;base64,mockimage');
      expect(mockPage.getViewport).toHaveBeenCalledWith({ scale: 1.0 });
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png', 0.9);
    });

    it('should throw error for invalid page number', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      mockGetDocument.mockResolvedValueOnce({
        promise: Promise.resolve({
          ...mockPDFDocument,
          numPages: 2
        })
      });
      
      const result = await generatePagePreview(mockFile, 5);
      
      expect(result).toBe('');
    });

    it('should use JPEG format by default for format parameter', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      await generatePagePreview(mockFile, 1, { format: 'jpeg' });
      
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 1.0);
    });

    it('should handle PDF loading errors', async () => {
      const mockFile = new File(['invalid content'], 'test.pdf', { type: 'application/pdf' });
      
      mockGetDocument.mockRejectedValueOnce(new Error('Invalid PDF'));
      
      const result = await generatePagePreview(mockFile, 1);
      
      expect(result).toBe('');
    });

    it('should clean up PDF document after rendering', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      await generatePagePreview(mockFile, 1);
      
      expect(mockPDFDocument.destroy).toHaveBeenCalled();
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
      
      const result = await generatePDFPreview(mockFile);
      
      expect(result).toBe('');
    });

    it('should handle page rendering errors', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      mockPage.render.mockReturnValueOnce({
        promise: Promise.reject(new Error('Render error'))
      });
      
      const result = await generatePDFPreview(mockFile);
      
      expect(result).toBe('');
    });
  });
});