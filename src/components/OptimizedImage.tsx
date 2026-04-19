import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  quality?: number;
  className?: string;
  fallback?: React.ReactNode;
  /** Pass true for above-the-fold images to boost LCP score */
  priority?: boolean;
}

export const OptimizedImage = ({
  src,
  alt,
  width,
  quality = 80,
  className,
  fallback,
  priority = false,
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Default to 400px if no width provided to ensure we don't load original high-res images by accident
  const optimizedSrc = getOptimizedImageUrl(src, width || 400, quality);

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <Skeleton className="absolute inset-0" />
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        // Use lowercase fetchpriority — React doesn't support the camelCase fetchPriority variant
        {...(priority ? { fetchpriority: 'high' } : { fetchpriority: 'low' })}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
      />
    </div>
  );
};
