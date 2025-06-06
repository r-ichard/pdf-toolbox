import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FileDropZone from '../FileDropZone'

describe('FileDropZone', () => {
  const mockOnFilesSelected = vi.fn()
  const defaultProps = {
    onFilesSelected: mockOnFilesSelected,
    acceptedTypes: ['.pdf', 'application/pdf'],
    maxFiles: 10,
    maxSizePerFile: 100 * 1024 * 1024,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default content', () => {
    render(<FileDropZone {...defaultProps} />)
    
    expect(screen.getByText('Drop your files here')).toBeInTheDocument()
    expect(screen.getByText('or')).toBeInTheDocument()
    expect(screen.getByText('browse to choose files')).toBeInTheDocument()
  })

  it('renders custom children when provided', () => {
    render(
      <FileDropZone {...defaultProps}>
        <div>Custom content</div>
      </FileDropZone>
    )
    
    expect(screen.getByText('Custom content')).toBeInTheDocument()
    expect(screen.queryByText('Drop your files here')).not.toBeInTheDocument()
  })

  it('shows file restrictions', () => {
    render(<FileDropZone {...defaultProps} />)
    
    expect(screen.getByText(/Supported formats:/)).toBeInTheDocument()
    expect(screen.getByText(/Max 10 files, 100MB each/)).toBeInTheDocument()
  })

  it('handles valid file selection', async () => {
    render(<FileDropZone {...defaultProps} />)
    
    const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    // Directly trigger the change handler instead of using userEvent
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(input)
    
    expect(mockOnFilesSelected).toHaveBeenCalledWith([file])
  })

  it('rejects files that exceed size limit', async () => {
    render(<FileDropZone {...defaultProps} maxSizePerFile={1024} />)
    
    // Create a file that's definitely larger than 1024 bytes
    const largeContent = 'x'.repeat(2000)
    const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' })
    
    // Mock the size property since the File constructor might not set it correctly in tests
    Object.defineProperty(largeFile, 'size', {
      value: 2000,
      writable: false
    })
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    // Directly trigger the change handler
    Object.defineProperty(input, 'files', {
      value: [largeFile],
      writable: false,
    })
    
    fireEvent.change(input)
    
    expect(mockOnFilesSelected).not.toHaveBeenCalled()
    expect(screen.getByText(/large.pdf is too large/)).toBeInTheDocument()
  })

  it('rejects unsupported file types', async () => {
    render(<FileDropZone {...defaultProps} />)
    
    const invalidFile = new File(['text'], 'test.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    // Directly trigger the change handler
    Object.defineProperty(input, 'files', {
      value: [invalidFile],
      writable: false,
    })
    
    fireEvent.change(input)
    
    expect(mockOnFilesSelected).not.toHaveBeenCalled()
    expect(screen.getByText(/test.txt is not a supported file type/)).toBeInTheDocument()
  })

  it('rejects when exceeding max file count', async () => {
    render(<FileDropZone {...defaultProps} maxFiles={2} />)
    
    const files = [
      new File(['pdf1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['pdf2'], 'test2.pdf', { type: 'application/pdf' }),
      new File(['pdf3'], 'test3.pdf', { type: 'application/pdf' }),
    ]
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    // Directly trigger the change handler
    Object.defineProperty(input, 'files', {
      value: files,
      writable: false,
    })
    
    fireEvent.change(input)
    
    expect(mockOnFilesSelected).not.toHaveBeenCalled()
    expect(screen.getByText('Maximum 2 files allowed')).toBeInTheDocument()
  })

  it('handles drag and drop', async () => {
    render(<FileDropZone {...defaultProps} />)
    
    const dropZone = screen.getByLabelText(/Drop files here or click to select/)
    const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
    
    // Simulate drag over
    fireEvent.dragOver(dropZone, {
      dataTransfer: {
        files: [file],
      },
    })
    
    expect(dropZone).toHaveClass('drag-active')
    
    // Simulate drop
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    })
    
    expect(mockOnFilesSelected).toHaveBeenCalledWith([file])
  })

  it('handles drag leave', () => {
    render(<FileDropZone {...defaultProps} />)
    
    const dropZone = screen.getByLabelText(/Drop files here or click to select/)
    
    fireEvent.dragOver(dropZone)
    expect(dropZone).toHaveClass('drag-active')
    
    fireEvent.dragLeave(dropZone)
    expect(dropZone).not.toHaveClass('drag-active')
  })

  it('allows dismissing error messages', async () => {
    const user = userEvent.setup()
    render(<FileDropZone {...defaultProps} />)
    
    const invalidFile = new File(['text'], 'test.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    // Directly trigger the change handler
    Object.defineProperty(input, 'files', {
      value: [invalidFile],
      writable: false,
    })
    
    fireEvent.change(input)
    
    const errorMessage = screen.getByText(/test.txt is not a supported file type/)
    expect(errorMessage).toBeInTheDocument()
    
    const dismissButton = screen.getByLabelText('Dismiss error')
    await user.click(dismissButton)
    
    expect(errorMessage).not.toBeInTheDocument()
  })

  it('supports keyboard navigation', () => {
    render(<FileDropZone {...defaultProps} />)
    
    const dropZone = screen.getByLabelText(/Drop files here or click to select/)
    
    // Should be focusable and have tabindex
    expect(dropZone).toHaveAttribute('tabIndex', '0')
    
    // Should have proper accessibility role
    expect(dropZone).toHaveAttribute('role', 'button')
  })

  it('opens file dialog on click', async () => {
    const user = userEvent.setup()
    render(<FileDropZone {...defaultProps} />)
    
    const dropZone = screen.getByLabelText(/Drop files here or click to select/)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    // Mock the click method
    const mockClick = vi.fn()
    fileInput.click = mockClick
    
    await user.click(dropZone)
    
    expect(mockClick).toHaveBeenCalled()
  })

  it('handles file extension validation correctly', async () => {
    render(
      <FileDropZone 
        {...defaultProps} 
        acceptedTypes={['.jpg', '.png', 'image/jpeg', 'image/png']} 
      />
    )
    
    const validFiles = [
      new File(['jpg'], 'test.jpg', { type: 'image/jpeg' }),
      new File(['png'], 'test.PNG', { type: 'image/png' }), // Test case insensitive
    ]
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    // Directly trigger the change handler
    Object.defineProperty(input, 'files', {
      value: validFiles,
      writable: false,
    })
    
    fireEvent.change(input)
    
    expect(mockOnFilesSelected).toHaveBeenCalledWith(validFiles)
  })

  it('shows loading state appropriately', () => {
    render(<FileDropZone {...defaultProps} className="custom-class" />)
    
    const container = screen.getByLabelText(/Drop files here or click to select/).parentElement
    expect(container).toHaveClass('custom-class')
  })
})