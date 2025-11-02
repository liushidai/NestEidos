/**
 * 图片转换参数预设
 * 根据 doc/conversionParameter.md 中的定义
 */

// =============== JPEG 参数 ===============
export const JPEG_PRESETS = {
  general: {
    quality: 85,
    progressive: true,
    chromaSubsampling: '4:4:4',
    strip: true
  },
  highQuality: {
    quality: 95,
    progressive: true,
    chromaSubsampling: '4:2:0',
    strip: true
  },
  extremeCompression: {
    quality: 70,
    progressive: true,
    chromaSubsampling: '4:2:0',
    strip: true
  },
  uiSharp: {
    quality: 90,
    progressive: true,
    chromaSubsampling: '4:4:4',
    strip: true
  }
};

// =============== WebP 参数 ===============
export const WEBP_PRESETS = {
  general: (hasTransparency: boolean, isAnimated: boolean) => ({
    quality: 85,
    alphaQuality: hasTransparency ? 80 : undefined,
    lossless: false,
    reductionEffort: 6,      // 最高压缩 effort
    smartSubsample: true,
    animated: isAnimated
  }),
  highQuality: (hasTransparency: boolean, isAnimated: boolean) => ({
    quality: 95,
    alphaQuality: hasTransparency ? 90 : undefined,
    lossless: false,
    reductionEffort: 6,
    smartSubsample: true,
    animated: isAnimated
  }),
  extremeCompression: (hasTransparency: boolean, isAnimated: boolean) => ({
    quality: 70,
    alphaQuality: hasTransparency ? 65 : undefined,
    lossless: false,
    reductionEffort: 6,
    smartSubsample: true,
    animated: isAnimated
  }),
  uiSharp: (hasTransparency: boolean, isAnimated: boolean) => ({
    quality: 92,
    alphaQuality: hasTransparency ? 95 : undefined,
    lossless: false,
    reductionEffort: 6,
    smartSubsample: true,
    animated: isAnimated
  })
};

// =============== AVIF 参数 ===============
export const AVIF_PRESETS = {
  general: (hasTransparency: boolean, isAnimated: boolean) => ({
    quality: 70,
    alphaQuality: hasTransparency ? 65 : undefined,
    chromaSubsampling: '4:4:4',
    speed: 0,                // 最高压缩率（最慢但体积最小）
    animated: isAnimated
  }),
  highQuality: (hasTransparency: boolean, isAnimated: boolean) => ({
    quality: 85,
    alphaQuality: hasTransparency ? 80 : undefined,
    chromaSubsampling: '4:2:0',
    speed: 0,
    animated: isAnimated
  }),
  extremeCompression: (hasTransparency: boolean, isAnimated: boolean) => ({
    quality: 55,
    alphaQuality: hasTransparency ? 50 : undefined,
    chromaSubsampling: '4:2:0',
    speed: 0,
    animated: isAnimated
  }),
  uiSharp: (hasTransparency: boolean, isAnimated: boolean) => ({
    quality: 80,
    alphaQuality: hasTransparency ? 75 : undefined,
    chromaSubsampling: '4:4:4',
    speed: 0,
    animated: isAnimated
  })
};

// =============== BMP 特殊处理参数 ===============
export const BMP_LOSSLESS_WEBP_PARAM = {
  lossless: true,
  reductionEffort: 6
};

// 质量参数映射
export const QUALITY_MAPPING = {
  1: 'general',        // 通用
  2: 'highQuality',    // 高质量
  3: 'extremeCompression', // 极限压缩
  4: 'uiSharp'         // UI锐利
} as const;

export type QualityType = keyof typeof QUALITY_MAPPING;