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
├── cache/                     # 统一缓存服务
│   ├── core/                   # 核心缓存服务
│   ├── config/                 # 缓存配置
│   ├── monitoring/             # 缓存监控
│   └── index.ts               # 统一导出
├── config/                     # 配置文件
├── common/                     # 公共组件
├── utils/                      # 工具函数
└── pipes/                      # 管道
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

## 缓存设计

### 1. Repository 层缓存

**原则：** Repository 层负责数据访问和缓存管理，Service 层专注业务逻辑。

**缓存目录结构：**
```
src/cache/
├── core/                   # 核心缓存服务
│   ├── cache.module.ts     # 缓存模块
│   ├── cache.service.ts    # 缓存服务
│   └── simple-cache.service.ts
├── config/                 # 缓存配置
│   └── ttl.config.ts      # TTL 配置
├── monitoring/             # 缓存监控
│   ├── cache-monitor.service.ts
│   └── redis.module.ts
└── index.ts               # 统一导出
```

**缓存键命名规范：**
```typescript
// ✅ 正确：使用 CacheKeyUtils 生成统一缓存键
const cacheKey = CacheKeyUtils.buildRepositoryKey('user', 'id', userId);

// 缓存键格式：repo:module:type:identifier
// 示例：repo:user:id:123456789
// 示例：repo:user:username:john_doe
```

**TTL 配置规范：**
```typescript
// ✅ 正确：使用预定义的 TTL 配置
private readonly CACHE_TTL = TTLUtils.toSeconds(TTL_CONFIGS.LONG_CACHE);

// TTL 配置类型：
// LONG_CACHE: 24小时 (86400秒)
// MEDIUM_CACHE: 30分钟 (1800秒)
// SHORT_CACHE: 5分钟 (300秒)
```

### 2. 缓存使用模式

**读取操作（带缓存）：**
```typescript
// ✅ Repository 层实现
async findById(id: string): Promise<User | null> {
  const cacheKey = CacheKeyUtils.buildRepositoryKey('user', 'id', id);

  // 尝试从缓存获取
  let user = await this.cacheService.get<User>(cacheKey);
  if (user) {
    return user;
  }

  // 缓存未命中，从数据库获取
  user = await this.userRepository.findOneBy({ id });
  if (user) {
    await this.cacheService.set(cacheKey, user, this.CACHE_TTL);
  }

  return user;
}
```

**写入操作（清理缓存）：**
```typescript
// ✅ 更新操作后清理相关缓存
async update(id: string, updateData: Partial<User>): Promise<User> {
  const user = await this.findById(id);
  if (!user) {
    throw new NotFoundException('用户不存在');
  }

  const updatedUser = { ...user, ...updateData };
  await this.userRepository.save(updatedUser);

  // 清理缓存
  const cacheKey = CacheKeyUtils.buildRepositoryKey('user', 'id', id);
  await this.cacheService.delete(cacheKey);

  return updatedUser;
}
```

### 3. 缓存监控

**性能监控：**
```typescript
// 缓存服务自动记录操作指标
this.monitorService.recordOperation('get', responseTime);
this.monitorService.recordOperation('set', responseTime);
this.monitorService.recordOperation('delete', responseTime);
```

**健康检查：**
- 监控缓存命中率
- 跟踪响应时间
- 记录错误率

### 4. 缓存导入规范

