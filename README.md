# PDF Toolbox Web

A modern, privacy-focused PDF toolbox that runs entirely in your browser. No uploads, no accounts, complete privacy.

## Features

### ✅ Implemented
- **PDF Merge**: Combine multiple PDF files into one document
- **Responsive Design**: Works on desktop and mobile devices
- **Local Processing**: All PDF operations happen in your browser
- **Drag & Drop**: Intuitive file handling
- **Progress Tracking**: Real-time feedback during processing
- **Error Handling**: Graceful error handling with helpful messages

### 🔄 Coming Soon
- PDF Split: Divide PDFs into separate pages or sections
- PDF Compression: Reduce file size while maintaining quality
- PDF to Images: Convert PDF pages to JPG/PNG
- Images to PDF: Create PDFs from image files
- PDF Rotation: Rotate pages in your PDF
- Page Organizer: Reorder, duplicate, or delete pages
- Watermarking: Add text or image watermarks
- Password Protection: Add/remove password protection

## Technology Stack

- **React 18** with TypeScript for the UI
- **PDF-lib** for PDF manipulation
- **PDF.js** for PDF rendering and preview
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **JSZip** for creating downloadable archives

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pdf-toolbox-web
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

### PDF Merge
1. Navigate to the Merge PDFs tool
2. Drag and drop PDF files or click to select
3. Reorder files by dragging them in the preview
4. Optionally add metadata (title, author, subject)
5. Click "Merge & Download" to generate your merged PDF

## Privacy & Security

- **100% Client-Side**: All processing happens in your browser
- **No Uploads**: Files never leave your device
- **No Tracking**: No analytics or data collection
- **No Accounts**: Use anonymously without registration

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Testing

The project includes comprehensive testing with unit tests, integration tests, and end-to-end tests.

### Quick Commands
```bash
# Run all tests
npm run test:all

# Run with detailed reporting
npm run test:all:detailed

# Run with coverage
npm run test:all:with-coverage

# Run individual test suites
npm run test:unit          # Unit tests only
npm run test:e2e           # E2E tests only
npm run lint               # Code quality checks
```

### Comprehensive Test Runner
For detailed test execution with progress reporting:
```bash
# Cross-platform Node.js runner
node scripts/test-all.js

# With verbose output for debugging
node scripts/test-all.js --verbose

# With coverage report
node scripts/test-all.js --coverage
```

The test runner executes these phases:
1. **Code Quality** - ESLint checks
2. **TypeScript** - Type checking  
3. **Unit Tests** - Component and utility tests
4. **Build** - Production build verification
5. **E2E Tests** - Full workflow testing with Playwright

See `scripts/README.md` for detailed testing documentation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. **Run tests**: `npm run test:all`
5. Add tests if applicable
6. Submit a pull request

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── FileDropZone.tsx
│   ├── FilePreview.tsx
│   ├── ProgressBar.tsx
│   └── ...
├── pages/              # Page components
│   ├── HomePage.tsx
│   ├── MergePage.tsx
│   └── ...
├── utils/              # Utility functions
│   ├── pdfUtils.ts
│   └── imageUtils.ts
├── types/              # TypeScript type definitions
└── App.tsx
```

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.