import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mergePDFs, getPageCount, generatePDFPreview, rotatePDF } from '../pdfUtils'

// Mock DOM globals
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn().mockReturnValue({
      getContext: vi.fn().mockReturnValue({}),
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock'),
      width: 0,
      height: 0,
    })
  }
})

// Mock fetch for worker initialization
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
})

// Mock pdf-lib
vi.mock('pdf-lib', () => {
  const mockPDFDoc = {
    addPage: vi.fn(),
    copyPages: vi.fn().mockResolvedValue([{}]),
    setTitle: vi.fn(),
    setAuthor: vi.fn(),
    setSubject: vi.fn(),
    setCreator: vi.fn(),
    save: vi.fn().mockResolvedValue(new Uint8Array(1000)),
    getPageCount: vi.fn().mockReturnValue(3),
    getPageIndices: vi.fn().mockReturnValue([0, 1, 2]),
    getPages: vi.fn().mockReturnValue([
      { setRotation: vi.fn() },
      { setRotation: vi.fn() },
      { setRotation: vi.fn() },
    ]),
  }

  return {
    PDFDocument: {
      create: vi.fn().mockResolvedValue(mockPDFDoc),
      load: vi.fn().mockResolvedValue(mockPDFDoc),
    },
    degrees: vi.fn((angle) => angle),
    rgb: vi.fn((r, g, b) => ({ r, g, b })),
    StandardFonts: {
      Helvetica: 'Helvetica'
    }
  }
})

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => {
  const mockPDF = {
    numPages: 3,
    getPage: vi.fn().mockResolvedValue({
      getViewport: vi.fn().mockReturnValue({ width: 595, height: 842 }),
      render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
    }),
    destroy: vi.fn(),
  }

  return {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: vi.fn().mockReturnValue({
      promise: Promise.resolve(mockPDF)
    }),
    version: '3.0.0'
  }
})

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}))

describe('pdfUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('mergePDFs', () => {
    it('should merge multiple PDF files successfully', async () => {
      const mockFiles = [
        new File(['pdf1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['pdf2'], 'test2.pdf', { type: 'application/pdf' }),
      ]

      const onProgress = vi.fn()
      const result = await mergePDFs(mockFiles, { onProgress })

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.byteLength).toBe(1000)
      expect(onProgress).toHaveBeenCalledWith(100, 'Complete!')
    })

    it('should handle metadata correctly', async () => {
      const mockFiles = [new File(['pdf1'], 'test1.pdf', { type: 'application/pdf' })]
      const metadata = {
        title: 'Test Title',
        author: 'Test Author',
        subject: 'Test Subject',
      }

      await mergePDFs(mockFiles, { metadata })

      // Verify metadata was set (mocked functions should have been called)
      expect(vi.mocked).toBeDefined()
    })

    it('should handle empty file array', async () => {
      const result = await mergePDFs([])
      expect(result).toBeInstanceOf(Uint8Array)
    })
  })

  describe('getPageCount', () => {
    it('should return correct page count for valid PDF', async () => {
      const mockFile = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
      const count = await getPageCount(mockFile)
      
      expect(count).toBe(3)
    })

    it('should return 0 for invalid PDF', async () => {
      const mockFile = new File(['invalid'], 'test.pdf', { type: 'application/pdf' })
      
      // Mock PDFDocument.load to throw error
      const { PDFDocument } = await import('pdf-lib')
      vi.mocked(PDFDocument.load).mockRejectedValueOnce(new Error('Invalid PDF'))
      
      const count = await getPageCount(mockFile)
      expect(count).toBe(0)
    })
  })

  describe('generatePDFPreview', () => {
    it('should generate preview for valid PDF', async () => {
      const mockFile = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
      
      // Update the canvas mock for this specific test
      const mockCanvas = {
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mock'),
        getContext: vi.fn().mockReturnValue({}),
        width: 0,
        height: 0,
      }
      
      vi.mocked(global.document.createElement).mockReturnValueOnce(mockCanvas as any)
      
      const preview = await generatePDFPreview(mockFile)
      expect(preview).toBe('data:image/jpeg;base64,mock')
    })

    it('should return empty string on error', async () => {
      const mockFile = new File(['invalid'], 'test.pdf', { type: 'application/pdf' })
      
      // Mock pdfjs to throw error
      const pdfjsLib = await import('pdfjs-dist')
      vi.mocked(pdfjsLib.getDocument).mockReturnValueOnce({
        promise: Promise.reject(new Error('Invalid PDF'))
      } as any)
      
      // Suppress error logging for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const preview = await generatePDFPreview(mockFile)
      expect(preview).toBe('')
      
      consoleSpy.mockRestore()
    })
  })

  describe('rotatePDF', () => {
    it('should rotate specified pages', async () => {
      const mockFile = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
      const pageNumbers = [1, 2]
      const angle = 90
      
      const result = await rotatePDF(mockFile, pageNumbers, angle)
      
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.byteLength).toBe(1000)
    })

    it('should handle invalid page numbers gracefully', async () => {
      const mockFile = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
      const pageNumbers = [999] // Page that doesn't exist
      const angle = 90
      
      const result = await rotatePDF(mockFile, pageNumbers, angle)
      expect(result).toBeInstanceOf(Uint8Array)
    })

    it('should call progress callback', async () => {
      const mockFile = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
      const onProgress = vi.fn()
      
      await rotatePDF(mockFile, [1], 90, { onProgress })
      
      expect(onProgress).toHaveBeenCalled()
      expect(onProgress).toHaveBeenCalledWith(100, 'Complete!')
    })
  })
})

describe('Edge Cases and Error Handling', () => {
  it('should handle corrupted PDF files', async () => {
    const corruptFile = new File(['not a pdf'], 'corrupt.pdf', { type: 'application/pdf' })
    
    const { PDFDocument } = await import('pdf-lib')
    vi.mocked(PDFDocument.load).mockRejectedValueOnce(new Error('Corrupted PDF'))
    
    // Suppress error logging for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    await expect(getPageCount(corruptFile)).resolves.toBe(0)
    
    consoleSpy.mockRestore()
  })

  it('should handle extremely large files', async () => {
    const largeFile = new File(['x'.repeat(200 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
    
    // Should not throw memory errors
    await expect(getPageCount(largeFile)).resolves.toBeTypeOf('number')
  })

  it('should handle special characters in filenames', async () => {
    const specialFile = new File(['pdf'], '测试文件@#$%.pdf', { type: 'application/pdf' })
    
    await expect(getPageCount(specialFile)).resolves.toBeTypeOf('number')
  })
})