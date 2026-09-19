/**
 * Frontend image optimization utility.
 * Enforces requirement:
 * "todas las imágenes que se carguen en cualquier parte de la aplicación deben optimizarse
 * en el frontend antes de enviarse al servidor, conservando proporción, reduciendo dimensiones
 * excesivas cuando sea necesario y convirtiéndose a WebP con 95% de calidad, subiendo únicamente la versión optimizada."
 */

export interface OptimizedImageResult {
  file: File;
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  suggestedOrientation: 'landscape' | 'portrait';
  originalSize: number;
  optimizedSize: number;
  reductionPercentage: number;
}

export async function optimizeImage(
  fileOrBlob: File | Blob,
  options: {
    maxDimension?: number;
    quality?: number;
  } = {}
): Promise<OptimizedImageResult> {
  const { maxDimension = 3840, quality = 0.95 } = options;
  const originalSize = fileOrBlob.size;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const tempUrl = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(tempUrl);

      let { width, height } = img;

      // Downsample if exceeding maxDimension preserving aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('No se pudo inicializar el contexto del lienzo'));
      }

      // Smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert strictly to image/webp with 95% quality
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Fallo al optimizar la imagen a WebP'));
          }

          const originalName = (fileOrBlob as File).name || 'image';
          const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
          const webpFileName = `${baseName}.webp`;

          const optimizedFile = new File([blob], webpFileName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          const previewUrl = URL.createObjectURL(blob);
          const aspectRatio = width / height;
          const suggestedOrientation: 'landscape' | 'portrait' =
            width >= height ? 'landscape' : 'portrait';

          const reductionPercentage = Math.max(
            0,
            Math.round(((originalSize - blob.size) / originalSize) * 100)
          );

          resolve({
            file: optimizedFile,
            blob,
            previewUrl,
            width,
            height,
            aspectRatio,
            suggestedOrientation,
            originalSize,
            optimizedSize: blob.size,
            reductionPercentage,
          });
        },
        'image/webp',
        quality // 0.95 (95% quality)
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      reject(new Error('No se pudo cargar la imagen para optimización'));
    };

    img.src = tempUrl;
  });
}
