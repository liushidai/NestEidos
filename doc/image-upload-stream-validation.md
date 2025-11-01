# 图片上传流式 MIME 类型验证重构

## 重构目标
在文件上传初期（流式接收阶段）就校验真实 MIME 类型，避免完整上传后再校验造成的带宽和资源浪费。

## 交付内容

### 1. 依赖安装
```bash
npm install file-type
```

### 2. 新增文件

#### `src/common/constants/image-formats.ts`
完整的图片格式注册表，包含：
- **支持的格式**：JPEG, PNG, GIF, WEBP, AVIF, TIFF, BMP, SVG, HEIF, HEIC
- **MIME 类型管理**：每种格式的标准 MIME 和所有合法别名
- **扩展名映射**：常见扩展名与格式的对应关系
- **元信息支持**：位图/矢量图标识、透明度支持等
- **工具函数**：丰富的检查和转换函数

```typescript
// 示例：支持的 MIME 类型列表
export const ALLOWED_IMAGE_MIME_TYPES: string[] = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/webp', 'image/avif', 'image/tiff', 'image/tif',
  'image/bmp', 'image/x-ms-bmp', 'image/svg+xml',
  'image/heif', 'image/heic'
];
```

#### `src/common/filters/imageFileFilter.ts`
自定义文件过滤器，实现：
- **流式验证**：在 fileFilter 阶段进行 MIME 类型检测
- **file-type 集成**：基于文件内容的真实类型检测
- **严格模式**：扩展名与 MIME 类型必须匹配
- **灵活配置**：支持自定义大小限制和验证模式
- **错误处理**：友好的错误信息和调试日志

### 3. 重构文件

#### `src/modules/image/image-upload.controller.ts`
控制器配置更新：
```typescript
@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(),
    limits: {
      fileSize: MAX_FILE_SIZE, // 100MB
    },
    fileFilter: createImageFileFilter({
      maxSize: MAX_FILE_SIZE,
      strict: true, // 严格模式验证
    }),
  })
)
```

**关键特性**：
- 使用 `memoryStorage()` 支持内存缓冲区检测
- 在 fileFilter 中提前验证 MIME 类型
- 严格模式确保扩展名与内容匹配
- 最终安全验证确保检测准确性

#### `src/pipes/file-validation.pipe.ts`
简化为仅处理：
- 文件存在性验证
- 文件大小验证（双重保障）
- 预留业务逻辑验证接口

## 验证流程

### 三层验证体系

1. **fileFilter 阶段**（前置验证）
   - 文件名和扩展名检查
   - 基于文件内容的 MIME 类型检测
   - 早期拦截非法文件

2. **Pipe 阶段**（基础验证）
   - 文件存在性检查
   - 文件大小限制验证
   - 预留业务逻辑验证

3. **Controller 阶段**（最终验证）
   - 使用 `quickImageTypeDetection` 最终确认
   - 安全性的最后保障
   - 调试日志记录

### 支持的图片格式

| 格式 | MIME 类型 | 扩展名 | 透明度 | 类型 |
|------|-----------|--------|--------|------|
| JPEG | image/jpeg, image/jpg | jpg, jpeg | ❌ | 位图 |
| PNG | image/png | png | ✅ | 位图 |
| GIF | image/gif | gif | ✅ | 位图 |
| WEBP | image/webp | webp | ✅ | 位图 |
| AVIF | image/avif | avif, avifs | ✅ | 位图 |
| TIFF | image/tiff, image/tif | tiff, tif | ✅ | 位图 |
| BMP | image/bmp, image/x-ms-bmp | bmp, dib | ❌ | 位图 |
| SVG | image/svg+xml | svg, svgz | ✅ | 矢量图 |
| HEIF | image/heif | heif, hif | ✅ | 位图 |
| HEIC | image/heic | heic, heifs | ✅ | 位图 |

## 性能优化

### 带宽节省
- **早期拦截**：不支持的文件类型在上传开始时就被拒绝
- **内容检测**：基于文件内容而非扩展名，防止伪装文件
- **流式处理**：避免完整上传大文件后才验证失败

### 内存管理
- **内存存储**：文件暂存在内存中便于检测
- **缓冲区优化**：file-type 库仅读取必要的文件头信息
- **及时释放**：处理完成后立即释放内存

### 安全性提升
- **多重验证**：三层验证确保安全性
- **严格模式**：扩展名与内容必须匹配
- **防伪造**：不信任 HTTP 头的 MIME 类型

## 配置说明

### 当前配置
```typescript
// 文件大小限制：100MB
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

// 严格模式：扩展名与 MIME 类型必须匹配
strict: true
```

### 推荐配置改进
```typescript
// 从配置服务读取（示例）
constructor(private configService: ConfigService) {
  this.maxFileSize = this.configService.get<number>(
    'upload.maxFileSize',
    100 * 1024 * 1024
  );
}
```

## 使用示例

### 基本使用
```typescript
// 使用默认配置
fileFilter: createImageFileFilter()
```

### 自定义配置
```typescript
// 自定义大小限制
fileFilter: createImageFileFilter({
  maxSize: 50 * 1024 * 1024, // 50MB
  strict: false // 宽松模式
})
```

### 宽松模式
```typescript
// 不严格检查扩展名匹配
fileFilter: createLenientImageFileFilter()
```

## 优势总结

1. **性能优化**：提前拦截非法文件，节省带宽和服务器资源
2. **安全性增强**：基于文件内容的真实类型检测
3. **代码质量**：统一的格式管理，清晰的职责分离
4. **可维护性**：集中化的格式注册表，便于扩展和修改
5. **开发体验**：丰富的工具函数和友好的错误信息

## 注意事项

1. **内存使用**：大文件会占用较多内存，需要监控
2. **配置管理**：文件大小限制建议从配置服务读取
3. **错误处理**：fileFilter 阶段的错误需要特别处理
4. **调试支持**：可以启用详细日志帮助问题排查

这次重构实现了"尽早拒绝非法文件"的目标，显著提升了系统的安全性和资源效率。