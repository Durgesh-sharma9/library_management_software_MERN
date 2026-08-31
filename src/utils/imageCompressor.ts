/**
 * Client-Side Image Compression Utility
 * Resizes and compresses image files using HTML5 Canvas before uploading.
 * Drastically reduces file size (e.g., 5MB-10MB camera photo -> ~80KB-180KB) while maintaining high clarity.
 */

export interface CompressionResult {
  base64: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  reductionPercentage: number;
  width: number;
  height: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 960,
    maxHeight = 1280,
    quality = 0.8,
    mimeType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const originalSizeBytes = file.size;
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file for compression.'));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data for compression.'));

      img.onload = () => {
        let { width, height } = img;

        // Calculate proportional aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context is not available.'));
          return;
        }

        // Use high quality image interpolation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to compressed Base64 data URL
        const base64 = canvas.toDataURL(mimeType, quality);

        // Compute compressed binary size approximation from Base64
        const headerIndex = base64.indexOf(',') + 1;
        const base64Data = base64.substring(headerIndex);
        const compressedSizeBytes = Math.round((base64Data.length * 3) / 4);

        const reductionPercentage =
          originalSizeBytes > compressedSizeBytes
            ? Math.round(((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100)
            : 0;

        resolve({
          base64,
          originalSizeBytes,
          compressedSizeBytes,
          reductionPercentage,
          width,
          height,
        });
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes into human readable format (e.g. 2.4 MB or 120 KB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