```typescript
// ✅ 正确：从统一缓存模块导入
import {
  SimpleCacheService,
  TTL_CONFIGS,
  TTLUtils,
  CacheKeyUtils,
  CacheModule
} from '@/cache';

// 模块导入
@Module({
  imports: [TypeOrmModule.forFeature([User]), CacheModule],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
```

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
  private readonly CACHE_TTL = TTLUtils.toSeconds(TTL_CONFIGS.USER_CACHE); // 24小时缓存

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}

  async findById(id: string): Promise<User | null> {
    const cacheKey = CacheKeyUtils.buildRepositoryKey('user', 'id', id);

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

### 1. 缓存架构

项目使用**简化缓存架构**，遵循明确的分层设计原则：

- **Repository 层**：负责数据库访问和缓存管理
- **Service 层**：专注业务逻辑，委托给Repository层
- **缓存策略**：简单的键值对缓存，手动管理缓存生命周期

### 2. SimpleCacheService

**核心缓存服务**，提供基本的缓存操作：

```typescript
import { SimpleCacheService } from '@/common/cache';

@Injectable()
export class UserRepository {
  constructor(
    private readonly cacheService: SimpleCacheService,
  ) {}

  async findById(id: string): Promise<User | null> {
    const cacheKey = CacheKeyUtils.buildRepositoryKey('user', 'id', id);

    // 尝试从缓存获取
    let user = await this.cacheService.get<User>(cacheKey);
    if (user) {
      return user;
    }

    // 缓存未命中，从数据库获取
    user = await this.userRepository.findOneBy({ id });
    if (user) {
      await this.cacheService.set(cacheKey, user, TTLUtils.toSeconds(TTL_CONFIGS.USER_CACHE)); // 24小时
    }

    return user;
  }
}
```

### 3. Repository 层缓存职责

**Repository 层统一管理所有缓存操作**：

#### 3.1 缓存键前缀管理

项目使用统一的缓存键前缀系统，确保不同业务模块的缓存键不会冲突：

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

**前缀管理的好处**：
- **避免冲突**：不同业务模块的缓存键不会相互干扰
- **便于管理**：可以通过前缀批量清理特定类型的缓存
- **易于监控**：缓存监控系统可以按前缀分类统计
- **扩展性**：新增业务模块时只需要使用标准的前缀格式

#### 3.2 缓存策略

- **查询方法**：`findById` 等通过ID查询的方法使用缓存
- **写操作方法**：`update`、`delete` 等方法自动清理相关缓存
- **分页接口**：不使用缓存（按需求）
- **实时查询**：`findByUserName` 等方法不使用缓存，保证数据实时性

#### 3.3 缓存键规范

**缓存键格式**：`{prefix}:{module}:{type}:{identifier}`

**统一前缀**：
- `repo:` - Repository层数据缓存前缀
- `auth:` - 认证Token缓存前缀

**示例**：
- `repo:user:id:123456789` - 用户ID查询
- `repo:user:username:testuser` - 用户名查询（如果有缓存）
- `repo:album:id:987654321` - 相册ID查询
- `auth:token:abc123` - 认证Token

**缓存键生成**：
```typescript
// 使用CacheKeyUtils工具类生成缓存键
const userKey = CacheKeyUtils.buildRepositoryKey('user', 'id', userId);
// 结果: 'repo:user:id:123456789'

const tokenKey = CacheKeyUtils.buildAuthKey('token', tokenId);
// 结果: 'auth:token:abc123'
```

#### 3.3 缓存穿透防护

**问题背景**：缓存穿透是指大量请求查询不存在的数据，导致请求直接穿透缓存访问数据库，造成数据库压力剧增。

**解决方案**：缓存空值（NULL Cache），当数据库查询结果为null时，将null值的标记缓存到Redis中。

**核心实现**：
```typescript
// TTL配置增加空值缓存时间
const TTL_CONFIGS = {
  LONG_CACHE: { value: 2, unit: 'hours' },     // 2小时 - 正常数据缓存
  NULL_CACHE: { value: 5, unit: 'minutes' },   // 5分钟 - 空值缓存
  // ... 其他配置
};

// 空值标记常量
const NULL_CACHE_VALUES = {
  NULL_PLACEHOLDER: '__NULL_CACHE_PLACEHOLDER__',
};
```

**Repository层实现**：
```typescript
async findById(id: string): Promise<User | null> {
  const cacheKey = CacheKeyUtils.buildRepositoryKey('user', 'id', id);

  // 尝试从缓存获取
  const cachedUser = await this.cacheService.get<User>(cacheKey);
  if (cachedUser !== undefined) {
    // 检查是否为缓存的空值标记
    if (TTLUtils.isNullCacheValue(cachedUser)) {
      this.logger.debug(`从缓存获取空值标记（缓存穿透防护）: ${id}`);
      return null;
    }
    this.logger.debug(`从缓存获取用户: ${id}`);
    return cachedUser;
  }

  // 缓存未命中，从数据库获取
  this.logger.debug(`从数据库获取用户: ${id}`);
  const user = await this.userRepository.findOneBy({ id });

  // 缓存结果（无论是否存在都缓存）
  if (user) {
    await this.cacheService.set(cacheKey, user, TTLUtils.toSeconds(TTL_CONFIGS.LONG_CACHE));
    this.logger.debug(`缓存用户数据: ${id}, TTL: ${this.CACHE_TTL}秒`);
  } else {
    // 缓存空值，防止缓存穿透
    const nullMarker = TTLUtils.toCacheableNullValue<User>();
    await this.cacheService.set(cacheKey, nullMarker, TTLUtils.toSeconds(TTL_CONFIGS.NULL_CACHE));
    this.logger.debug(`缓存空值标记（缓存穿透防护）: ${id}, TTL: ${this.NULL_CACHE_TTL}秒`);
  }

  return user;
}
```

**空值处理工具类**：
```typescript
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
    if (this.isNullCacheValue(cachedValue)) {
      return null;
    }
    return cachedValue;
  }
}
```

**缓存穿透防护策略**：
- **缓存时间**：空值缓存5分钟，正常数据缓存2小时
- **防护范围**：所有Repository层的`findById`、`findByIdAndUserId`等查询方法
- **更新清理**：当数据更新时，会自动清理相关的空值缓存
- **监控日志**：记录缓存穿透防护的触发情况

**测试验证**：
```typescript
describe('缓存穿透防护', () => {
  it('应该缓存空值防止缓存穿透', async () => {
    const cacheKey = 'repo:user:id:nonexistent';

    // 第一次查询 - 缓存未命中，数据库返回null
    jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(null);
    mockCacheService.get.mockResolvedValue(undefined);

    let result1 = await repository.findById('nonexistent');
    expect(result1).toBeNull();

    // 验证空值被缓存
    expect(mockCacheService.set).toHaveBeenCalledWith(
      cacheKey,
      NULL_CACHE_VALUES.NULL_PLACEHOLDER,
      TTLUtils.toSeconds(TTL_CONFIGS.NULL_CACHE)
    );

    // 第二次查询 - 从缓存获取空值标记
    mockCacheService.get.mockResolvedValue(NULL_CACHE_VALUES.NULL_PLACEHOLDER);
    jest.spyOn(userRepository, 'findOneBy').mockClear();

    let result2 = await repository.findById('nonexistent');
    expect(result2).toBeNull();

    // 验证数据库不再被调用
    expect(userRepository.findOneBy).not.toHaveBeenCalled();
  });
});
```

#### 3.4 TTL 策略

项目使用统一的TTL配置管理系统，支持不同业务场景的缓存时间需求：

```typescript
// TTL配置接口
interface TTLConfig {
  value: number;
  unit: TTLUnit; // SECONDS, MINUTES, HOURS, DAYS
}

// 标准缓存时间配置
const TTL_CONFIGS = {
  USER_CACHE: { value: 24, unit: 'hours' },      // 24小时 - 用户信息缓存
  AUTH_TOKEN: { value: 30, unit: 'days' },       // 30天 - 认证Token缓存
  SHORT_CACHE: { value: 5, unit: 'minutes' },    // 5分钟 - 频繁查询数据
  MEDIUM_CACHE: { value: 30, unit: 'minutes' },  // 30分钟 - 一般业务数据
  LONG_CACHE: { value: 2, unit: 'hours' },       // 2小时 - 稳定数据
  DEFAULT_CACHE: { value: 4, unit: 'hours' },    // 4小时 - 默认缓存
};
```

**缓存时间选择原则**：
- **用户信息**：24小时 - 用户数据相对稳定，适合长时间缓存
- **认证Token**：30天 - 提供长期登录体验，支持token自动刷新
- **实时查询**：不缓存 - 如用户名验证等需要强一致性的场景
- **分页数据**：不缓存 - 动态变化，避免缓存污染

### 4. Repository 层实现示例

```typescript
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: SimpleCacheService,
  ) {}

  /**
   * 根据ID查找用户（带缓存，24小时）
   */
  async findById(id: string): Promise<User | null> {
    const cacheKey = CacheKeyUtils.buildRepositoryKey('user', 'id', id);

    // 尝试从缓存获取
    const cachedUser = await this.cacheService.get<User>(cacheKey);
    if (cachedUser) {
      this.logger.debug(`从缓存获取用户: ${id}`);
      return cachedUser;
    }

    // 缓存未命中，从数据库获取
    this.logger.debug(`从数据库获取用户: ${id}`);
    const user = await this.userRepository.findOneBy({ id });

    // 缓存结果（24小时）
    if (user) {
      await this.cacheService.set(cacheKey, user, TTLUtils.toSeconds(TTL_CONFIGS.USER_CACHE));
    }

    return user;
  }

  /**
   * 更新用户（自动清理缓存）
   */
  async update(id: string, userData: Partial<User>): Promise<{ oldUser: User | null; updatedUser: User }> {
    // ... 数据库操作

    // 清理相关缓存
    await this.clearUserCache(id);

    return { oldUser, updatedUser };
  }

  /**
   * 创建用户（不缓存新数据）
   */
  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user);
    return savedUser;
  }

  /**
   * 根据用户名查找用户（实时查询，不缓存）
   */
  async findByUserName(userName: string): Promise<User | null> {
    return await this.userRepository.findOneBy({ userName });
  }

  /**
   * 清理用户相关缓存
   */
  private async clearUserCache(userId: string): Promise<void> {
    const cacheKey = CacheKeyUtils.buildRepositoryKey('user', 'id', userId);
    await this.cacheService.delete(cacheKey);
    this.logger.debug(`清理用户缓存: ${userId}`);
  }
}
```

### 5. Service 层设计原则

**Service 层专注于业务逻辑，不直接操作数据库或缓存**：

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * 根据ID查找用户
   * 委托给Repository处理，Repository层负责缓存管理
   */
  async findById(id: string): Promise<User | null> {
    this.logger.debug(`查找用户: ${id}`);
    return await this.userRepository.findById(id);
  }

  /**
   * 更新用户
   * 委托给Repository处理，Repository层负责缓存清理
   */
  async update(id: string, userData: Partial<User>): Promise<User> {
    this.logger.debug(`更新用户: ${id}`);
    const { updatedUser } = await this.userRepository.update(id, userData);
    return updatedUser;
  }
}
```

### 6. 分层架构规范

#### 6.1 数据流向

```
Controller → Service → Repository → Database + Cache
    ↓           ↓          ↓
  HTTP请求   业务逻辑    数据操作+缓存
