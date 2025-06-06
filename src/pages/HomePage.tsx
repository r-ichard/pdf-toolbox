import { Link } from 'react-router-dom';
import { Tool } from '@/types';
import { 
  Merge, Split, Compress, Image, Rotate, Organize, 
  Watermark, Lock, Unlock, InfoIcon 
} from '@/components/Icons';

const tools: Tool[] = [
  {
    id: 'merge',
    name: 'Merge PDFs',
    description: 'Combine multiple PDF files into one document',
    icon: 'merge',
    path: '/merge',
    category: 'basic'
  },
  {
    id: 'split',
    name: 'Split PDF',
    description: 'Divide a PDF into separate pages or sections',
    icon: 'split',
    path: '/split',
    category: 'basic'
  },
  {
    id: 'compress',
    name: 'Compress PDF',
    description: 'Reduce PDF file size while maintaining quality',
    icon: 'compress',
    path: '/compress',
    category: 'basic'
  },
  {
    id: 'pdf-to-image',
    name: 'PDF to Images',
    description: 'Convert PDF pages to JPG or PNG images',
    icon: 'image',
    path: '/pdf-to-image',
    category: 'basic'
  },
  {
    id: 'image-to-pdf',
    name: 'Images to PDF',
    description: 'Create a PDF from multiple image files',
    icon: 'image',
    path: '/image-to-pdf',
    category: 'basic'
  },
  {
    id: 'rotate',
    name: 'Rotate PDF',
    description: 'Rotate pages in your PDF document',
    icon: 'rotate',
    path: '/rotate',
    category: 'basic'
  },
  {
    id: 'organize',
    name: 'Organize Pages',
    description: 'Reorder, duplicate, or delete PDF pages',
    icon: 'organize',
    path: '/organize',
    category: 'advanced'
  },
  {
    id: 'watermark',
    name: 'Add Watermark',
    description: 'Add text or image watermarks to your PDF',
    icon: 'watermark',
    path: '/watermark',
    category: 'advanced'
  },
  {
    id: 'password-protect',
    name: 'Password Protect',
    description: 'Add password protection and permissions to PDF',
    icon: 'lock',
    path: '/password-protect',
    category: 'advanced'
  },
  {
    id: 'password-remove',
    name: 'Remove Password',
    description: 'Remove password protection from PDF files',
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
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Free PDF Tools
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Professional PDF tools that work entirely in your browser. 
          No uploads, no accounts, complete privacy.
        </p>

        <div className="flex items-center justify-center space-x-2 bg-blue-50 text-blue-800 px-4 py-3 rounded-lg inline-flex">
          <InfoIcon className="w-5 h-5" />
          <span className="text-sm font-medium">
            All processing happens locally on your device - your files never leave your browser
          </span>
        </div>
      </div>
      <div className="bg-gray-100 rounded-xl p-8 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Why choose our PDF tools?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900">100% Secure</h4>
            <p className="text-sm text-gray-600">All processing happens in your browser</p>
          </div>
          <div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900">Lightning Fast</h4>
            <p className="text-sm text-gray-600">No uploads or downloads needed</p>
          </div>
          <div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900">No Limits</h4>
            <p className="text-sm text-gray-600">Process as many files as you need</p>
          </div>
        </div>
      </div>
      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Essential Tools</h2>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Advanced Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advancedTools.map((tool) => {
              const IconComponent = iconMap[tool.icon as keyof typeof iconMap];
              return (
                <ToolCard key={tool.id} tool={tool} Icon={IconComponent} />
              );
            })}
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