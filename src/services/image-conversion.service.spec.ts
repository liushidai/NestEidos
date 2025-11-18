import { Test, TestingModule } from '@nestjs/testing';
import { ImageConversionService } from '../services/image-conversion.service';
import {
  ImageMetadata,
  ConversionPlan,
} from '../services/image-conversion.service';

describe('ImageConversionService - BMP Conversion', () => {
  let service: ImageConversionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageConversionService],
    }).compile();

    service = module.get<ImageConversionService>(ImageConversionService);
  });

  describe('BMP格式转换计划', () => {
    it('应该为BMP格式生成JPG、WebP和AVIF', () => {
      const bmpMetadata: ImageMetadata = {
        format: 'bmp',
        hasAlpha: false,
        pages: 1,
        width: 800,
        height: 600,
        hasTransparency: false,
        isAnimated: false,
      };

      const plan = service.createConversionPlan(bmpMetadata);

      expect(plan.shouldGenerateJpeg).toBe(true);
      expect(plan.shouldGenerateWebp).toBe(true);
      expect(plan.shouldGenerateAvif).toBe(true);
      expect(plan.originalFormat).toBe('bmp');
      expect(plan.hasTransparency).toBe(false);
      expect(plan.isAnimated).toBe(false);
    });

    it('应该为BMP格式正确生成转换计划', () => {
      const bmpMetadata: ImageMetadata = {
        format: 'bmp',
        hasAlpha: false,
        pages: 1,
        width: 1024,
        height: 768,
        hasTransparency: false,
        isAnimated: false,
      };

      const plan: ConversionPlan = service.createConversionPlan(bmpMetadata);

      // 验证所有格式都应该生成
      expect(plan.shouldGenerateJpeg).toBe(true);
      expect(plan.shouldGenerateWebp).toBe(true);
      expect(plan.shouldGenerateAvif).toBe(true);

      // 验证元数据正确传递
      expect(plan.originalFormat).toBe('bmp');
      expect(plan.hasTransparency).toBe(false);
      expect(plan.isAnimated).toBe(false);
    });
  });

  describe('与其他格式对比', () => {
    it('GIF格式不应该生成JPG', () => {
      const gifMetadata: ImageMetadata = {
        format: 'gif',
        hasAlpha: true,
        pages: 5,
        width: 400,
        height: 300,
        hasTransparency: true,
        isAnimated: true,
      };

      const plan = service.createConversionPlan(gifMetadata);

      expect(plan.shouldGenerateJpeg).toBe(false); // GIF不生成JPG
      expect(plan.shouldGenerateWebp).toBe(true);
      expect(plan.shouldGenerateAvif).toBe(true);
    });

    it('PNG格式应该生成JPG（非动画）', () => {
      const pngMetadata: ImageMetadata = {
        format: 'png',
        hasAlpha: true,
        pages: 1,
        width: 800,
        height: 600,
        hasTransparency: true,
        isAnimated: false,
      };

      const plan = service.createConversionPlan(pngMetadata);

      expect(plan.shouldGenerateJpeg).toBe(true);
      expect(plan.shouldGenerateWebp).toBe(true);
      expect(plan.shouldGenerateAvif).toBe(true);
    });
  });
});
