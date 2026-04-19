/**
 * Image optimization utilities for compression and WebP conversion
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'webp' | 'jpeg' | 'png';
}

const defaultOptions: CompressOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  outputFormat: 'webp',
};

/**
 * Compress and optionally convert an image to WebP format
 */
export const compressImage = async (
  file: File,
  options: CompressOptions = {}
): Promise<Blob> => {
  const { maxWidth, maxHeight, quality, outputFormat } = {
    ...defaultOptions,
    ...options,
  };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > maxWidth! || height > maxHeight!) {
        const ratio = Math.min(maxWidth! / width, maxHeight! / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image on canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      const mimeType = outputFormat === 'webp' 
        ? 'image/webp' 
        : outputFormat === 'jpeg' 
          ? 'image/jpeg' 
          : 'image/png';

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to JPEG if WebP isn't supported
            canvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) {
                  resolve(fallbackBlob);
                } else {
                  reject(new Error('Failed to compress image'));
                }
              },
              'image/jpeg',
              quality
            );
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Check if the browser supports WebP
 */
export const supportsWebP = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  const elem = document.createElement('canvas');
  if (elem.getContext && elem.getContext('2d')) {
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
};

/**
 * Get optimized image URL with WebP support
 * Works with ImageKit URLs to serve optimized formats
 */
export const getOptimizedImageUrl = (
  url: string,
  width?: number,
  quality: number = 80
): string => {
  if (!url) return '';

  // Check if it's an ImageKit URL
  if (url.includes('imagekit.io') || url.includes('ik.imagekit.io')) {
    const separator = url.includes('?') ? '&' : '?';
    let params = `tr=f-auto,q-${quality}`; // f-auto automatically serves WebP if supported
    if (width) {
      params += `,w-${width}`;
    }
    return `${url}${separator}${params}`;
  }

  return url;
};

/**
 * Create a File from a Blob with proper name
 */
export const blobToFile = (blob: Blob, fileName: string): File => {
  return new File([blob], fileName, { type: blob.type });
};
