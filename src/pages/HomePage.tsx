import { Link } from 'react-router-dom';
import { Tool } from '@/types';
import { 
  Merge, Split, Compress, Image, Rotate, Organize, 
  Watermark, Lock, Unlock, InfoIcon 
} from '@/components/Icons';

const tools: Tool[] = [
  {
    id: 'merge',
    name: 'Merge PDFs Online',
    description: 'Combine multiple PDF files into one document instantly. Free PDF merger tool that works in your browser.',
    icon: 'merge',
    path: '/merge',
    category: 'basic'
  },
  {
    id: 'split',
    name: 'Split PDF Online',
    description: 'Extract pages or divide large PDF files into smaller documents. Free PDF splitter with no limits.',
    icon: 'split',
    path: '/split',
    category: 'basic'
  },
  {
    id: 'compress',
    name: 'Compress PDF Online',
    description: 'Reduce PDF file size while maintaining quality. Free PDF compressor for smaller, faster files.',
    icon: 'compress',
    path: '/compress',
    category: 'basic'
  },
  {
    id: 'pdf-to-image',
    name: 'PDF to JPG/PNG',
    description: 'Convert PDF pages to high-quality JPG or PNG images. Export PDF as images online for free.',
    icon: 'image',
    path: '/pdf-to-image',
    category: 'basic'
  },
  {
    id: 'image-to-pdf',
    name: 'Images to PDF',
    description: 'Create PDF documents from JPG, PNG, or other image files. Free image to PDF converter online.',
    icon: 'image',
    path: '/image-to-pdf',
    category: 'basic'
  },
  {
    id: 'rotate',
    name: 'Rotate PDF Pages',
    description: 'Rotate PDF pages 90°, 180°, or 270° to fix orientation. Free online PDF page rotator.',
    icon: 'rotate',
    path: '/rotate',
    category: 'basic'
  },
  {
    id: 'organize',
    name: 'Organize PDF Pages',
    description: 'Reorder, duplicate, or delete PDF pages. Drag and drop PDF page organizer tool.',
    icon: 'organize',
    path: '/organize',
    category: 'advanced'
  },
  {
    id: 'watermark',
    name: 'Add PDF Watermark',
    description: 'Add text or image watermarks to PDF documents. Protect your PDFs with custom watermarks.',
    icon: 'watermark',
    path: '/watermark',
    category: 'advanced'
  },
  {
    id: 'password-protect',
    name: 'Password Protect PDF',
    description: 'Encrypt PDF files with password protection. Secure sensitive documents with user permissions.',
    icon: 'lock',
    path: '/password-protect',
    category: 'advanced'
  },
  {
    id: 'password-remove',
    name: 'Remove PDF Password',
    description: 'Unlock password-protected PDFs and remove encryption. Decrypt PDFs online safely.',
    icon: 'unlock',
    path: '/password-remove',
    category: 'advanced'
  }
];

const iconMap = {
  merge: Merge,
  split: Split,
  compress: Compress,
  image: Image,
  rotate: Rotate,
  organize: Organize,
  watermark: Watermark,
  lock: Lock,
  unlock: Unlock
};