```

#### 6.2 职责分离

| 层级 | 职责 | 缓存处理 |
|------|------|----------|
| **Controller** | HTTP请求处理 | 不涉及缓存 |
| **Service** | 业务逻辑 | 委托给Repository |
| **Repository** | 数据访问+缓存 | 统一管理 |

#### 6.3 依赖注入

```typescript
// Service 层构造函数
constructor(
  private readonly userRepository: UserRepository, // 数据访问层
) {}

// Repository 层构造函数
constructor(
  @InjectRepository(User)
  private readonly userRepository: Repository<User>, // 数据库操作
  private readonly cacheService: SimpleCacheService, // 缓存服务
) {}
```

### 7. 缓存最佳实践

#### 7.1 缓存设计原则

- **简单明确**：使用简单的键值对缓存，避免过度抽象
- **分层明确**：缓存逻辑集中在Repository层
- **自动清理**：写操作自动清理相关缓存
- **实时优先**：认证等实时查询不使用缓存

#### 7.2 错误处理

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

#### 7.3 日志记录

```typescript
// 使用结构化日志
this.logger.debug(`从缓存获取用户: ${id}`);
this.logger.debug(`从数据库获取用户: ${id}`);
this.logger.debug(`清理用户缓存: ${userId}`);
this.logger.error(`数据库操作失败: ${id}`, error);
```

### 8. 常见场景

#### 8.1 用户查询（缓存）

```typescript
// 通过Controller调用
GET /api/users/profile

