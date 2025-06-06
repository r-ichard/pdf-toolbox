import { useState, useEffect, useRef } from 'react';
import { FileText } from './Icons';
import LoadingSpinner from './LoadingSpinner';

interface LazyThumbnailProps {
  src?: string;
  alt: string;
  className?: string;
  pageNumber?: number;
  showPageNumber?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export default function LazyThumbnail({
  src,
  alt,
  className = '',
  pageNumber,
  showPageNumber = false,
  onLoad,
  onError
}: LazyThumbnailProps) {
  const [isLoading, setIsLoading] = useState(!!src);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleImageLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      data-testid="lazy-thumbnail"
    >
      {/* Loading state */}
      {isLoading && isVisible && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <LoadingSpinner size="sm" />
        </div>
      )}

      {/* Error state or no src */}
      {(hasError || !src || !isVisible) && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
      )}

      {/* Image */}
      {src && isVisible && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className="w-full h-full object-contain rounded"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: isLoading || hasError ? 'none' : 'block' }}
        />
      )}

      {/* Page number overlay */}
      {showPageNumber && pageNumber && (
        <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
          {pageNumber}
        </div>
      )}
    </div>
  );
}