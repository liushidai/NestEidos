# 图片上传接口重构说明

## 重构目标
将 MIME 类型校验提前到 Multer 的 fileFilter 阶段，避免文件完整上传后才校验，节省带宽。

## 重构内容

### 1. 依赖安装
```bash
npm install file-type
```

### 2. 新增文件

#### `src/utils/file-upload.utils.ts`
- 创建了文件上传相关的工具函数
- `imageFileFilter`: 自定义文件过滤器，在 fileFilter 阶段进行初步 MIME 类型检测
- `validateImageFile`: 使用 file-type 库检测文件真实 MIME 类型
- `ALLOWED_IMAGE_MIME_TYPES`: 支持的图片类型常量
- `MAX_FILE_SIZE`: 文件大小限制常量（100MB）

支持的图片类型：
- image/jpeg
- image/jpg
- image/png
- image/gif
- image/webp
- image/avif
- image/tiff
- image/bmp
- image/svg+xml
- image/heif
- image/heic

### 3. 修改文件

#### `src/pipes/file-validation.pipe.ts`
- 简化了 FileValidationPipe，移除了 MIME 类型验证逻辑
- 保留文件大小验证和基本文件存在性检查
- MIME 类型验证现在在 fileFilter 阶段完成

#### `src/modules/image/image-upload.controller.ts`
- 使用 `memoryStorage()` 替代默认的磁盘存储
- 在 FileInterceptor 配置中添加：
  - `storage: memoryStorage()`
  - `limits.fileSize: MAX_FILE_SIZE`
  - `fileFilter: imageFileFilter`
- 在控制器方法中添加二次验证，使用 file-type 库检测文件真实类型
- 保持原有方法签名不变

## 技术细节

### fileFilter 工作原理
1. 在文件上传开始时就被调用
2. 检查文件名和扩展名
3. 对于内存存储的文件，直接使用 file-type 库检测 MIME 类型
4. 对于流式上传，基于扩展名做初步过滤，后续进行完整验证

### 验证流程
1. **fileFilter 阶段**：初步过滤，基于文件扩展名和部分内容检测
2. **Pipe 阶段**：文件大小验证
3. **Controller 阶段**：使用 file-type 库完整验证文件类型

### 内存使用
- 使用 `memoryStorage()` 将文件暂存在内存中
- 便于 file-type 库读取文件内容进行检测
- 上传完成后由服务层处理文件存储

## 配置说明

当前实现中：
- 文件大小限制硬编码为 100MB
- 实际项目中应从配置服务读取

建议配置项：
```typescript
// 示例：从配置服务读取
this.maxFileSize = this.configService.get<number>('upload.maxFileSize', MAX_FILE_SIZE);
```

## 优势

1. **带宽节省**：不支持的文件类型在上传早期就被拒绝
2. **安全性提升**：基于文件内容而非扩展名检测真实类型
3. **性能优化**：使用内存存储，减少磁盘 I/O
4. **代码分离**：验证逻辑清晰分层，便于维护

## 注意事项

1. 内存使用：大文件会占用较多内存，需要监控内存使用情况
2. 配置管理：文件大小限制应从配置服务读取
3. 错误处理：fileFilter 阶段的错误需要特别处理以提供友好的用户反馈