export default function HomePage() {
  const basicTools = tools.filter(tool => tool.category === 'basic');
  const advancedTools = tools.filter(tool => tool.category === 'advanced');

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Free Online PDF Tools - Edit, Convert & Manage PDFs
        </h1>
        <p className="text-xl text-gray-600 max-w-4xl mx-auto mb-8">
          Professional PDF editor and converter tools that work entirely in your browser. 
          Merge, split, compress, convert, and organize PDF files without uploading. 
          100% free, secure, and private.
        </p>

        <div className="flex items-center justify-center space-x-2 bg-blue-50 text-blue-800 px-6 py-4 rounded-lg inline-flex mb-8">
          <InfoIcon className="w-5 h-5" />
          <span className="text-sm font-medium">
            🔒 All PDF processing happens locally on your device - your files never leave your browser
          </span>
        </div>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <Link 
            to="/merge" 
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Merge PDFs Now →
          </Link>
          <Link 
            to="/split" 
            className="border-2 border-primary-600 text-primary-600 hover:bg-primary-50 px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Split PDF Files
          </Link>
        </div>
      </header>
      {/* Features Section */}
      <section className="bg-gray-100 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Why Choose Our Online PDF Editor?
        </h2>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          The best free PDF tools available online. No software installation required - edit PDFs directly in your web browser.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
          <article>
            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">100% Secure & Private</h3>
            <p className="text-gray-600">
              Your PDF files never leave your browser. All processing happens locally on your device, 
              ensuring complete privacy and security for your documents.
            </p>
          </article>
          <article>
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lightning Fast Processing</h3>
            <p className="text-gray-600">
              No uploads or downloads needed. Instant PDF editing, merging, and conversion. 
              Works offline once loaded - perfect for sensitive documents.
            </p>
          </article>
          <article>
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unlimited & Free</h3>
            <p className="text-gray-600">
              Process unlimited PDF files with no file size restrictions. No account required, 
              no watermarks, completely free PDF tools for everyone.
            </p>
          </article>
        </div>
      </section>
      {/* PDF Tools Section */}
      <div className="space-y-16">
        <section>
          <header className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Essential PDF Tools</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Most popular PDF tools for everyday document management. Merge PDFs, split large files, 
              compress documents, and convert between formats - all in your browser.
            </p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {basicTools.map((tool) => {
              const IconComponent = iconMap[tool.icon as keyof typeof iconMap];
              return (
                <ToolCard key={tool.id} tool={tool} Icon={IconComponent} />
              );
            })}
          </div>
        </section>

        <section>
          <header className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Advanced PDF Tools</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Professional PDF editing features including page organization, watermarks, 
              and password protection. Perfect for business documents and sensitive files.
            </p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advancedTools.map((tool) => {
              const IconComponent = iconMap[tool.icon as keyof typeof iconMap];
              return (
                <ToolCard key={tool.id} tool={tool} Icon={IconComponent} />
              );
            })}
          </div>
        </section>
        
        {/* SEO Content Section */}
        <section className="bg-white rounded-xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">About Our Free PDF Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-600">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">How Our PDF Editor Works</h3>
              <p className="mb-4">
                Our online PDF tools use advanced JavaScript libraries that run entirely in your web browser. 
                When you upload a PDF file, it's processed locally on your device without ever being sent to our servers.
              </p>
              <p>
                This approach ensures maximum security and privacy while providing fast, reliable PDF editing capabilities. 
                No internet connection is required once the tools are loaded.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Supported PDF Operations</h3>
              <ul className="space-y-2">
                <li>• <strong>Merge PDF files</strong> - Combine multiple PDFs into one document</li>
                <li>• <strong>Split PDF documents</strong> - Extract pages or divide large files</li>
                <li>• <strong>Compress PDF files</strong> - Reduce file size without quality loss</li>
                <li>• <strong>Convert PDF to images</strong> - Export pages as JPG or PNG</li>
                <li>• <strong>Convert images to PDF</strong> - Create PDFs from photos</li>
                <li>• <strong>Rotate PDF pages</strong> - Fix orientation issues</li>
                <li>• <strong>Add watermarks</strong> - Protect documents with text or images</li>
                <li>• <strong>Password protection</strong> - Secure sensitive documents</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Why Use Browser-Based PDF Tools?</h3>
            <p className="text-gray-600 mb-4">
              Traditional PDF editing software requires installation and often comes with subscription fees. 
              Our web-based PDF tools offer the same functionality without downloads, installations, or costs.
            </p>
            <p className="text-gray-600">
              Whether you need to merge contracts, split reports, compress presentations, or convert images to PDF, 
              our tools provide professional-grade results instantly. Perfect for students, professionals, and businesses 
              who need reliable PDF editing without the overhead of desktop software.
            </p>
          </div>
        </section>
      </div>


    </div>
  );
}

interface ToolCardProps {
  tool: Tool;
  Icon: React.ComponentType<{ className?: string }>;
}

function ToolCard({ tool, Icon }: ToolCardProps) {
  return (
    <Link
      to={tool.path}
      className="card hover:shadow-md transition-shadow group"
      aria-label={`${tool.name}: ${tool.description}`}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
            <Icon className="w-6 h-6 text-primary-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
            {tool.name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {tool.description}
          </p>
        </div>
      </div>
    </Link>
  );
}