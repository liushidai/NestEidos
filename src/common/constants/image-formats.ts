/**
 * 图片格式注册表
 * 集中管理所有支持的图片格式及其 MIME 类型和扩展名
 */

export interface ImageFormat {
  /** 标准MIME类型 */
  mime: string;
  /** 所有合法的MIME别名 */
  mimeAliases: string[];
  /** 常见的文件扩展名 */
  extensions: string[];
  /** 可选元信息 */
  meta?: {
    /** 是否为位图格式 */
    isBitmap?: boolean;
    /** 是否支持透明度 */
    supportsTransparency?: boolean;
    /** 是否为矢量图 */
    isVector?: boolean;
    /** 格式描述 */
    description?: string;
  };
}

/**
 * 图片格式注册表
 */
export const IMAGE_FORMATS: Record<string, ImageFormat> = {
  JPEG: {
    mime: 'image/jpeg',
    mimeAliases: ['image/jpeg', 'image/jpg'],
    extensions: ['jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp'],
    meta: {
      isBitmap: true,
      supportsTransparency: false,
      description: 'JPEG 图像格式',
    },
  },
  PNG: {
    mime: 'image/png',
    mimeAliases: ['image/png'],
    extensions: ['png'],
    meta: {
      isBitmap: true,
      supportsTransparency: true,
      description: 'PNG 图像格式',
    },
  },
  GIF: {
    mime: 'image/gif',
    mimeAliases: ['image/gif'],
    extensions: ['gif'],
    meta: {
      isBitmap: true,
      supportsTransparency: true,
      description: 'GIF 图像格式',
    },
  },
  WEBP: {
    mime: 'image/webp',
    mimeAliases: ['image/webp'],
    extensions: ['webp'],
    meta: {
      isBitmap: true,
      supportsTransparency: true,
      description: 'WebP 图像格式',
    },
  },
  AVIF: {
    mime: 'image/avif',
    mimeAliases: ['image/avif'],
    extensions: ['avif', 'avifs'],
    meta: {
      isBitmap: true,
      supportsTransparency: true,
      description: 'AVIF 图像格式',
    },
  },
  BMP: {
    mime: 'image/bmp',
    mimeAliases: ['image/bmp', 'image/x-ms-bmp'],
    extensions: ['bmp', 'dib'],
    meta: {
      isBitmap: true,
      supportsTransparency: false,
      description: 'BMP 图像格式',
    },
  },
  SVG: {
    mime: 'image/svg+xml',
    mimeAliases: ['image/svg+xml'],
    extensions: ['svg', 'svgz'],
    meta: {
      isVector: true,
      supportsTransparency: true,
      description: 'SVG 矢量图形格式',
    },
  },
  HEIF: {
    mime: 'image/heif',
    mimeAliases: ['image/heif'],
    extensions: ['heif', 'hif'],
    meta: {
      isBitmap: true,
      supportsTransparency: true,
      description: 'HEIF 图像格式',
    },
  },
  HEIC: {
    mime: 'image/heic',
    mimeAliases: ['image/heic'],
    extensions: ['heic', 'heifs'],
    meta: {
      isBitmap: true,
      supportsTransparency: true,
      description: 'HEIC 图像格式',
    },
  },
};

/**
 * 所有允许的图片 MIME 类型（扁平化数组）
 */
export const ALLOWED_IMAGE_MIME_TYPES: string[] = Object.values(
  IMAGE_FORMATS,
).flatMap((format) => format.mimeAliases);

/**
 * 支持的文件扩展名集合
 */
export const ALLOWED_IMAGE_EXTENSIONS: Set<string> = new Set(
  Object.values(IMAGE_FORMATS)
    .flatMap((format) => format.extensions)
    .map((ext) => ext.toLowerCase()),
);

/**
 * MIME 类型到图片格式的映射
 */
export const MIME_TO_FORMAT: Map<string, string> = new Map(
  Object.entries(IMAGE_FORMATS).flatMap(([formatName, format]) =>
    format.mimeAliases.map((mime) => [mime, formatName]),
  ),
);

/**
 * 扩展名到图片格式的映射
 */
export const EXTENSION_TO_FORMAT: Map<string, string> = new Map(
  Object.entries(IMAGE_FORMATS).flatMap(([formatName, format]) =>
    format.extensions.map((ext) => [ext.toLowerCase(), formatName]),
  ),
);

/**
 * 检查 MIME 类型是否被支持
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return ALLOWED_IMAGE_MIME_TYPES.includes(mimeType);
}

/**
 * 检查文件扩展名是否被支持
 */
export function isSupportedExtension(extension: string): boolean {
  return ALLOWED_IMAGE_EXTENSIONS.has(extension.toLowerCase());
}

/**
 * 获取 MIME 类型对应的图片格式信息
 */
export function getImageFormatByMimeType(
  mimeType: string,
): ImageFormat | undefined {
  const formatName = MIME_TO_FORMAT.get(mimeType);
  return formatName ? IMAGE_FORMATS[formatName] : undefined;
}

/**
 * 获取扩展名对应的图片格式信息
 */
export function getImageFormatByExtension(
  extension: string,
): ImageFormat | undefined {
  const formatName = EXTENSION_TO_FORMAT.get(extension.toLowerCase());
  return formatName ? IMAGE_FORMATS[formatName] : undefined;
}

/**
 * 检查 MIME 类型与扩展名是否匹配
 */
export function isMimeTypeMatchingExtension(
  mimeType: string,
  extension: string,
): boolean {
  const formatByMime = getImageFormatByMimeType(mimeType);
  const formatByExt = getImageFormatByExtension(extension);

  return formatByMime && formatByExt
    ? formatByMime.mime === formatByExt.mime
    : false;
}

/**
 * 获取所有位图格式的 MIME 类型
 */
export function getBitmapMimeTypes(): string[] {
  return Object.values(IMAGE_FORMATS)
    .filter((format) => format.meta?.isBitmap)
    .flatMap((format) => format.mimeAliases);
}

/**
 * 获取所有矢量图格式的 MIME 类型
 */
export function getVectorMimeTypes(): string[] {
  return Object.values(IMAGE_FORMATS)
    .filter((format) => format.meta?.isVector)
    .flatMap((format) => format.mimeAliases);
}

/**
 * 获取支持透明度的格式 MIME 类型
 */
export function getTransparentMimeTypes(): string[] {
  return Object.values(IMAGE_FORMATS)
    .filter((format) => format.meta?.supportsTransparency)
    .flatMap((format) => format.mimeAliases);
}
