import { describe, it, expect, beforeEach, vi } from 'vitest'
import { convertImagesToPDF, convertPdfToImages } from '../imageUtils'

// Mock pdf-lib
vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn().mockResolvedValue({
      addPage: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      }),
      embedJpg: vi.fn().mockResolvedValue({
        width: 100,
        height: 100,
      }),
      embedPng: vi.fn().mockResolvedValue({
        width: 100,
        height: 100,
      }),
      save: vi.fn().mockResolvedValue(new Uint8Array(1000)),
    }),
  },
}))

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 3,
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn().mockReturnValue({ width: 595, height: 842 }),
        render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
      }),
    }),
  }),
  version: '3.0.0'
}))

// Mock file-saver and jszip
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}))

vi.mock('jszip', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      file: vi.fn(),
      generateAsync: vi.fn().mockResolvedValue(new Blob(['zip content'])),
    })),
  }
})

describe('imageUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock canvas and context
    const mockContext = {
      drawImage: vi.fn(),
    }
    
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      toBlob: vi.fn((callback) => callback(new Blob(['canvas'], { type: 'image/png' }))),
      width: 0,
      height: 0,
    }
    
    global.document.createElement = vi.fn().mockReturnValue(mockCanvas)
  })

  describe('convertImagesToPDF', () => {
    it('should convert JPEG images to PDF', async () => {
      const mockFiles = [
        new File(['jpeg1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['jpeg2'], 'test2.jpg', { type: 'image/jpeg' }),
      ]

      const options = {
        pageSize: { width: 595, height: 842 },
        fitMode: 'fit' as const,
        quality: 'high' as const,
        onProgress: vi.fn(),
      }

      const result = await convertImagesToPDF(mockFiles, options)

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.byteLength).toBe(1000)
      expect(options.onProgress).toHaveBeenCalledWith(100, 'Complete!')
    })

    it('should convert PNG images to PDF', async () => {
      const mockFiles = [
        new File(['png1'], 'test1.png', { type: 'image/png' }),
      ]

      const options = {
        pageSize: { width: 595, height: 842 },
        fitMode: 'fit' as const,
        quality: 'high' as const,
      }

      const result = await convertImagesToPDF(mockFiles, options)
      expect(result).toBeInstanceOf(Uint8Array)
    })

    it('should handle different fit modes', async () => {
      const mockFile = new File(['jpeg'], 'test.jpg', { type: 'image/jpeg' })

      const fitModes = ['fit', 'fill', 'center'] as const
      
      for (const fitMode of fitModes) {
        const options = {
          pageSize: { width: 595, height: 842 },
          fitMode,
          quality: 'high' as const,
        }

        const result = await convertImagesToPDF([mockFile], options)
        expect(result).toBeInstanceOf(Uint8Array)
      }
    })

    // TODO: Fix this test - times out due to Image loading
    // it('should handle unsupported image formats by converting to PNG', async () => {
    //   const mockFile = new File(['bmp'], 'test.bmp', { type: 'image/bmp' })

    //   const options = {
    //     pageSize: { width: 595, height: 842 },
    //     fitMode: 'fit' as const,
    //     quality: 'high' as const,
    //   }

    //   // Test should pass with mock data
    //   const result = await convertImagesToPDF([mockFile], options)
    //   expect(result).toBeInstanceOf(Uint8Array)
    // }, 10000)
  })

  describe('convertPdfToImages', () => {
    it('should convert PDF pages to images', async () => {
      const mockFile = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })

      const options = {
        format: 'png' as const,
        quality: 0.9,
        dpi: 150,
        onProgress: vi.fn(),
      }

      const result = await convertPdfToImages(mockFile, options)

      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBe(3) // Mock PDF has 3 pages
      expect(options.onProgress).toHaveBeenCalledWith(100, 'Complete!')
    })

    it('should convert specific pages only', async () => {
      const mockFile = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })

      const options = {
        format: 'jpg' as const,
        quality: 0.8,
        dpi: 72,
        pages: [1, 3], // Only pages 1 and 3
      }

      const result = await convertPdfToImages(mockFile, options)

      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBe(2) // Only 2 pages requested
    })

    it('should handle different DPI settings', async () => {
      const mockFile = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })

      const dpiSettings = [72, 150, 300]
      
      for (const dpi of dpiSettings) {
        const options = {
          format: 'png' as const,
          quality: 1.0,
          dpi,
        }

        const result = await convertPdfToImages(mockFile, options)
        expect(result).toBeInstanceOf(Array)
      }
    })

    it('should skip pages beyond PDF length', async () => {
      const mockFile = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })

      const options = {
        format: 'png' as const,
        quality: 1.0,
        dpi: 150,
        pages: [1, 2, 3, 4, 5], // PDF only has 3 pages
      }

      const result = await convertPdfToImages(mockFile, options)
      expect(result.length).toBe(3) // Should only process existing pages
    })
  })

  describe('Error Handling', () => {
    it('should handle corrupted image files', async () => {
      const corruptFile = new File(['not an image'], 'corrupt.jpg', { type: 'image/jpeg' })

      // Mock PDFDocument creation to throw on embedJpg
      const mockDoc = {
        addPage: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
        embedJpg: vi.fn().mockRejectedValueOnce(new Error('Invalid image')),
        embedPng: vi.fn().mockResolvedValue({ width: 100, height: 100 }),
        save: vi.fn().mockResolvedValue(new Uint8Array(1000)),
      }
      
      vi.doMock('pdf-lib', () => ({
        PDFDocument: {
          create: vi.fn().mockResolvedValue(mockDoc),
        },
      }))

      const options = {
        pageSize: { width: 595, height: 842 },
        fitMode: 'fit' as const,
        quality: 'high' as const,
      }

      // Should not throw, should continue processing
      const result = await convertImagesToPDF([corruptFile], options)
      expect(result).toBeInstanceOf(Uint8Array)
    })

    it('should handle invalid PDF for image conversion', async () => {
      const invalidFile = new File(['not a pdf'], 'invalid.pdf', { type: 'application/pdf' })

      const pdfjsLib = await import('pdfjs-dist')
      vi.mocked(pdfjsLib.getDocument).mockReturnValueOnce({
        promise: Promise.reject(new Error('Invalid PDF'))
      } as any)

      const options = {
        format: 'png' as const,
        quality: 1.0,
        dpi: 150,
      }

      await expect(convertPdfToImages(invalidFile, options)).rejects.toThrow()
    })
  })
})

describe('Image Utility Edge Cases', () => {
  it('should handle zero-sized images', async () => {
    const zeroFile = new File([''], 'empty.jpg', { type: 'image/jpeg' })

    const options = {
      pageSize: { width: 595, height: 842 },
      fitMode: 'fit' as const,
      quality: 'high' as const,
    }

    const result = await convertImagesToPDF([zeroFile], options)
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('should handle extremely large images', async () => {
    const largeFile = new File(['x'.repeat(50 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })

    const options = {
      pageSize: { width: 595, height: 842 },
      fitMode: 'fit' as const,
      quality: 'high' as const,
    }

    // Should not cause memory issues
    const result = await convertImagesToPDF([largeFile], options)
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('should handle unusual aspect ratios', async () => {
    const weirdFile = new File(['wide'], 'wide.jpg', { type: 'image/jpeg' })

    const options = {
      pageSize: { width: 595, height: 842 },
      fitMode: 'fit' as const,
      quality: 'high' as const,
    }

    // Test with standard mocks
    const result = await convertImagesToPDF([weirdFile], options)
    expect(result).toBeInstanceOf(Uint8Array)
  })
})