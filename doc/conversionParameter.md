``` js
// =============== JPEG 参数 ===============
const JPEG_PRESETS = {
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
const WEBP_PRESETS = {
  general: (hasTransparency, isAnimated) => ({
    quality: 85,
    alphaQuality: hasTransparency ? 80 : undefined,
    lossless: false,
    reductionEffort: 6,      // 最高压缩 effort
    smartSubsample: true,
    animated: isAnimated
  }),
  highQuality: (hasTransparency, isAnimated) => ({
    quality: 95,
    alphaQuality: hasTransparency ? 90 : undefined,
    lossless: false,
    reductionEffort: 6,
    smartSubsample: true,
    animated: isAnimated
  }),
  extremeCompression: (hasTransparency, isAnimated) => ({
    quality: 70,
    alphaQuality: hasTransparency ? 65 : undefined,
    lossless: false,
    reductionEffort: 6,
    smartSubsample: true,
    animated: isAnimated
  }),
  uiSharp: (hasTransparency, isAnimated) => ({
    quality: 92,
    alphaQuality: hasTransparency ? 95 : undefined,
    lossless: false,
    reductionEffort: 6,
    smartSubsample: true,
    animated: isAnimated
  })
};

// =============== AVIF 参数 ===============
const AVIF_PRESETS = {
  general: (hasTransparency, isAnimated) => ({
    quality: 70,             // ← +5
    alphaQuality: hasTransparency ? 65 : undefined, // ← +5
    chromaSubsampling: '4:4:4',
    speed: 0,                // 最高压缩率（最慢但体积最小）
    animated: isAnimated
  }),
  highQuality: (hasTransparency, isAnimated) => ({
    quality: 85,             // ← +5
    alphaQuality: hasTransparency ? 80 : undefined, // ← +5
    chromaSubsampling: '4:2:0',
    speed: 0,
    animated: isAnimated
  }),
  extremeCompression: (hasTransparency, isAnimated) => ({
    quality: 55,             // ← +5
    alphaQuality: hasTransparency ? 50 : undefined, // ← +5
    chromaSubsampling: '4:2:0',
    speed: 0,
    animated: isAnimated
  }),
  uiSharp: (hasTransparency, isAnimated) => ({
    quality: 80,             // ← +5
    alphaQuality: hasTransparency ? 75 : undefined, // ← +5
    chromaSubsampling: '4:4:4',
    speed: 0,
    animated: isAnimated
  })
};
```