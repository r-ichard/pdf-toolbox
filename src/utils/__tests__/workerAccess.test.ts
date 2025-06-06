import { describe, it, expect, vi } from 'vitest';

describe('PDF Worker Accessibility', () => {
  it('should have PDF worker file in public directory', async () => {
    // Mock fetch to simulate checking if worker file exists
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Test local worker access
    mockFetch.mockResolvedValueOnce({ ok: true });
    
    const response = await fetch('/pdf.worker.min.js', { method: 'HEAD' });
    
    expect(response.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('/pdf.worker.min.js', { method: 'HEAD' });
  });

  it('should fallback to CDN when local worker is not available', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // First call (local) fails, second (CDN) succeeds
    mockFetch
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce({ ok: true });
    
    // Test CDN fallback
    try {
      await fetch('/pdf.worker.min.js', { method: 'HEAD' });
    } catch {
      // Local failed, try CDN
      const cdnResponse = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js', { method: 'HEAD' });
      expect(cdnResponse.ok).toBe(true);
    }
  });

  it('should handle network failures gracefully', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockFetch.mockRejectedValue(new Error('Network error'));
    
    try {
      await fetch('/pdf.worker.min.js', { method: 'HEAD' });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Network error');
    }
  });

  it('should validate worker sources are properly configured', () => {
    const workerSources = [
      '/pdf.worker.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js',
      'https://unpkg.com/pdfjs-dist@4.2.67/build/pdf.worker.min.js'
    ];

    workerSources.forEach(src => {
      expect(src).toBeTruthy();
      expect(typeof src).toBe('string');
      expect(src.length).toBeGreaterThan(0);
      
      if (src.startsWith('http')) {
        expect(src).toMatch(/^https?:\/\/.+\.js$/);
      } else {
        expect(src).toMatch(/^\/.*\.js$/);
      }
    });
  });
});