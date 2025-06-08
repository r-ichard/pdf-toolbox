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

## Deployment

This application supports multiple deployment methods for different environments and requirements.

### Cloud Platforms (Recommended)

#### Netlify (Static Hosting)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy)

1. **Automatic Deployment**:
   - Connect your GitHub repository to Netlify
   - Build settings are pre-configured in `netlify.toml`
   - Automatic deployments on every push to main branch

2. **Manual Deployment**:
   ```bash
   npm run build
   # Upload dist/ folder to Netlify
   ```

#### Vercel (Static Hosting)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. **Automatic Deployment**:
   - Import your repository in Vercel dashboard
   - Configuration automatically detected via `vercel.json`
   - Zero-config deployment with preview environments

2. **CLI Deployment**:
   ```bash
   npm i -g vercel
   vercel --prod
   ```

### Self-Hosted Deployment

#### Docker (Production Ready)

**Quick Start:**
```bash
# Build and run
docker build -t pdf-toolbox .
docker run -p 3000:80 pdf-toolbox
```

**Docker Compose (with health checks):**
```bash
docker-compose up -d
```

**Features:**
- Multi-stage build for optimal image size
- Nginx with security headers
- Health check endpoint at `/health`
- Static asset caching
- SPA routing support

#### Manual Server Deployment

**Build for production:**
```bash
npm install
npm run build
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Apache Configuration (.htaccess):**
```apache
RewriteEngine On
RewriteBase /

# Handle client-side routing
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"

# Cache static assets
<filesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
</filesMatch>
```

### Environment-Specific Configurations

#### Development
```bash
npm run dev
# Runs on http://localhost:5173
```

#### Staging/Preview
```bash
npm run build
npm run preview
# Runs on http://localhost:4173
```

#### Production Requirements

**System Requirements:**
- Node.js 18+ (for building)
- Modern web server (Nginx, Apache, or CDN)
- HTTPS certificate (recommended)

**Performance Optimizations:**
- Static asset compression (gzip/brotli)
- CDN integration
- HTTP/2 support
- Browser caching headers

**Security Considerations:**
- Content Security Policy (CSP)
- HTTPS enforcement
- Security headers (included in configs)
- Regular dependency updates

### CI/CD Pipeline

**GitHub Actions Example:**
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run build
      - name: Deploy to production
        # Add your deployment steps here
```

### Monitoring & Health Checks

**Health Check Endpoints:**
- Docker: `http://localhost:3000/health`
- Manual: Configure your web server

**Monitoring Recommendations:**
- Uptime monitoring
- Performance metrics
- Error tracking
- User analytics (optional, privacy-respecting)

### Troubleshooting

**Common Issues:**
- **SPA Routing**: Ensure your server serves `index.html` for unknown routes
- **CORS Issues**: Not applicable (client-side only application)
- **Build Failures**: Check Node.js version compatibility
- **Memory Issues**: Increase Node.js heap size: `NODE_OPTIONS="--max-old-space-size=4096"`

**Performance Issues:**
- Enable compression (gzip/brotli)
- Implement proper caching headers
- Use a CDN for static assets
- Monitor bundle size with `npm run build`

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.