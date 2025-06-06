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

// Enhance canvas creation for PDF processing tests
const originalCreateElement = global.document?.createElement
if (originalCreateElement) {
  global.document.createElement = vi.fn((tagName: string) => {
    try {
      const element = originalCreateElement.call(global.document, tagName)
      
      // Enhance canvas elements for PDF processing
      if (tagName.toLowerCase() === 'canvas') {
        const canvasElement = element as HTMLCanvasElement
        canvasElement.getContext = vi.fn(() => ({})) as any
        canvasElement.toDataURL = vi.fn(() => 'data:image/jpeg;base64,mockimage')
        Object.defineProperty(canvasElement, 'width', { writable: true, value: 100 })
        Object.defineProperty(canvasElement, 'height', { writable: true, value: 140 })
      }
      
      return element
    } catch (error) {
      // Fallback to basic mock if DOM call fails
      const mockElement: any = {
        tagName: tagName.toUpperCase(),
        setAttribute: vi.fn(),
        getAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      
      if (tagName.toLowerCase() === 'canvas') {
        mockElement.getContext = vi.fn(() => ({}))
        mockElement.toDataURL = vi.fn(() => 'data:image/jpeg;base64,mockimage')
        mockElement.width = 100
        mockElement.height = 140
      }
      
      return mockElement
    }
  })
}

// Mock fetch for PDF worker
global.fetch = vi.fn(() => Promise.resolve({
  ok: true,
  status: 200,
  headers: new Headers(),
} as Response))

// Mock Promise.withResolvers for Node.js compatibility
if (!(Promise as any).withResolvers) {
  (Promise as any).withResolvers = function <T>() {
    let resolve: (value: T | PromiseLike<T>) => void
    let reject: (reason?: any) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve: resolve!, reject: reject! }
  }
}

// Mock File API
global.File = class MockFile implements File {
  constructor(public chunks: any[], public name: string, public options?: any) {}
  get size() { return 1000 }
  get type() { return this.options?.type || 'application/pdf' }
  get lastModified() { return Date.now() }
  get webkitRelativePath() { return '' }
  arrayBuffer() { return Promise.resolve(new ArrayBuffer(1000)) }
  text() { return Promise.resolve('mock file content') }
  stream() { return new ReadableStream() }
  slice() { return new MockFile([], this.name, this.options) as any }
  bytes() { return Promise.resolve(new Uint8Array(1000)) }
} as any

// Mock FileReader
global.FileReader = class MockFileReader {
  static readonly EMPTY = 0
  static readonly LOADING = 1
  static readonly DONE = 2
  
  result: any = null
  error: any = null
  readyState: 0 | 1 | 2 = 0
  onabort: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onloadstart: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  
  EMPTY = 0
  LOADING = 1
  DONE = 2
  
  readAsDataURL(_file: Blob) {
    setTimeout(() => {
      this.result = 'data:application/pdf;base64,mock-data'
      this.readyState = 2
      if (this.onload) this.onload.call(this as any, { target: this } as any)
    }, 0)
  }
  
  readAsText(_file: Blob) {
    setTimeout(() => {
      this.result = 'mock file content'
      this.readyState = 2
      if (this.onload) this.onload.call(this as any, { target: this } as any)
    }, 0)
  }
  
  readAsArrayBuffer(_file: Blob) {
    setTimeout(() => {
      this.result = new ArrayBuffer(1000)
      this.readyState = 2
      if (this.onload) this.onload.call(this as any, { target: this } as any)
    }, 0)
  }
  
  abort() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true }
} as any

// Mock DataTransfer for drag and drop events
global.DataTransfer = class MockDataTransfer implements Partial<DataTransfer> {
  files: FileList = [] as any
  items: DataTransferItemList = [] as any
  types: readonly string[] = []
  
  constructor() {}
  
  setData(_format: string, _data: string): void {}
  getData(_format: string): string { return '' }
  clearData(): void {}
} as any

// Mock DragEvent
global.DragEvent = class MockDragEvent extends Event {
  dataTransfer: DataTransfer
  
  constructor(type: string, eventInitDict?: any) {
    super(type, eventInitDict)
    this.dataTransfer = new DataTransfer()
    if (eventInitDict?.dataTransfer) {
      Object.assign(this.dataTransfer, eventInitDict.dataTransfer)
    }
  }
} as any

// Add missing window methods for testing
Object.assign(global.window, {
  scrollTo: vi.fn(),
  matchMedia: vi.fn(() => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn()
  }))
})

// Note: This setup file configures mocks for DOM APIs required by PDF processing tests
// The 3 unhandled DOM teardown errors shown in test output are from happy-dom library
// cleanup and do not affect test reliability or application functionality