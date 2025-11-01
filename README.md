# NestEidos - 轻量级图床服务

## 项目简介

NestEidos 是一个基于 Node.js 和 Nest.js 框架构建的轻量级图床服务，提供用户注册、相册管理、图片上传存储等功能。系统采用现代化的技术栈，支持多种图片格式转换和存储优化。

## 技术栈

### 后端框架
- **Nest.js** - 基于 TypeScript 的 Node.js 应用框架，提供模块化架构和依赖注入
- **TypeScript** - 类型安全的 JavaScript 超集，提供更好的开发体验和代码质量

### 数据库与 ORM
- **PostgreSQL** - 主数据库，存储用户、相册和图片元数据
- **TypeORM** - 对象关系映射工具，提供数据库抽象层和迁移管理
- **Redis** - 内存缓存数据库，用于会话存储和性能优化

### 对象存储
- **MinIO** - S3 兼容的对象存储服务，用于存储原始图片和转换后的格式
- **Sharp** - 高性能图片处理库，支持格式转换、缩放等操作

### 认证与安全
- **自定义Token认证** - 轻量级认证系统，替代传统JWT
- **BCrypt** - 密码哈希加密
- **雪花算法** - 分布式ID生成，确保ID唯一性
- **Feistel网络PRP** - 安全ID加密，保护敏感数据

### API文档
- **Swagger** - 自动生成API文档，提供交互式文档界面

### 开发工具
- **Jest** - 单元测试和集成测试框架
- **ESLint & Prettier** - 代码质量和格式化工具
- **SWC** - 快速TypeScript编译器

## 项目架构

### 目录结构
```
src/
├── app.module.ts                 # 根模块
├── main.ts                       # 应用入口
├── config/                       # 配置文件
│   ├── auth.config.ts           # 认证配置
│   ├── redis.config.ts          # Redis配置
│   └── typeorm.config.ts        # 数据库配置
├── modules/                      # 业务模块
│   ├── auth/                    # 认证模块
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   └── guards/              # 认证守卫
│   ├── user/                    # 用户模块
│   │   ├── user.module.ts
│   │   ├── user.service.ts
│   │   ├── entities/            # 用户实体
│   │   └── dto/                 # 数据传输对象
│   ├── album/                   # 相册模块
│   │   ├── album.module.ts
│   │   ├── album.service.ts
│   │   ├── entities/            # 相册实体
│   │   └── dto/                 # 数据传输对象
│   ├── image/                   # 图片模块
│   │   ├── image.module.ts
│   │   ├── image.service.ts
│   │   ├── entities/            # 图片实体
│   │   ├── dto/                 # 数据传输对象
│   │   └── controllers/         # 控制器
│   └── redis/                   # Redis模块
│       ├── redis.module.ts
│       └── cache.service.ts
├── utils/                        # 工具类
│   ├── snowflake.util.ts        # 雪花算法ID生成
│   └── secure-id.util.ts        # 安全ID处理
├── services/                     # 业务服务
│   ├── storage.service.ts       # 对象存储服务
│   └── temp-file.service.ts     # 临时文件处理
├── interceptors/                 # 拦截器
│   └── response.interceptor.ts  # 响应拦截器
├── filters/                      # 异常过滤器
│   └── http-exception.filter.ts
├── decorators/                   # 装饰器
│   └── strong-password.decorator.ts
├── pipes/                        # 管道
│   └── file-validation.pipe.ts  # 文件验证管道
├── constants/                    # 常量定义
│   └── mime-type.constant.ts
└── database/migrations/          # 数据库迁移文件
```

### 数据库设计

系统采用三个核心数据表，遵循简化设计原则，避免过度规范化：

#### 用户表 (user)
- **字段**: id, user_name, pass_word, user_type, user_status, created_at, updated_at
- **功能**: 存储用户基本信息和认证数据
- **用户类型**: 1-管理员, 10-普通用户
- **用户状态**: 1-正常, 2-封锁
- **ID生成**: 使用雪花算法生成唯一ID

#### 相册表 (album)
- **字段**: id, user_id, album_name, created_at, updated_at
- **功能**: 管理用户的相册分类
- **关联**: 每个相册属于一个特定用户
- **默认相册**: album_id = 0 表示未分类

#### 图片表 (image) - 统一存储设计
- **基础字段**: id, user_id, album_id, original_name, title, created_at, updated_at
- **文件元数据**: image_hash, image_size, image_mime_type, image_width, image_height
- **存储路径**: original_key, jpeg_key, webp_key, avif_key (统一表结构，无需关联文件表)
- **格式标识**: has_jpeg, has_webp, has_avif
- **配置字段**: default_format, expire_policy, expires_at
- **扩展字段**: nsfw_score (预留)
- **功能**: 存储图片所有相关信息，包括业务数据和存储信息
- **特性**:
  - 不再进行文件去重（image_hash 仅用于存储）
  - 支持过期策略（永久、限时保留、限时删除）
  - 支持默认返回格式设置（original/webp/avif）
  - 统一存储路径结构（originals/ 和 processed/）

**设计优势：**
- **查询效率**: 避免复杂的 JOIN 查询，单表获取所有图片信息
- **简化架构**: 移除文件表关联，降低系统复杂度
- **功能完整**: 支持多格式存储、过期管理、NSFW检测等高级功能

### 核心功能模块

#### 1. 认证模块 (Auth)
- 用户注册和登录
- 自定义Token认证机制
- 密码强度验证
- 认证守卫保护

#### 2. 用户模块 (User)
- 用户信息管理
- 权限控制
- 用户状态管理

#### 3. 相册模块 (Album)
- 相册创建和管理
- 相册与用户关联
- 图片分类组织

#### 4. 图片模块 (Image)
- 图片上传处理（支持多种格式）
- 多格式自动转换 (JPEG, WebP, AVIF)
- 图片元数据提取和存储
- 过期策略管理（永久/限时）
- 图片查询和管理
- NSFW 内容检测（预留）
- 统一存储路径管理

#### 5. 存储服务 (Storage)
- MinIO对象存储集成
- 多格式图片处理
- 临时文件管理

### 技术特性

#### 性能优化
- Redis缓存支持
- 图片格式转换 (WebP, AVIF)
- 批量操作支持
- 数据库索引优化

#### 安全特性
- 密码BCrypt加密
- 安全ID加密机制
- 文件类型验证
- 访问权限控制

#### 开发特性
- TypeScript类型安全
- 模块化架构设计
- 自动化测试支持
- Swagger API文档
- 代码规范检查

### 部署和运行

#### 环境准备

```bash
npm install
```

#### 启动项目

```bash
npm run start:dev
```

#### 访问项目

1. 通过命令终端访问

```bash
curl --location --request GET 'http://localhost:3000'
```

2. 通过浏览器访问

```bash
http://localhost:3000
```

#### API文档
- Swagger UI: `http://localhost:3000/api`
- JSON格式: `http://localhost:3000/api-json`

#### 开发环境特性
- 支持热重载开发
- 数据库迁移管理
- 环境配置支持

## 项目优势

1. **轻量级设计**: 专注核心功能，避免过度复杂化
2. **现代化技术栈**: 采用当前主流技术和最佳实践
3. **高性能存储**: 支持多种图片格式和压缩优化
4. **安全可靠**: 完善的认证和数据保护机制
5. **易于扩展**: 模块化架构支持功能扩展
6. **开发友好**: 完整的TypeScript支持和自动化工具

该项目适合作为个人或小团队的图床解决方案，提供了完整的图片管理和存储功能，同时保持了良好的代码质量和可维护性。