// Service层
async getCurrentUserProfile(userId: string): Promise<User> {
  return this.userService.findById(userId);
}

// Repository层（带缓存）
async findById(id: string): Promise<User | null> {
  // 缓存逻辑，24小时TTL
}
```

#### 8.2 用户认证（实时）

```typescript
// AuthService中的登录逻辑
async login(loginUserDto: LoginUserDto): Promise<{ token: string; expires_in: number }> {
  // 实时查询用户名和密码验证
  const user = await this.userRepository.findByUserName(loginUserDto.userName);

  // 验证密码和状态
  // 生成token
  // 返回认证信息
}
```

#### 8.3 数据更新（清理缓存）

```typescript
// 更新操作
async updateUser(id: string, userData: Partial<User>): Promise<User> {
  // 数据库事务更新
  // 自动调用 clearUserCache(id) 清理缓存
}
```

### 9. 迁移指南

#### 9.1 从装饰器缓存迁移

```typescript
// 旧代码（装饰器方式）
@Cacheable({ ttl: TTLUtils.toSeconds(TTL_CONFIGS.USER_CACHE) }) // 24小时
async findById(id: string): Promise<User | null> {
  return this.userRepository.findOneBy({ id });
}

// 新代码（Repository层缓存）
async findById(id: string): Promise<User | null> {
  const cacheKey = CacheKeyUtils.buildRepositoryKey('user', 'id', id);
  let user = await this.cacheService.get<User>(cacheKey);
  if (user) return user;

  user = await this.userRepository.findOneBy({ id });
  if (user) {
    await this.cacheService.set(cacheKey, user, TTLUtils.toSeconds(TTL_CONFIGS.USER_CACHE));
  }
  return user;
}
```

#### 9.2 Service层简化

```typescript
// 旧代码：Service层包含缓存逻辑
@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private cacheService: SimpleCacheService,
  ) {}

  async findById(id: string): Promise<User | null> {
    // 缓存逻辑...
  }
}

// 新代码：Service层专注业务逻辑
@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
  ) {}

  async findById(id: string): Promise<User | null> {
    this.logger.debug(`查找用户: ${id}`);
    return await this.userRepository.findById(id);
  }
}
```

### 10. 缓存监控

#### 10.1 调试日志

```typescript
// Repository层添加调试日志
this.logger.debug(`缓存命中: ${cacheKey}`);
this.logger.debug(`缓存未命中: ${cacheKey}`);
this.logger.debug(`设置缓存: ${cacheKey}, TTL: ${ttl}s`);
this.logger.debug(`删除缓存: ${cacheKey}`);
```

#### 10.2 性能监控

```typescript
// 可以在Repository层添加性能监控
const startTime = Date.now();
// ... 缓存/数据库操作
const endTime = Date.now();
this.logger.debug(`操作耗时: ${endTime - startTime}ms`);
```

---

**注意：** 本文档反映当前项目的缓存架构设计，如有重大变更请及时更新。

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