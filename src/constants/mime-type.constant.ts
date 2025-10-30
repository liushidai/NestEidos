/**
 * 支持的图片MIME类型枚举
 */
export enum ImageMimeType {
  JPEG = 'image/jpeg',
  JPG = 'image/jpg',
  PNG = 'image/png',
  GIF = 'image/gif',
  WEBP = 'image/webp',
  AVIF = 'image/avif',
  TIFF = 'image/tiff',
  BMP = 'image/bmp',
  SVG = 'image/svg+xml',
  HEIF = 'image/heif',
  HEIC = 'image/heic'
}

/**
 * 支持的图片MIME类型列表
 */
export const SUPPORTED_MIME_TYPES = Object.values(ImageMimeType);

/**
 * 验证MIME类型是否支持
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType as ImageMimeType);
}

/**
 * 根据MIME类型获取文件扩展名
 */
export function getFileExtension(mimeType: ImageMimeType): string {
  const extensionMap: Record<ImageMimeType, string> = {
    [ImageMimeType.JPEG]: 'jpg',
    [ImageMimeType.JPG]: 'jpg',
    [ImageMimeType.PNG]: 'png',
    [ImageMimeType.GIF]: 'gif',
    [ImageMimeType.WEBP]: 'webp',
    [ImageMimeType.AVIF]: 'avif',
    [ImageMimeType.TIFF]: 'tiff',
    [ImageMimeType.BMP]: 'bmp',
    [ImageMimeType.SVG]: 'svg',
    [ImageMimeType.HEIF]: 'heif',
    [ImageMimeType.HEIC]: 'heic'
  };

  return extensionMap[mimeType] || 'jpg';
}