# NestEidos 开发规范与最佳实践

<div align="center">

**版本**: v2.0.0 | **更新时间**: 2025年1月

**代码质量 • 架构一致性 • 团队协作**

</div>

## 📋 目录

- [项目概述](#项目概述)
- [代码组织规范](#代码组织规范)
- [TypeScript 编码规范](#typescript-编码规范)
- [数据库设计规范](#数据库设计规范)
- [Repository 层规范](#repository-层规范)
- [缓存设计规范](#缓存设计规范)
- [API 设计规范](#api-设计规范)
- [认证与安全规范](#认证与安全规范)
- [图片处理规范](#图片处理规范)
- [测试规范](#测试规范)
- [文档规范](#文档规范)
- [开发工具配置](#开发工具配置)

---

## 项目概述

NestEidos 是企业级图床服务，采用严格的开发规范确保代码质量和架构一致性。本文档定义了项目开发过程中必须遵循的编码规范和最佳实践。

### 核心原则

- **一致性**: 所有代码遵循统一的编码风格和架构模式
- **可维护性**: 代码结构清晰，易于理解和维护
- **可扩展性**: 模块化设计，支持功能扩展
- **性能优先**: 缓存策略和数据库优化
- **安全第一**: 多层安全防护和输入验证

---

## 代码组织规范

### 1. 目录结构

```
src/
├── app.module.ts                 # 根模块
├── main.ts                       # 应用入口
├── config/                       # 配置管理
│   ├── database.config.ts        # 数据库配置
│   ├── redis.config.ts           # Redis 配置
│   ├── auth.config.ts            # 认证配置
│   └── storage.config.ts         # 存储配置
├── modules/                      # 业务模块
│   ├── auth/                     # 认证模块
│   ├── user/                     # 用户模块
│   ├── album/                    # 相册模块
│   └── image/                    # 图片模块
│       ├── entities/             # 数据库实体
│       ├── repositories/         # 数据访问层 (Repository)
│       ├── dto/                  # 数据传输对象
│       ├── controllers/          # 控制器
│       └── {module}.module.ts    # 模块定义
├── services/                     # 核心服务
│   ├── storage.service.ts        # 对象存储服务
│   ├── image-conversion.service.ts # 图片转换服务
│   └── temp-file.service.ts      # 临时文件服务
├── cache/                        # 缓存模块
│   ├── cache.module.ts           # 缓存模块
│   └── cache.service.ts          # 缓存服务
├── utils/                        # 工具类
│   ├── snowflake.util.ts         # 雪花算法ID生成
│   ├── secure-id.util.ts         # 安全ID处理
│   └── common.util.ts            # 通用工具
├── interceptors/                 # 拦截器
│   └── response.interceptor.ts   # 响应拦截器
├── filters/                      # 异常过滤器
│   └── http-exception.filter.ts  # 全局异常处理
├── decorators/                   # 装饰器
│   └── strong-password.decorator.ts
├── pipes/                        # 管道
│   └── file-validation.pipe.ts   # 文件验证
└── common/                       # 公共组件
    ├── constants/                # 常量定义
    └── interfaces/               # 接口定义
```

### 2. 模块组织规范

每个业务模块必须包含以下组件：

```
modules/{module-name}/
├── entities/                     # 数据库实体
│   └── {entity-name}.entity.ts
├── repositories/                 # 数据访问层
│   └── {entity-name}.repository.ts
├── dto/                          # 数据传输对象
│   ├── create-{entity-name}.dto.ts
│   ├── update-{entity-name}.dto.ts
│   ├── query-{entity-name}.dto.ts
│   └── admin/                    # 管理员专用DTO
│       ├── admin-{entity-name}-query.dto.ts
│       ├── reset-{entity-name}-password.dto.ts
│       └── toggle-{entity-name}-status.dto.ts
├── controllers/                  # 控制器
│   ├── protected-{entity-name}.controller.ts  # 需要认证的接口
│   ├── {entity-name}-upload.controller.ts     # 上传接口 (如适用)
│   ├── {entity-name}-access.controller.ts     # 公开访问接口 (如适用)
│   └── admin.controller.ts               # 管理员专用接口
├── services/                     # 业务逻辑服务
│   └── {entity-name}.service.ts
├── guards/                       # 权限守卫 (如适用)
│   └── admin.guard.ts
└── {module-name}.module.ts       # 模块定义
```

### 3. 导入顺序规范

```typescript
// 1. Node.js 内置模块
import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

// 2. 第三方库
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

// 3. 项目内部模块（按路径层级排序）
import { Image } from '../entities/image.entity';
import { ImageRepository } from '../repositories/image.repository';
import { CreateImageDto } from './dto/create-image.dto';

// 4. 相对路径导入（尽量避免）
import { generateSnowflakeId } from '@/utils/snowflake.util';
```

---

## TypeScript 编码规范

### 1. 基础规范

#### 1.1 parseInt 使用规范

**原则**: 始终使用 `Number.parseInt` 而不是全局 `parseInt`，并提供基数参数。

```typescript
// ✅ 正确
const port = Number.parseInt(configService.get<string>('PORT', '3000'), 10);
const userId = Number.parseInt(userIdStr, 10);
const page = Number.parseInt(pageStr || '1', 10);

// ❌ 错误
const port = parseInt(configService.get<string>('PORT', '3000'), 10);
const port = Number.parseInt(configService.get<string>('PORT', '3000'));
```

#### 1.2 变量和常量命名

```typescript
// ✅ 正确：使用描述性的变量名，遵循驼峰命名法
const maxRetryAttempts = 3;
const isAuthenticated = true;
const userAccessToken = token;
const DEFAULT_CACHE_TTL = 3600; // 常量使用 UPPER_SNAKE_CASE

// ❌ 错误
const max = 3;
const auth = true;
const token = accessToken;
```

#### 1.3 错误处理

```typescript
// ✅ 正确：始终处理可能的错误情况
try {
  const result = await apiCall();
  return result;
} catch (error) {
  this.logger.error('API call failed', error.stack);
  throw new InternalServerErrorException('操作失败');
}

// ❌ 错误：没有错误处理
const result = await apiCall();
return result;
```

### 2. 类型定义规范

```typescript
// ✅ 正确：使用接口定义类型
interface ImageMetadata {
  format: string;
  width: number;
  height: number;
  hasTransparency: boolean;
  isAnimated: boolean;
}

// ✅ 正确：使用联合类型
type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'bmp';

// ✅ 正确：使用泛型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
```

---

## 数据库设计规范

### 1. 实体定义规范

#### 1.1 基础规范

- 使用雪花算法生成 ID
- 程序管理时间戳，不依赖数据库自动时间戳
- 避免过度规范化，优先考虑查询性能

```typescript
@Entity('users')
export class User {
  @PrimaryColumn('bigint')
  id: string; // 使用雪花算法生成的 ID

  @Column({ name: 'user_name', type: 'varchar', length: 64, unique: true })
  userName: string;

  @Column({ name: 'pass_word', type: 'varchar', length: 255 })
  passWord: string; // BCrypt 加密

  @Column({ name: 'user_type', type: 'smallint', default: 10 })
  userType: number; // 1-管理员, 10-普通用户

  @Column({ name: 'user_status', type: 'smallint', default: 1 })
  userStatus: number; // 1-正常, 2-封锁

  @Column({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt: Date; // 由程序在插入时设置

  @Column({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt: Date; // 由程序在每次更新时设置
}
```

#### 1.2 统一存储设计

图片表采用统一存储设计，将文件元数据和业务信息合并在同一张表中：

```typescript
@Entity('images')
export class Image {
  @PrimaryColumn('bigint')
  id: string;

  // 基础字段
  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'album_id', type: 'bigint', default: 0 })
  albumId: string; // 0表示未分类

  // 文件元数据
  @Column({ name: 'image_hash', type: 'char', length: 64 })
  imageHash: string; // SHA256哈希

  @Column({ name: 'image_size', type: 'bigint' })
  imageSize: number;

  @Column({ name: 'image_width', type: 'integer' })
  imageWidth: number;

  @Column({ name: 'image_height', type: 'integer' })
  imageHeight: number;

  @Column({ name: 'has_transparency', type: 'boolean', default: false })
  hasTransparency: boolean;

  @Column({ name: 'is_animated', type: 'boolean', default: false })
  isAnimated: boolean;

  // 存储路径 (MinIO 对象键)
  @Column({ name: 'original_key', type: 'varchar', length: 512 })
  originalKey: string;

  @Column({ name: 'jpeg_key', type: 'varchar', length: 512 })
  jpegKey: string;

  @Column({ name: 'webp_key', type: 'varchar', length: 512 })
  webpKey: string;

  @Column({ name: 'avif_key', type: 'varchar', length: 512 })
  avifKey: string;

  // 格式标识
  @Column({ name: 'has_jpeg', type: 'boolean', default: false })
  hasJpeg: boolean;

  @Column({ name: 'has_webp', type: 'boolean', default: false })
  hasWebp: boolean;

  @Column({ name: 'has_avif', type: 'boolean', default: false })
  hasAvif: boolean;

  // 转换参数 (JSONB格式)
  @Column({ name: 'convert_jpeg_param', type: 'jsonb' })
  convertJpegParam: object;

  @Column({ name: 'convert_webp_param', type: 'jsonb' })
  convertWebpParam: object;

  @Column({ name: 'convert_avif_param', type: 'jsonb' })
  convertAvifParam: object;

  // 业务配置
  @Column({ name: 'default_format', type: 'varchar', length: 20, default: 'avif' })
  defaultFormat: string;

  @Column({ name: 'expire_policy', type: 'smallint', default: 1 })
  expirePolicy: number; // 1-永久, 2-指定时间, 3-7天

  @Column({ name: 'expires_at', type: 'timestamp without time zone', default: '9999-12-31' })
  expiresAt: Date;

  @Column({ name: 'nsfw_score', type: 'real' })
  nsfwScore: number; // 预留字段

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt: Date;

  @UpdateTimestampColumn({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt: Date;
}
```

### 2. 数据库配置规范

- 使用环境变量配置数据库连接
- 生产环境禁用 `synchronize`
- 启用连接池配置
- 合理设置连接池大小

```typescript
// database.config.ts
export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  extra: {
    max: 20, // 最大连接数
    min: 5,  // 最小连接数
    idle: 10000,
    acquire: 30000,
  },
};
```

---

## Repository 层规范

### 1. Repository 层职责

**原则**: Repository 层负责数据访问操作和缓存管理，为上层 Service 提供统一的数据访问接口。

**文件位置**: `src/modules/{module-name}/repositories/{entity-name}.repository.ts`

**核心职责**:
- 数据库 CRUD 操作
- Redis 缓存管理
- 数据一致性保证
- 性能优化（缓存策略）

### 2. Repository 实现规范

```typescript
@Injectable()
export class ImageRepository {
  private readonly CACHE_TTL = TTLUtils.toSeconds(TTL_CONFIGS.MEDIUM_CACHE); // 30分钟缓存
  private readonly NULL_CACHE_TTL = TTLUtils.toSeconds(TTL_CONFIGS.NULL_CACHE); // 5分钟缓存空值

  constructor(
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 根据ID查找图片（带缓存，支持缓存穿透防护）
   */
  async findById(id: string): Promise<Image | null> {
    try {
      const cacheKey = CacheKeyUtils.buildRepositoryKey('image', 'id', id);

      // 尝试从缓存获取
      const cachedImage = await this.cacheService.get<Image>(cacheKey);
      if (cachedImage !== null && cachedImage !== undefined) {
        // 检查是否为缓存的空值标记
        if (TTLUtils.isNullCacheValue(cachedImage)) {
          this.logger.debug(`从缓存获取图片空值标记（缓存穿透防护）: ${id}`);
          return null;
        }
        this.logger.debug(`从缓存获取图片: ${id}`);
        return cachedImage;
      }

      // 缓存未命中，从数据库获取
      this.logger.debug(`从数据库获取图片: ${id}`);
      const image = await this.imageRepository.findOne({
        where: { id },
        relations: ['user', 'album'],
      });

      // 缓存结果（无论是否存在都缓存）
      if (image) {
        await this.cacheService.set(cacheKey, image, this.CACHE_TTL);
        this.logger.debug(`缓存图片数据: ${id}, TTL: ${this.CACHE_TTL}秒`);
      } else {
        // 缓存空值，防止缓存穿透
        const nullMarker = TTLUtils.toCacheableNullValue<Image>();
        await this.cacheService.set(cacheKey, nullMarker, this.NULL_CACHE_TTL);
        this.logger.debug(`缓存图片空值标记（缓存穿透防护）: ${id}, TTL: ${this.NULL_CACHE_TTL}秒`);
      }

      return image;
    } catch (error) {
      this.logger.error(`根据ID查找图片失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 创建图片记录
   */
  async create(imageData: Partial<Image>): Promise<Image> {
    try {
      const image = this.imageRepository.create(imageData);
      const savedImage = await this.imageRepository.save(image);

      this.logger.log(`创建图片记录成功: ${savedImage.id} (userId: ${savedImage.userId})`);
      return savedImage;
    } catch (error) {
      this.logger.error(`创建图片记录失败: ${imageData.userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新图片信息（自动清理缓存）
   */
  async update(id: string, userId: string, imageData: Partial<Image>): Promise<{ oldImage: Image | null; updatedImage: Image }> {
    try {
      // 先查询原始数据
      const oldImage = await this.findByIdAndUserId(id, userId);
      if (!oldImage) {
        throw new Error('图片不存在或无权限操作');
      }

      // 更新数据
      const updatedData = { ...oldImage, ...imageData, updatedAt: new Date() };
      const updatedImage = await this.imageRepository.save(updatedData);

      // 清理相关缓存
      await this.clearImageCache(id, userId);

      this.logger.log(`更新图片成功: ${updatedImage.title} (id: ${id})`);
      return { oldImage, updatedImage };
    } catch (error) {
      this.logger.error(`更新图片失败: id=${id}, userId=${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除图片（自动清理缓存）
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      const image = await this.findByIdAndUserId(id, userId);
      if (!image) {
        throw new Error('图片不存在或无权限操作');
      }

      await this.imageRepository.remove(image);

      // 清理相关缓存
      await this.clearImageCache(id, userId);

      this.logger.log(`删除图片成功: ${image.title} (id: ${id})`);
    } catch (error) {
      this.logger.error(`删除图片失败: id=${id}, userId=${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 清理图片相关缓存
   */
  private async clearImageCache(imageId: string, userId: string): Promise<void> {
    try {
      // 清理图片ID缓存
      const imageIdCacheKey = CacheKeyUtils.buildRepositoryKey('image', 'id', imageId);
      await this.cacheService.delete(imageIdCacheKey);

      // 清理用户图片缓存
      const userImageCacheKey = CacheKeyUtils.buildRepositoryKey('image', 'user_image', `${userId}:${imageId}`);
      await this.cacheService.delete(userImageCacheKey);

      this.logger.debug(`清理图片缓存: imageId=${imageId}, userId=${userId}`);
    } catch (error) {
      this.logger.warn(`清理图片缓存失败: imageId=${imageId}, userId=${userId}`, error.stack);
      // 缓存清理失败不应影响主要功能
    }
  }
}
```

### 3. Service 层设计原则

**Service 层专注于业务逻辑，不直接操作数据库或缓存**:

```typescript
@Injectable()
export class ImageService {
  constructor(
    private readonly imageRepository: ImageRepository,  // 委托给Repository处理
  ) {}

  /**
   * 根据ID查找图片
   * 委托给Repository处理，Repository层负责缓存管理
   */
  async findById(id: string): Promise<Image | null> {
    this.logger.debug(`查找图片: ${id}`);
    return await this.imageRepository.findById(id);
  }

  /**
   * 更新图片
   * 委托给Repository处理，Repository层负责缓存清理
   */
  async update(id: string, userId: string, updateImageDto: UpdateImageDto): Promise<Image> {
    this.logger.debug(`更新图片: ${id}`);
    const { updatedImage } = await this.imageRepository.update(id, userId, updateImageDto);
    return updatedImage;
  }
}
```

### 4. 分层架构规范

#### 4.1 数据流向

```
Controller → Service → Repository → Database + Cache
    ↓           ↓          ↓
  HTTP请求   业务逻辑    数据操作+缓存
```

#### 4.2 职责分离

| 层级 | 职责 | 缓存处理 |
|------|------|----------|
| **Controller** | HTTP请求处理 | 不涉及缓存 |
| **Service** | 业务逻辑 | 委托给Repository |
| **Repository** | 数据访问+缓存 | 统一管理 |

#### 4.3 依赖注入顺序

```typescript
// Service 层构造函数 - 按依赖层级排序
constructor(
  private readonly imageRepository: ImageRepository,    // 1. 数据访问层
  private readonly storageService: StorageService,      // 2. 基础服务
  private readonly imageConversionService: ImageConversionService,
  private readonly secureIdUtil: SecureIdUtil,
) {}
```

---

## 缓存设计规范

### 1. 缓存架构

项目使用**简化缓存架构**，遵循明确的分层设计原则：

- **Repository 层**：负责数据库访问和缓存管理
- **Service 层**：专注业务逻辑，委托给Repository层
- **缓存策略**：简单的键值对缓存，手动管理缓存生命周期

### 2. 缓存键管理

#### 2.1 缓存键前缀系统

```typescript
// 缓存键前缀常量
export const CACHE_KEYS = {
  REPOSITORY: 'repo',  // Repository层数据缓存前缀
  AUTH: 'auth',        // 认证Token缓存前缀
};

// 缓存键工具类
export class CacheKeyUtils {
  static buildRepositoryKey(module: string, type: string, identifier: string): string {
    return `${CACHE_KEYS.REPOSITORY}:${module}:${type}:${identifier}`;
  }

  static buildAuthKey(type: string, identifier: string): string {
    return `${CACHE_KEYS.AUTH}:${type}:${identifier}`;
  }
}
```

**缓存键格式**: `{prefix}:{module}:{type}:{identifier}`

**示例**:
- `repo:image:id:123456789` - 图片ID查询
- `repo:user:id:987654321` - 用户ID查询
- `repo:album:user_images:123:456` - 用户相册图片查询
- `auth:token:abc123` - 认证Token

#### 2.2 TTL 配置策略

```typescript
// TTL配置接口
interface TTLConfig {
  value: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
}

// 标准缓存时间配置
export const TTL_CONFIGS = {
  USER_CACHE: { value: 24, unit: 'hours' },      // 24小时 - 用户信息缓存
  AUTH_TOKEN: { value: 30, unit: 'days' },       // 30天 - 认证Token缓存
  SHORT_CACHE: { value: 5, unit: 'minutes' },    // 5分钟 - 频繁查询数据
  MEDIUM_CACHE: { value: 30, unit: 'minutes' },  // 30分钟 - 一般业务数据
  LONG_CACHE: { value: 2, unit: 'hours' },       // 2小时 - 稳定数据
  DEFAULT_CACHE: { value: 4, unit: 'hours' },    // 4小时 - 默认缓存
  NULL_CACHE: { value: 5, unit: 'minutes' },     // 5分钟 - 空值缓存（缓存穿透防护）
};
```

**缓存时间选择原则**:
- **用户信息**: 24小时 - 用户数据相对稳定，适合长时间缓存
- **认证Token**: 30天 - 提供长期登录体验
- **图片元数据**: 30分钟 - 图片信息可能更新，中等缓存时间
- **实时查询**: 不缓存 - 如用户名验证等需要强一致性的场景
- **分页数据**: 不缓存 - 动态变化，避免缓存污染

### 3. 缓存穿透防护

#### 3.1 问题背景

缓存穿透是指大量请求查询不存在的数据，导致请求直接穿透缓存访问数据库，造成数据库压力剧增。

#### 3.2 解决方案

缓存空值（NULL Cache），当数据库查询结果为null时，将null值的标记缓存到Redis中。

#### 3.3 实现规范

```typescript
// 空值标记常量
const NULL_CACHE_VALUES = {
  NULL_PLACEHOLDER: '__NULL_CACHE_PLACEHOLDER__',
};

// 空值处理工具类
export class TTLUtils {
  /**
   * 判断是否为缓存的空值标记
   */
  static isNullCacheValue<T>(value: T): boolean {
    return value === NULL_CACHE_VALUES.NULL_PLACEHOLDER;
  }

  /**
   * 创建可缓存的空值标记
   */
  static toCacheableNullValue<T>(): T {
    return NULL_CACHE_VALUES.NULL_PLACEHOLDER as T;
  }

  /**
   * 从缓存值中提取真实值（处理空值标记）
   */
  static fromCachedValue<T>(cachedValue: T): T | null {
    if (cachedValue === null || cachedValue === undefined) {
      return null;  // 缓存未命中
    }

    if (TTLUtils.isNullCacheValue(cachedValue)) {
      return null;  // 缓存命中，但是是空值标记
    }

    return cachedValue;  // 缓存命中，返回实际值
  }

  /**
   * 将TTL配置转换为秒数
   */
  static toSeconds(config: TTLConfig): number {
    const multipliers = {
      seconds: 1,
      minutes: 60,
      hours: 3600,
      days: 86400,
    };
    return config.value * multipliers[config.unit];
  }
}
```

#### 3.4 Repository 层实现

```typescript
async findById(id: string): Promise<Image | null> {
  try {
    const cacheKey = CacheKeyUtils.buildRepositoryKey('image', 'id', id);

    // 尝试从缓存获取
    const cachedImage = await this.cacheService.get<Image>(cacheKey);
    const realValue = TTLUtils.fromCachedValue(cachedImage);
    if (realValue !== null) {
      this.logger.debug(`从缓存获取图片: ${id}`);
      return realValue;
    }

    // 缓存未命中，从数据库获取
    this.logger.debug(`从数据库获取图片: ${id}`);
    const image = await this.imageRepository.findOne({
      where: { id },
      relations: ['user', 'album'],
    });

    // 缓存结果（无论是否存在都缓存）
    if (image) {
      await this.cacheService.set(cacheKey, image, this.CACHE_TTL);
      this.logger.debug(`缓存图片数据: ${id}, TTL: ${this.CACHE_TTL}秒`);
    } else {
      // 缓存空值，防止缓存穿透
      const nullMarker = TTLUtils.toCacheableNullValue<Image>();
      await this.cacheService.set(cacheKey, nullMarker, this.NULL_CACHE_TTL);
      this.logger.debug(`缓存图片空值标记（缓存穿透防护）: ${id}, TTL: ${this.NULL_CACHE_TTL}秒`);
    }

    return image;
  } catch (error) {
    this.logger.error(`根据ID查找图片失败: ${id}`, error.stack);
    throw error;
  }
}
```

### 4. 缓存最佳实践

#### 4.1 缓存设计原则

- **简单明确**: 使用简单的键值对缓存，避免过度抽象
- **分层明确**: 缓存逻辑集中在Repository层
- **自动清理**: 写操作自动清理相关缓存
- **实时优先**: 认证等实时查询不使用缓存
- **穿透防护**: 缓存空值，防止恶意查询

#### 4.2 错误处理

```typescript
// Repository 层错误处理
async findById(id: string): Promise<User | null> {
  try {
    const cacheKey = CacheKeyUtils.buildRepositoryKey('user', 'id', id);
    let user = await this.cacheService.get<User>(cacheKey);
    if (user) return user;

    user = await this.userRepository.findOneBy({ id });
    if (user) {
      await this.cacheService.set(cacheKey, user, TTLUtils.toSeconds(TTL_CONFIGS.USER_CACHE));
    }
    return user;
  } catch (error) {
    this.logger.error(`查找用户失败: ${id}`, error.stack);
    throw error;
  }
}
```

#### 4.3 日志记录

```typescript
// 使用结构化日志
this.logger.debug(`从缓存获取用户: ${id}`);
this.logger.debug(`从数据库获取用户: ${id}`);
this.logger.debug(`缓存命中: ${cacheKey}`);
this.logger.debug(`缓存未命中: ${cacheKey}`);
this.logger.debug(`设置缓存: ${cacheKey}, TTL: ${ttl}s`);
this.logger.debug(`删除缓存: ${cacheKey}`);
this.logger.debug(`缓存穿透防护触发: ${id}`);
```

---

## API 设计规范

### 1. RESTful API 路由规范

#### 1.1 路由命名规则

- **单个资源操作**: 使用单数形式（如 `/api/user/{id}`, `/api/album/{id}`, `/api/image/{id}`）
- **集合资源操作**: 使用复数形式（如 `/api/users`, `/api/albums`, `/api/images`）
- **当前用户操作**: 针对当前认证用户的操作使用单数形式（如 `/api/user/profile`）
- **管理员接口**: 使用 `/admin/{resource}` 前缀，需要管理员权限

#### 1.2 实际路由结构

**单个资源操作（单数形式）**:
- `/api/user/profile` - GET（获取当前用户信息）
- `/api/user/check-auth` - GET（检查认证状态）
- `/api/album/{id}` - GET/PATCH/DELETE（单个相册操作）
- `/api/image/{id}` - GET/PATCH/DELETE（单张图片操作）
- `/api/image/upload` - POST（上传图片）

**集合资源操作（复数形式）**:
- `/api/albums` - GET（分页查询相册列表）
- `/api/images` - GET（分页查询图片列表）

**管理员专用接口**:
- `/api/admin/users` - GET（分页获取用户列表）
- `/api/admin/user/{id}` - GET（获取用户详细信息）
- `/api/admin/user/{id}/status` - PUT（切换用户状态）
- `/api/admin/user/{id}/reset-password` - PUT（重置用户密码）
- `/api/admin/user/{id}/exists` - GET（检查用户是否存在）

**公开访问接口（无需认证前缀）**:
- `/i/{secureId}` - GET（图片公开访问）
- `/i/{secureId}.jpg` - GET（获取JPEG格式）
- `/i/{secureId}.webp` - GET（获取WebP格式）
- `/i/{secureId}.avif` - GET（获取AVIF格式）
- `/i/{secureId}.original` - GET（获取原始格式）

#### 1.3 控制器设计模式

为了支持这种路由结构，采用控制器分离的设计：

```typescript
// 单个资源控制器 - 使用单数路径
@Controller('album')
export class ProtectedAlbumController {
  @Get(':id')      // GET /api/album/{id}
  @Patch(':id')    // PATCH /api/album/{id}
  @Delete(':id')   // DELETE /api/album/{id}
}

// 集合资源控制器 - 使用复数路径
@Controller('albums')
export class AlbumsController {
  @Get()           // GET /api/albums (分页查询)
}

// 公开访问控制器 - 无API前缀
@Controller('i')
export class ImageAccessController {
  @Get('*')         // GET /i/{secureId}[.ext]
}
```

### 2. HTTP 方法和状态码

| 操作 | HTTP方法 | 状态码 | 描述 |
|------|----------|--------|------|
| 查询单个资源 | GET | 200 | 成功返回资源 |
| 查询集合资源 | GET | 200 | 成功返回资源列表 |
| 创建资源 | POST | 201 | 资源创建成功 |
| 部分更新资源 | PATCH | 200 | 资源更新成功 |
| 删除资源 | DELETE | 200 | 资源删除成功 |
| 客户端错误 | - | 400 | 请求参数错误 |
| 未授权 | - | 401 | 缺少认证信息 |
| 权限不足 | - | 403 | 权限验证失败 |
| 资源不存在 | - | 404 | 请求的资源不存在 |
| 服务器错误 | - | 500 | 服务器内部错误 |

### 3. 认证和授权

#### 3.1 认证规范

- 所有需要认证的接口使用 `@UseGuards(TokenGuard)`
- Swagger 文档中添加 `@ApiBearerAuth('token')` 装饰器
- 在请求头中使用 `Authorization: Bearer <token>` 格式

```typescript
@UseGuards(TokenGuard)
@ApiBearerAuth('token')
@ApiOperation({ summary: '获取用户信息' })
@ApiResponse({ status: 200, description: '获取成功' })
@ApiResponse({ status: 401, description: '未授权' })
@Get('profile')
async getCurrentUser(@CurrentUserId() userId: string): Promise<any> {
  return this.userService.findById(userId);
}
```

#### 3.2 管理员授权规范

管理员接口需要同时使用 TokenGuard 和 AdminGuard：

```typescript
@ApiTags('管理员用户管理')
@Controller('admin/user')
@UseGuards(TokenGuard, AdminGuard)
@ApiBearerAuth('token')
export class AdminController {
  @Get()
  @ApiOperation({ summary: '分页获取用户列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 401, description: '认证失败或权限不足' })
  async findUsersWithPagination(@Query() query: UserQueryDto) {
    return this.userService.findUsersWithPagination(query);
  }
}
```

**AdminGuard 实现规范**:
```typescript
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || user.userType !== 1) {
      throw new UnauthorizedException('需要管理员权限');
    }

    return true;
  }
}
```

#### 3.3 公开接口规范

公开访问的图片接口不需要认证，但需要特殊的安全设计：

```typescript
@ApiExcludeController() // 从Swagger文档中排除
@Controller('i')
export class ImageAccessController {
  @Get('*')
  @ApiOperation({ summary: '获取图片（通用路由）' })
  @ApiResponse({ status: 200, description: '成功返回图片' })
  @ApiResponse({ status: 404, description: '图片不存在或已过期' })
  async getImage(@Req() req: Request, @Res() res: Response) {
    // 使用安全ID防止批量扫描
    // 支持格式后缀指定
    // 自动处理过期和404情况
  }
}
```

---

## 认证与安全规范

### 1. 自定义 Token 认证系统

#### 1.1 Token 设计原则

- 使用自定义 Token 系统，支持灵活配置
- Token 包含用户ID、过期时间等关键信息
- 支持Token自动刷新机制
- 使用 Redis 存储 Token 状态，支持 Token 撤销
- **注意**: 不是标准 JWT，而是基于雪花算法的自定义Token

#### 1.2 Token 结构

```typescript
interface TokenPayload {
  userId: string;      // 用户ID
  tokenId: string;      // Token唯一标识（雪花算法生成）
  createdAt: Date;      // Token创建时间
  expiresAt: Date;      // Token过期时间
}
```

#### 1.3 Token 生成和验证

```typescript
@Injectable()
export class AuthService {
  async generateToken(userId: string): Promise<{ token: string; expiresIn: number }> {
    const tokenId = generateSnowflakeId().toString();
    const createdAt = new Date();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24小时过期

    const payload: TokenPayload = {
      userId,
      tokenId,
      createdAt,
      expiresAt,
    };

    // 使用自定义编码算法生成Token
    const token = this.encodeToken(payload);

    // 存储到Redis，支持Token撤销和验证
    const authKey = CacheKeyUtils.buildAuthKey('token', tokenId);
    await this.cacheService.set(authKey, payload, TTLUtils.toSeconds(TTL_CONFIGS.AUTH_TOKEN));

    return {
      token,
      expiresIn: 24 * 60 * 60, // 秒
    };
  }

  async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      // 使用自定义解码算法解析Token
      const payload = this.decodeToken(token);

      if (payload.expiresAt < new Date()) {
        return null; // Token已过期
      }

      // 检查Redis中是否存在（支持Token撤销）
      const authKey = CacheKeyUtils.buildAuthKey('token', payload.tokenId);
      const storedPayload = await this.cacheService.get<TokenPayload>(authKey);

      if (!storedPayload) {
        return null; // Token已被撤销或不存在
      }

      return payload;
    } catch (error) {
      this.logger.warn(`Token验证失败: ${error.message}`);
      return null;
    }
  }
}
```

#### 1.4 自定义编码算法

```typescript
@Injectable()
export class TokenService {
  /**
   * Token编码 - 使用自定义算法
   */
  private encodeToken(payload: TokenPayload): string {
    // 将payload转换为字符串
    const data = JSON.stringify(payload);
    // 使用Base64编码（实际项目中可能使用更复杂的加密）
    const encoded = Buffer.from(data).toString('base64');
    return encoded;
  }

  /**
   * Token解码 - 与编码算法对应
   */
  private decodeToken(token: string): TokenPayload {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      return JSON.parse(decoded) as TokenPayload;
    } catch (error) {
      throw new Error('无效的Token格式');
    }
  }
}
```
```

### 2. 密码安全

#### 2.1 密码加密

```typescript
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
```

#### 2.2 密码强度验证

```typescript
export const StrongPasswordValidator = (
  property: string,
  validationOptions?: ValidationOptions,
) => {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'strongPassword',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any) {
          // 密码长度至少8位
          if (!value || value.length < 8) {
            return false;
          }
          // 包含大小写字母、数字
          const hasUpperCase = /[A-Z]/.test(value);
          const hasLowerCase = /[a-z]/.test(value);
          const hasNumbers = /\d/.test(value);
          return hasUpperCase && hasLowerCase && hasNumbers;
        },
        defaultMessage() {
          return '密码必须至少8位，包含大小写字母和数字';
        },
      },
    });
  };
};
```

### 3. 安全ID设计

#### 3.1 安全ID规范

使用 Feistel 网络加密生成安全的短路径ID，防止ID泄露和批量扫描：

```typescript
@Injectable()
export class SecureIdUtil {
  /**
   * 加密图片ID生成安全URL
   */
  encode(id: bigint): string {
    // 使用Feistel网络加密
    const rounds = 3;
    const mask = BigInt(0xFFFFFFFFFF);

    let l = id >> BigInt(40); // 高位
    let r = id & mask;         // 低位

    for (let i = 0; i < rounds; i++) {
      const temp = l;
      l = r;
      r = temp ^ this.roundFunction(r, i);
    }

    const result = (l << BigInt(40)) | r;
    return result.toString(36).padStart(10, '0');
  }

  /**
   * 解码安全URL还原图片ID
   */
  decode(secureId: string): bigint {
    const id = BigInt('0x' + parseInt(secureId, 36).toString(16));
    const rounds = 3;
    const mask = BigInt(0xFFFFFFFFFF);

    let l = id >> BigInt(40);
    let r = id & mask;

    for (let i = rounds - 1; i >= 0; i--) {
      const temp = r;
      r = l;
      l = temp ^ this.roundFunction(l, i);
    }

    return (l << BigInt(40)) | r;
  }

  private roundFunction(value: bigint, round: number): bigint {
    // 使用密钥的Feistel函数
    const key = this.roundKeys[round];
    return (value * key[0] + key[1]) & BigInt(0xFFFFFFFFFF);
  }
}
```

#### 3.2 安全ID使用

```typescript
// 上传时生成安全ID
const imageId = generateSnowflakeId();
const secureUrl = this.secureIdUtil.encode(BigInt(imageId));

// 生成存储路径
const originalKey = `originals/${secureUrl}.${originalExtension}`;
const jpegKey = `processed/${secureUrl}.jpg`;

// 访问时解码安全ID
const imageId = this.secureIdUtil.decode(secureId);
const image = await this.imageRepository.findById(imageId.toString());
```

### 4. 输入验证

#### 4.1 DTO 验证

```typescript
export class CreateUserDto {
  @ApiProperty({ description: '用户名', example: 'testuser' })
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  userName: string;

  @ApiProperty({ description: '密码', example: 'Password123' })
  @IsString()
  @MinLength(8)
  @StrongPassword()
  passWord: string;

  @ApiProperty({ description: '邮箱', example: 'test@example.com' })
  @IsEmail()
  @MaxLength(100)
  email: string;
}
```

#### 4.2 文件上传验证

```typescript
@Injectable()
export class FileValidationPipe implements PipeTransform {
  async transform(value: any): Promise<Express.Multer.File> {
    if (!value || !value.mimetype) {
      throw new BadRequestException('文件格式不支持');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/bmp',
    ];

    if (!allowedMimeTypes.includes(value.mimetype)) {
      throw new BadRequestException(`不支持的文件格式: ${value.mimetype}`);
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (value.size > maxSize) {
      throw new BadRequestException('文件大小不能超过50MB');
    }

    return value;
  }
}
```

---

## 图片处理规范

### 1. 图片转换架构

#### 1.1 转换服务设计

```typescript
@Injectable()
export class ImageConversionService {
  /**
   * 获取图片元数据
   */
  async getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
    const metadata = await sharp(buffer).metadata();
    return {
      format: metadata.format || 'unknown',
      hasAlpha: metadata.hasAlpha || false,
      pages: metadata.pages || 1,
      width: metadata.width || 0,
      height: metadata.height || 0,
      hasTransparency: !!(metadata.hasAlpha),
      isAnimated: (metadata.pages || 1) > 1,
    };
  }

  /**
   * 创建转换计划
   */
  createConversionPlan(metadata: ImageMetadata): ConversionPlan {
    const { format, hasTransparency, isAnimated } = metadata;

    return {
      shouldGenerateJpeg: format !== 'svg' && !isAnimated,
      shouldGenerateWebp: format !== 'svg',
      shouldGenerateAvif: format !== 'svg',
      needsTransparencyHandling: hasTransparency,
      isAnimated,
      originalFormat: format,
    };
  }

  /**
   * 批量转换图片
   */
  async convertImageBatch(
    buffer: Buffer,
    formats: ('jpeg' | 'webp' | 'avif')[],
    quality: number = 1,
    metadata?: ImageMetadata,
  ): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];
    const imageMetadata = metadata || await this.getImageMetadata(buffer);

    for (const format of formats) {
      try {
        const result = await this.convertSingleFormat(buffer, format, quality, imageMetadata);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          format,
          error: error.message,
        });
      }
    }

    return results;
  }
}
```

#### 1.2 转换规则表

| 原始格式 | 生成JPG | 生成WebP | 生成AVIF | 特殊处理 |
|---------|---------|----------|----------|----------|
| SVG     | ❌      | ❌       | ❌       | 跳过转换 |
| JPEG    | ✅      | ✅       | ✅       | - |
| PNG     | ✅ (非动画) | ✅    | ✅       | 透明填白 |
| GIF     | ❌      | ✅       | ✅       | 动画支持 |
| WebP    | ✅ (非动画) | ✅    | ✅       | 动画支持 |
| AVIF    | ✅ (非动画) | ✅    | ✅       | 动画支持 |
| HEIF    | ✅ (非动画) | ✅    | ✅       | 动画支持 |
| **BMP** | ✅       | ✅       | ✅       | 无损WebP替换原图 |

### 2. 质量参数规范

#### 2.1 质量预设定义

```typescript
export const QUALITY_MAPPING = {
  1: 'general',        // 通用 - 平衡质量和大小
  2: 'highQuality',    // 高质量 - 最佳质量
  3: 'extremeCompression', // 极限压缩 - 最小文件大小
  4: 'uiSharp'         // UI锐利 - 适合UI界面
} as const;

export type QualityType = keyof typeof QUALITY_MAPPING;
```

#### 2.2 转换参数配置

```typescript
// JPEG参数
export const JPEG_PRESETS = {
  general: {
    quality: 85,
    progressive: true,
    chromaSubsampling: '4:4:4',
    strip: true,
  },
  highQuality: {
    quality: 95,
    progressive: true,
    chromaSubsampling: '4:2:0',
    strip: true,
  },
  extremeCompression: {
    quality: 60,
    progressive: true,
    chromaSubsampling: '4:2:0',
    strip: true,
  },
  uiSharp: {
    quality: 90,
    progressive: true,
    chromaSubsampling: '4:4:4',
    strip: true,
    sharpen: true,
  },
};

// WebP参数（支持透明度和动画）
export const WEBP_PRESETS = {
  general: (hasTransparency, isAnimated) => ({
    quality: 85,
    alphaQuality: hasTransparency ? 80 : undefined,
    lossless: false,
    reductionEffort: 6,
    smartSubsample: true,
    animated: isAnimated,
  }),
  highQuality: (hasTransparency, isAnimated) => ({
    quality: 95,
    alphaQuality: hasTransparency ? 90 : undefined,
    lossless: false,
    reductionEffort: 4,
    smartSubsample: false,
    animated: isAnimated,
  }),
  extremeCompression: (hasTransparency, isAnimated) => ({
    quality: 65,
    alphaQuality: hasTransparency ? 60 : undefined,
    lossless: false,
    reductionEffort: 6,
    smartSubsample: true,
    animated: isAnimated,
  }),
  uiSharp: (hasTransparency, isAnimated) => ({
    quality: 90,
    alphaQuality: hasTransparency ? 85 : undefined,
    lossless: false,
    reductionEffort: 4,
    smartSubsample: false,
    sharpen: true,
    animated: isAnimated,
  }),
};

// AVIF参数
export const AVIF_PRESETS = {
  general: (hasTransparency, isAnimated) => ({
    quality: 70,
    alphaQuality: hasTransparency ? 65 : undefined,
    chromaSubsampling: '4:4:4',
    speed: 0,
    animated: isAnimated,
  }),
  highQuality: (hasTransparency, isAnimated) => ({
    quality: 85,
    alphaQuality: hasTransparency ? 80 : undefined,
    chromaSubsampling: '4:2:0',
    speed: 2,
    animated: isAnimated,
  }),
  extremeCompression: (hasTransparency, isAnimated) => ({
    quality: 55,
    alphaQuality: hasTransparency ? 50 : undefined,
    chromaSubsampling: '4:2:0',
    speed: 6,
    animated: isAnimated,
  }),
  uiSharp: (hasTransparency, isAnimated) => ({
    quality: 80,
    alphaQuality: hasTransparency ? 75 : undefined,
    chromaSubsampling: '4:4:4',
    speed: 2,
    sharpen: true,
    animated: isAnimated,
  }),
};
```

### 3. 存储路径规范

#### 3.1 MinIO 存储结构

```
MinIO Bucket:
├── originals/                    # 原始文件存储目录
│   └── {secureUrl}.{ext}        # 原始文件
│
└── processed/                  # 转换后文件存储目录
    ├── {secureUrl}.jpg         # JPG格式
    ├── {secureUrl}.webp        # WebP格式
    └── {secureUrl}.avif        # AVIF格式
```

#### 3.2 安全URL生成

```typescript
// 使用Feistel网络生成安全URL
const secureUrl = this.secureIdUtil.encode(BigInt(imageId));

// 生成存储路径
const originalKey = `originals/${secureUrl}.${originalExtension}`;
const jpegKey = `processed/${secureUrl}.jpg`;
const webpKey = `processed/${secureUrl}.webp`;
const avifKey = `processed/${secureUrl}.avif`;
```

### 4. BMP 特殊处理规范

#### 4.1 BMP 处理流程

1. **无损转换**: 将原始BMP转换为无损WebP作为原图
2. **多格式生成**: 同时生成JPG、有损WebP、AVIF三种格式
3. **路径管理**: 无损WebP存储在originals/，其他格式存储在processed/

```typescript
// BMP特殊处理示例
if (format === 'bmp') {
  const bmpResult = await this.imageConversionService.convertBmpToLosslessWebP(fileData.buffer);
  if (bmpResult.success) {
    originalBuffer = bmpResult.buffer;
    originalKey = `originals/${secureUrl}.webp`; // 替换原图
    originalMimeType = 'image/webp';
  } else {
    throw new InternalServerErrorException(`BMP转换失败: ${bmpResult.error}`);
  }
}
```

#### 4.2 无损WebP参数

```typescript
export const BMP_LOSSLESS_WEBP_PARAM = {
  lossless: true,
  reductionEffort: 6,
  quality: 100,
};
```

### 5. 元数据提取规范

#### 5.1 图片元数据结构

```typescript
interface ImageMetadata {
  format: string;           // 原始格式 (jpeg, png, gif, etc.)
  hasAlpha: boolean;        // 是否有Alpha通道
  pages?: number;          // 帧数（动画图片）
  width: number;           // 宽度
  height: number;          // 高度
  hasTransparency: boolean; // 是否包含透明区域
  isAnimated: boolean;     // 是否为动画
}
```

---

## 测试规范

### 1. 测试文件组织

```
src/
├── modules/
│   └── user/
│       ├── user.service.spec.ts
│       ├── user.repository.spec.ts
│       └── controllers/
│           └── protected-user.controller.spec.ts
├── services/
│   └── storage.service.spec.ts
└── utils/
    └── snowflake.util.spec.ts
```

### 2. 单元测试规范

#### 2.1 测试结构

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(UserRepository);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const userId = '123456789';
      const expectedUser = { id: userId, userName: 'testuser' };

      repository.findById.mockResolvedValue(expectedUser as User);

      const result = await service.findById(userId);

      expect(repository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedUser);
    });

    it('should return null when user not found', async () => {
      const userId = 'nonexistent';

      repository.findById.mockResolvedValue(null);

      const result = await service.findById(userId);

      expect(repository.findById).toHaveBeenCalledWith(userId);
      expect(result).toBeNull();
    });

    it('should throw error when repository fails', async () => {
      const userId = '123456789';
      const error = new Error('Database error');

      repository.findById.mockRejectedValue(error);

      await expect(service.findById(userId)).rejects.toThrow('Database error');
    });
  });
});
```

#### 2.2 测试覆盖率要求

- **单元测试覆盖率**: 不低于 80%
- **关键业务逻辑**: 100% 覆盖
- **Repository 层**: 100% 覆盖（包括缓存逻辑）
- **Service 层**: 100% 覆盖
- **Controller 层**: 80% 以上覆盖

### 3. 集成测试规范

```typescript
describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('/auth/login (POST)', () => {
    it('should login successfully with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          userName: 'testuser',
          passWord: 'Password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.token).toBeDefined();
          expect(res.body.data.expires_in).toBeDefined();
        });
    });

    it('should return 401 with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          userName: 'testuser',
          passWord: 'wrongpassword',
        })
        .expect(401);
    });
  });
});
```

### 4. 测试数据管理

```typescript
export const TestDataBuilder = {
  user: (overrides = {}) => ({
    id: '123456789',
    userName: 'testuser',
    passWord: 'hashedPassword',
    userType: 10,
    userStatus: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  image: (overrides = {}) => ({
    id: '987654321',
    userId: '123456789',
    albumId: '0',
    originalName: 'test.jpg',
    title: 'Test Image',
    imageHash: 'abc123',
    imageSize: 1024000,
    imageMimeType: 'image/jpeg',
    imageWidth: 1920,
    imageHeight: 1080,
    hasTransparency: false,
    isAnimated: false,
    ...overrides,
  }),
};
```

---

## 文档规范

### 1. Swagger 文档规范

#### 1.1 API 文档注解

```typescript
@ApiTags('用户管理')
@Controller('user')
@UseGuards(TokenGuard)
@ApiBearerAuth('token')
export class ProtectedUserController {
  @Get('profile')
  @ApiOperation({ summary: '获取当前用户详细信息' })
  @ApiResponse({ status: 200, description: '获取成功', type: UserProfileResponseDto })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getCurrentUser(@CurrentUserId() userId: string): Promise<any> {
    return this.userService.findById(userId);
  }

  @Get('check-auth')
  @ApiOperation({ summary: '检查认证状态' })
  @ApiResponse({ status: 200, description: '认证有效' })
  @ApiResponse({ status: 401, description: '未授权或Token已过期' })
  async checkAuth(@CurrentUserId() userId: string): Promise<{ authenticated: boolean; userId: string }> {
    return {
      authenticated: true,
      userId,
    };
  }
}
```

#### 1.2 DTO 文档注解

```typescript
export class CreateUserDto {
  @ApiProperty({
    description: '用户名',
    example: 'testuser',
    minLength: 3,
    maxLength: 20,
    pattern: '^[a-zA-Z0-9_]+$',
  })
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  userName: string;

  @ApiProperty({
    description: '密码',
    example: 'Password123',
    minLength: 8,
    format: 'password',
  })
  @IsString()
  @MinLength(8)
  @StrongPassword()
  passWord: string;
}

export class UserResponseDto {
  @ApiProperty({ description: '用户ID', example: '1234567890123456789' })
  id: string;

  @ApiProperty({ description: '用户名', example: 'testuser' })
  userName: string;

  @ApiProperty({ description: '用户类型', example: 10, enum: [1, 10] })
  userType: number;

  @ApiProperty({ description: '用户状态', example: 1, enum: [1, 2] })
  userStatus: number;

  @ApiProperty({ description: '创建时间', example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间', example: '2023-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
```

#### 1.3 全局 Swagger 配置

```typescript
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('NestEidos API')
    .setDescription('企业级图床服务 API 文档')
    .setVersion('2.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'token',
      in: 'header',
      description: '认证Token，格式: Bearer <token>',
    })
    .addTag('认证', '用户认证相关接口')
    .addTag('用户管理', '用户信息管理接口')
    .addTag('相册管理', '相册CRUD操作接口')
    .addTag('图片管理', '图片上传和管理接口')
    .addTag('图片访问', '图片公开访问接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'NestEidos API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .topbar-wrapper img { content: url('data:image/svg+xml;base64,...'); }
      .swagger-ui .topbar { background-color: #1b1b1b; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'none',
    },
  });
}
```

### 2. 代码注释规范

#### 2.1 JSDoc 注释

```typescript
/**
 * 图片上传服务
 *
 * @description 处理图片上传、格式转换和存储的核心服务
 *
 * @class ImageService
 * @author NestEidos Team
 * @version 2.0.0
 * @since 1.0.0
 */
@Injectable()
export class ImageService {
  /**
   * 上传并处理图片
   *
   * @description 支持多格式图片上传，自动进行格式转换和质量优化
   *
   * @param {CreateImageDto} createImageDto - 图片上传配置
   * @param {string} userId - 用户ID
   * @param {Express.Multer.File} fileData - 上传的文件数据
   * @returns {Promise<Image>} 处理后的图片实体
   *
   * @throws {BadRequestException} 当文件格式不支持时
   * @throws {InternalServerErrorException} 当图片处理失败时
   *
   * @example
   * ```typescript
   * const dto = new CreateImageDto();
   * dto.quality = 2; // 高质量
   * dto.title = '我的图片';
   *
   * const result = await imageService.create(dto, userId, file);
   * console.log(`图片上传成功: ${result.id}`);
   * ```
   */
  async create(
    createImageDto: CreateImageDto,
    userId: string,
    fileData: Express.Multer.File,
  ): Promise<Image> {
    // 实现代码...
  }

  /**
   * 计算图片哈希值
   *
   * @description 使用MD5算法计算图片内容的哈希值，用于完整性校验
   *
   * @private
   * @param {Buffer} buffer - 图片数据
   * @returns {string} MD5哈希值
   */
  private calculateImageHash(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }
}
```

#### 2.2 复杂逻辑注释

```typescript
async handleImageAccess(key: string, ext: string | null, res: Response) {
  try {
    // 1. 解码安全ID获取图片真实ID
    let imageId: bigint;
    try {
      imageId = this.secureIdUtil.decode(key);
    } catch (error) {
      // 安全ID解码失败，可能是无效或损坏的ID
      this.logger.warn(`无效的 secure ID: ${key}`);
      return this.returnNotFoundImage(res, 'minimal_icon');
    }

    // 2. 查询数据库获取图片信息
    const image = await this.imageService.findById(imageId.toString());
    if (!image) {
      this.logger.warn(`图片不存在: ID=${imageId}`);
      return this.returnNotFoundImage(res, 'minimal_icon');
    }

    // 3. 检查图片过期策略
    if (image.expirePolicy !== 1) {
      const now = new Date();
      const expiresAt = new Date(image.expiresAt);
      if (now > expiresAt) {
        this.logger.warn(`图片已过期: ID=${imageId}, expiresAt=${expiresAt}`);
        return this.returnNotFoundImage(res, 'minimal_icon');
      }
    }

    // 4. 确定返回的图片格式和MIME类型
    let imageKey: string | null = null;
    let mimeType: string = 'image/jpeg';

    if (ext) {
      // 用户指定了格式后缀，优先返回指定格式
      imageKey = this.getImageKeyByExt(image, ext);
      mimeType = this.getMimeTypeByExt(ext);

      if (!imageKey) {
        this.logger.warn(`指定格式的图片不存在: ID=${imageId}, ext=${ext}`);
        return this.returnNotFoundImage(res, 'minimal_icon');
      }
    } else {
      // 用户未指定格式，返回默认格式
      imageKey = this.getImageKeyByDefaultFormat(image);
      mimeType = this.getMimeTypeByFormat(image.defaultFormat);

      if (!imageKey) {
        // 默认格式不存在，依次尝试其他格式
        const fallbackOrder = ['webp', 'jpeg', 'avif', 'original'];
        for (const format of fallbackOrder) {
          imageKey = this.getImageKeyByFormat(image, format);
          if (imageKey) {
            mimeType = this.getMimeTypeByFormat(format);
            break;
          }
        }
      }
    }

    if (!imageKey) {
      this.logger.warn(`图片文件均不存在: ID=${imageId}`);
      return this.returnNotFoundImage(res, 'minimal_icon');
    }

    // 5. 从MinIO获取图片数据并返回
    const imageBuffer = await this.storageService.download(imageKey);

    res.set({
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000', // 缓存一年
      'ETag': `"${image.imageHash}"`, // 使用图片哈希作为ETag
      'X-Image-ID': imageId.toString(),
      'X-Image-Format': ext || image.defaultFormat,
    });

    res.send(imageBuffer);

  } catch (error) {
    this.logger.error(`处理图片访问失败: key=${key}, ext=${ext}`, error);
    return this.returnNotFoundImage(res, 'minimal_icon');
  }
}
```

---

## 开发工具配置

### 1. ESLint 配置

```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/prefer-number-properties": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-module-boundary-types": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "radix": "error"
  }
}
```

### 2. Prettier 配置

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### 3. 提交规范

使用约定式提交格式：

```bash
# 提交格式
<type>(<scope>): <subject>

<body>

<footer>
```

**类型说明**:
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动
- `perf`: 性能优化

**示例**:
```bash
feat(auth): 添加Token自动刷新机制

- 支持Token过期前30分钟自动刷新
- 新增Token刷新接口 /auth/refresh
- 更新TokenGuard支持刷新Token验证

Closes #123
```

### 4. Git Hooks 配置

使用 Husky 和 lint-staged 确保代码质量：

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS",
      "pre-push": "npm run test:unit"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ],
    "*.{json,md}": [
      "prettier --write",
      "git add"
    ]
  }
}
```

---

## 总结

本文档定义了 NestEidos 项目的完整开发规范，涵盖代码组织、架构设计、安全实践、测试要求等各个方面。所有开发者在提交代码前应确保符合这些规范，以保证项目的代码质量和架构一致性。

### 核心原则回顾

1. **Repository 模式**: 所有数据访问通过 Repository 层，统一管理缓存
2. **缓存优先**: 合理使用 Redis 缓存提升性能，支持缓存穿透防护
3. **安全第一**: 多层安全防护，包括认证、授权、输入验证
4. **测试驱动**: 确保关键业务逻辑的测试覆盖率
5. **文档完整**: 完整的 API 文档和代码注释

### 版本历史

- **v1.0.0**: 初始版本，定义基础规范
- **v2.0.0**: 更新 Repository 层规范，完善缓存设计，添加图片处理规范

---

**注意**: 本文档是活文档，会随着项目的发展不断更新。所有开发者在提交代码前应确保符合这些规范。