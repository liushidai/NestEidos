# 编码规范和最佳实践

本文档记录了项目开发过程中需要遵循的编码规范和最佳实践，确保代码质量和一致性。

## TypeScript/JavaScript 最佳实践

### 1. parseInt 使用规范

**原则：** 始终使用 `Number.parseInt` 而不是全局 `parseInt`，并提供基数参数。

**正确示例：**
```typescript
// ✅ 正确：使用 Number.parseInt 并提供基数
const port = Number.parseInt(configService.get<string>('PORT', '3000'), 10);
const userId = Number.parseInt(userIdStr, 10);
const page = Number.parseInt(pageStr || '1', 10);
```

**错误示例：**
```typescript
// ❌ 错误：使用全局 parseInt
const port = parseInt(configService.get<string>('PORT', '3000'), 10);

// ❌ 错误：缺少基数参数
const port = Number.parseInt(configService.get<string>('PORT', '3000'));

// ❌ 错误：全局 parseInt 且缺少基数
const port = parseInt(configService.get<string>('PORT', '3000'));
```

**原因：**
- 避免全局命名空间污染
- 防止八进制解析歧义（如 '08' 在旧版 JS 中会被解析为八进制）
- 提高代码可读性和一致性
- 符合 TypeScript 最佳实践

**ESLint 规则：**
- `@typescript-eslint/prefer-number-properties`: 强制使用 `Number.parseInt`
- `radix`: 要求提供基数参数

### 2. 变量和常量命名

**原则：** 使用描述性的变量名，遵循驼峰命名法。

```typescript
// ✅ 正确
const maxRetryAttempts = 3;
const isAuthenticated = true;
const userAccessToken = token;

// ❌ 错误
const max = 3;
const auth = true;
const token = accessToken;
```

### 3. 错误处理

**原则：** 始终处理可能的错误情况。

```typescript
// ✅ 正确
try {
  const result = await apiCall();
  return result;
} catch (error) {
  logger.error('API call failed', error);
  throw new InternalServerErrorException('操作失败');
}

// ❌ 错误：没有错误处理
const result = await apiCall();
return result;
```

## 代码组织

### 1. 文件结构

```
src/
├── modules/
│   └── {module-name}/
│       ├── entities/          # 数据库实体
│       ├── dto/              # 数据传输对象
│       ├── controllers/      # 控制器
│       ├── services/         # 业务逻辑
│       ├── repositories/     # 数据访问层（Repository）
│       ├── guards/           # 守卫
│       └── {module-name}.module.ts
├── config/                   # 配置文件
├── common/                   # 公共组件
├── utils/                    # 工具函数
├── pipes/                    # 管道
└── redis/                    # Redis 缓存服务
```

### 2. 导入顺序

1. Node.js 内置模块
2. 第三方库
3. 项目内部模块（按路径层级排序）
4. 相对路径导入

```typescript
// ✅ 正确的导入顺序
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
```

## 数据库和 ORM

### 1. 实体定义

**原则：** 使用雪花算法生成 ID，自动管理时间戳。

```typescript
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string; // 使用雪花算法生成的 UUID

  @Column()
  name: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date; // 自动设置创建时间

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date; // 自动更新修改时间
}
```

### 2. 数据库配置

- 使用环境变量配置数据库连接
- 生产环境禁用 `synchronize`
- 启用连接池配置

## API 设计

### 1. RESTful API 规范

- 使用复数名词作为资源名：`/api/users`, `/api/albums`
- 使用 HTTP 方法表示操作：GET（查询）、POST（创建）、PUT/PATCH（更新）、DELETE（删除）
- 使用 HTTP 状态码表示结果：200（成功）、201（创建）、400（客户端错误）、500（服务器错误）

### 2. 认证和授权

- 所有需要认证的接口使用 `@UseGuards(TokenGuard)`
- Swagger 文档中添加 `@ApiBearerAuth('token')` 装饰器
- 在请求头中使用 `Authorization: Bearer <token>` 格式

## 文档规范

### 1. Swagger 文档

**原则：** 为所有 API 端点提供完整的 Swagger 文档。

```typescript
@ApiOperation({ summary: '获取用户信息' })
@ApiResponse({ status: 200, description: '获取成功' })
@ApiResponse({ status: 401, description: '未授权' })
@ApiResponse({ status: 404, description: '用户不存在' })
@Get(':id')
async getUser(@Param('id') id: string) {
  return this.userService.findById(id);
}
```

### 2. 代码注释

- 为复杂的业务逻辑添加注释
- 说明算法的用途和实现方式
- 避免显而易见的注释

## 测试规范

### 1. 单元测试

- 测试文件名：`*.spec.ts`
- 测试覆盖率目标：80% 以上
- 使用描述性的测试名称

```typescript
describe('UserService', () => {
  describe('findById', () => {
    it('should return user when found', async () => {
      // 测试用户存在的情况
    });

    it('should throw NotFoundException when user not found', async () => {
      // 测试用户不存在的情况
    });
  });
});
```

## 环境配置

### 1. 环境变量

- 所有配置使用环境变量
- 提供合理的默认值
- 敏感信息不提交到版本控制

### 2. 配置验证

- 应用启动时验证所有必需的配置
- 提供清晰的错误信息

## 代码质量工具

### 1. ESLint

项目配置了以下 ESLint 规则：
- `@typescript-eslint/prefer-number-properties`: 强制使用 `Number.parseInt`
- `radix`: 要求提供基数参数
- `@typescript-eslint/no-floating-promises`: 检测未处理的 Promise

### 2. Prettier

使用 Prettier 进行代码格式化，确保代码风格一致。

### 3. 提交规范

使用约定式提交格式：
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

## Repository 层设计规范

