import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Shield, PrivacyIcon } from './Icons';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center space-x-2">
              <FileText className="w-8 h-8 text-primary-600" />
              <span className="text-2xl font-bold text-gray-900">PDF Toolbox</span>
            </Link>
            
            {!isHome && (
              <nav className="flex items-center space-x-4">
                <Link 
                  to="/" 
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="Go to home page"
                >
                  <Home className="w-4 h-4" />
                  <span>All Tools</span>
                </Link>
              </nav>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="mt-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Shield className="w-4 h-4" />
              <span>All processing happens locally in your browser</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <PrivacyIcon className="w-4 h-4" />
              <span>No files uploaded • No data stored • 100% private</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}