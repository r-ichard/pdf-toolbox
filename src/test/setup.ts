import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock PDF.js worker
global.URL.createObjectURL = vi.fn(() => 'mocked-url')
global.URL.revokeObjectURL = vi.fn()

// Mock Canvas API for PDF rendering
global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  canvas: {
    width: 100,
    height: 140,
    toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockimage')
  },
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  resetTransform: vi.fn()
})) as any

// Mock document.createElement for canvas
global.document = {
  ...global.document,
  createElement: vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return {
        getContext: vi.fn(() => ({
          canvas: {
            width: 100,
            height: 140,
            toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockimage')
          }
        })),
        width: 100,
        height: 140,
        toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockimage')
      }
    }
    return {}
  })
} as any

// Mock File API
global.File = class MockFile {
  constructor(public chunks: any[], public name: string, public options?: any) {}
  get size() { return 1000 }
  get type() { return this.options?.type || 'application/pdf' }
  get lastModified() { return Date.now() }
  get webkitRelativePath() { return '' }
  arrayBuffer() { return Promise.resolve(new ArrayBuffer(1000)) }
  text() { return Promise.resolve('mock file content') }
  stream() { return new ReadableStream() }
  slice() { return new MockFile([], this.name, this.options) }
  bytes() { return Promise.resolve(new Uint8Array(1000)) }
} as any

// Mock FileReader
global.FileReader = class MockFileReader {
  static readonly EMPTY = 0
  static readonly LOADING = 1
  static readonly DONE = 2
  
  result: any = null
  error: any = null
  readyState: number = 0
  onload: any = null
  onerror: any = null
  
  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:application/pdf;base64,mock-data'
      this.readyState = 2
      if (this.onload) this.onload({ target: this })
    }, 0)
  }
  
  readAsText() {
    setTimeout(() => {
      this.result = 'mock file content'
      this.readyState = 2
      if (this.onload) this.onload({ target: this })
    }, 0)
  }
  
  readAsArrayBuffer() {
    setTimeout(() => {
      this.result = new ArrayBuffer(1000)
      this.readyState = 2
      if (this.onload) this.onload({ target: this })
    }, 0)
  }
} as any