### 1. Repository 层职责

**原则：** Repository 层负责数据访问操作和缓存管理，封装数据库交互逻辑，为上层 Service 提供统一的数据访问接口。

**文件位置：** `src/modules/{module-name}/repositories/{entity-name}.repository.ts`

**核心职责：**
- 数据库 CRUD 操作
- Redis 缓存管理
- 数据一致性保证
- 性能优化（缓存策略）

**示例：**
```typescript
@Injectable()
export class UserRepository {
  private readonly CACHE_TTL = 3600; // 1小时缓存

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}

  async findById(id: string): Promise<User | null> {
    const cacheKey = `user:id:${id}`;

    // 尝试从缓存获取
    const cachedUser = await this.cacheService.get<User>(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    // 缓存未命中，从数据库获取
    const user = await this.userRepository.findOneBy({ id });
    if (user) {
      await this.cacheService.set(cacheKey, user, this.CACHE_TTL);
    }

    return user;
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user);

    // 清理相关缓存
    await this.clearUserCache(savedUser.id, savedUser.userName);

    return savedUser;
  }
}
```

### 2. Repository 层命名规范

- 类名：`{EntityName}Repository`（如 `UserRepository`）
- 文件名：`{entity-name}.repository.ts`
- 方法名：使用描述性的动词，如 `findById`、`findByUserName`、`create`、`update`、`delete`

### 3. 缓存管理职责

- **缓存策略定义**：在 Repository 层定义 TTL 和缓存键规则
- **缓存操作封装**：统一管理缓存的设置、获取、清理
- **数据一致性**：确保缓存与数据库数据的一致性
- **性能优化**：通过减少数据库访问提升性能

### 4. 错误处理

- 所有数据库操作都应包含 try-catch 块
- 使用结构化日志记录错误信息
- 重新抛出异常供上层处理
- 缓存操作失败不应影响主要功能

## 缓存设计规范

### 1. 缓存策略

**原则：** 缓存控制逻辑集中在 Repository 层，实现透明的缓存管理，上层 Service 无需关心缓存细节。

**缓存键命名规范：**
```
{module}:{type}:{identifier}
```

**示例：**
- `user:id:1234567890123456789` - 根据 ID 缓存用户
- `user:username:testuser` - 根据用户名缓存用户
- `user:exists:username:testuser` - 用户名存在性检查缓存

### 2. Repository 层缓存实现

**Repository 层负责所有缓存操作：**
```typescript
@Injectable()
export class UserRepository {
  private readonly CACHE_TTL = 3600; // 1小时缓存
  private readonly EXISTS_CACHE_TTL = 300; // 5分钟缓存

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}

  async findById(id: string): Promise<User | null> {
    const cacheKey = `user:id:${id}`;

    // Repository 层统一处理缓存逻辑
    const cachedUser = await this.cacheService.get<User>(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.userRepository.findOneBy({ id });
    if (user) {
      await this.cacheService.set(cacheKey, user, this.CACHE_TTL);
    }

    return user;
  }
}
```

### 3. Service 层简化

**Service 层专注于业务逻辑，不处理缓存：**
```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async findById(id: string): Promise<User | null> {
    // Service 层直接调用 Repository，无需关心缓存
    return this.userRepository.findById(id);
  }
}
```

### 4. 缓存失效管理

**原则：** Repository 层自动管理缓存失效，确保数据一致性。

```typescript
// 在 Repository 中的数据变更方法里自动清理缓存
async create(userData: Partial<User>): Promise<User> {
  const user = this.userRepository.create(userData);
  const savedUser = await this.userRepository.save(user);

  // 自动清理相关缓存
  await this.clearUserCache(savedUser.id, savedUser.userName);

  return savedUser;
}

private async clearUserCache(
  userId?: string,
  oldUserName?: string,
  newUserName?: string,
): Promise<void> {
  // 智能缓存清理逻辑
  const keysToDelete: string[] = [];
  // ... 缓存清理实现
}
```

### 5. 缓存 TTL 建议

- **用户数据：** 1-4 小时（用户信息变化不频繁）
- **存在性检查：** 5-15 分钟（可能经常变化）
- **配置数据：** 30 分钟-2 小时
- **临时数据：** 1-10 分钟

### 6. 缓存注意事项

- **透明性**：Repository 层提供透明的缓存服务
- **一致性**：数据变更时自动清理相关缓存
- **降级策略**：缓存失败不影响主要功能
- **监控**：定期监控缓存命中率和性能指标
- **安全性**：敏感数据不应缓存在明文中

## 模块依赖规范

### 1. 模块导出顺序

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule],
  controllers: [ProtectedUserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
```

### 2. 注入顺序

1. **Repository 层**：数据访问
2. **Service 层**：业务逻辑
3. **Controller 层**：API 接口

**构造函数注入顺序：**
```typescript
constructor(
  private readonly userRepository: UserRepository,    // 1. 数据访问层
  private readonly cacheService: CacheService,        // 2. 基础服务
) {}
```

## 安全最佳实践

### 1. 认证

- 使用自定义 Token 认证系统
- Token 设置合理的过期时间
- 实现 Token 刷新机制

### 2. 输入验证

- 使用 DTO 类验证输入数据
- 使用管道（Pipes）进行数据转换和验证
- 防止 SQL 注入和 XSS 攻击

### 3. 敏感信息

- 密码使用 bcrypt 加密
- 不在日志中记录敏感信息
- 使用环境变量存储密钥

### 4. 缓存安全

- 敏感数据不应缓存在明文中
- 缓存数据设置合理的过期时间
- 定期清理过期的缓存数据

---

**注意：** 本文档是活文档，会随着项目的发展不断更新。所有开发者在提交代码前应确保符合这些规范。