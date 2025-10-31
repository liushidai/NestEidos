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

### 1. 缓存架构

项目使用**方法级缓存（装饰器方式）**作为统一的缓存实现策略：

#### 方法级缓存（装饰器方式）
- **适用场景**：所有缓存需求
- **实现位置**：使用 `@Cacheable` 装饰器装饰 Service 层方法
- **特点**：声明式缓存，简化开发，统一管理
- **实现原则**：Repository 层专注于数据访问，Service 层负责业务逻辑和缓存管理

### 2. @Cacheable 装饰器方法级缓存

**原则：** 使用装饰器模式实现声明式方法级缓存，简化缓存实现。

#### 2.1 基本用法

```typescript
import { Cacheable, DEFAULT_TTL_CONFIG } from '@/common/cache';

@Injectable()
export class UserService {

  // 默认缓存（1小时）
  @Cacheable()
  async getUserById(id: string): Promise<User> {
    // 业务逻辑，缓存自动处理
  }

  // 自定义 TTL（5分钟）
  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.SHORT })
  async getHotProducts(limit: number): Promise<Product[]> {
    // 热门数据，短缓存
  }

  // 禁用缓存
  @Cacheable({ disabled: true })
  async getRealTimeData(): Promise<any> {
    // 实时数据，不缓存
  }
}
```

#### 2.2 TTL 配置常量

```typescript
// 缓存时间常量（秒）
const DEFAULT_TTL_CONFIG = {
  SHORT: 300,      // 5分钟 - 热点数据、频繁变化数据
  MEDIUM: 1800,    // 30分钟 - 中等变化频率数据
  LONG: 3600,      // 1小时 - 基本稳定数据
  DEFAULT: 3600,   // 默认1小时
};
```

#### 2.3 自动缓存键生成

**缓存键格式**：`{className}:{methodName}:{serializedArgs}`

**示例**：
- `UserService:getUserById:123` - 获取用户
- `ProductService:getProductsByCategory:electronics` - 按类别获取产品
- `ReportService:generateMonthlyReport:2024:1` - 月度报告

#### 2.4 手动缓存管理

```typescript
import { CacheManagementService } from '@/common/cache';

@Injectable()
export class UserService {
  constructor(
    private readonly cacheManagementService: CacheManagementService,
  ) {}

  async updateUser(userId: string, updateData: any): Promise<User> {
    // 更新用户数据
    const updatedUser = await this.userRepository.save(updateData);

    // 手动清除相关缓存
    await this.cacheManagementService.clearMethodCache(
      'UserService',
      'getUserById'
    );

    // 清除特定参数的缓存
    await this.cacheManagementService.clearMethodCacheWithArgs(
      'UserService',
      'getUserById',
      [userId]
    );

    return updatedUser;
  }
}
```

### 3. Repository 层设计原则

Repository 层专注于数据访问操作，不处理缓存逻辑：

```typescript
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<User | null> {
    // Repository 层专注于数据库操作，不处理缓存
    return await this.userRepository.findOneBy({ id });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }
}
```

### 4. 自动化缓存清理机制

#### 4.1 Service 层缓存装饰

**所有需要缓存的方法都应在 Service 层使用 @Cacheable 装饰器**：

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  // 查询方法 - 使用缓存
  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.DEFAULT })
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  // 写操作 - 自动清理相关缓存
  @CacheInvalidation({
    entries: [
      { methodName: 'findById', paramMapping: ['result.id'] },
      { methodName: 'findByUserName', paramMapping: ['result.userName'] }
    ]
  })
  async create(userData: Partial<User>): Promise<User> {
    return await this.userRepository.create(userData);
  }
}
```

#### 4.2 @CacheInvalidation 装饰器

**自动化缓存清理装饰器**，通过声明式配置自动管理缓存失效：

##### 4.2.1 基本语法

```typescript
@CacheInvalidation({
  entries: [
    { methodName: 'findById', paramMapping: ['args.0'] },
    { methodName: 'findByUserName', paramMapping: ['result.userName'] },
    { methodName: 'findAll', clearAll: true }
  ]
})
async updateUser(id: string, userData: Partial<User>): Promise<User> {
  // 方法执行完成后会自动清理配置的相关缓存
}
```

##### 4.2.2 参数映射规则

- **`args.n`**：从方法参数中提取（n为参数索引）
- **`args.paramName`**：从对象参数中按属性名提取
- **`result.path`**：从返回结果中提取（支持嵌套路径）
- **固定值**：直接使用指定的值

**示例**：
```typescript
@CacheInvalidation({
  entries: [
    // 清理当前ID的findById缓存
    { methodName: 'findById', paramMapping: ['args.0'] },

    // 清理新邮箱和旧邮箱的findByEmail缓存
    { methodName: 'findByEmail', paramMapping: ['result.email', 'args.1.email'] },

    // 清理所有用户列表缓存
    { methodName: 'findAll', clearAll: true }
  ]
})
async updateUser(id: string, data: UpdateUserDto): Promise<User> {
  // 自动缓存清理逻辑
}
```

#### 4.3 缓存策略

- **查询操作**：使用 @Cacheable 装饰器自动缓存
- **写操作**：使用 @CacheInvalidation 装饰器自动清理相关缓存
- **缓存管理**：通过装饰器配置自动管理，无需手动编写清理逻辑

### 5. 缓存失效管理

#### 5.1 自动失效（推荐）

**使用 @CacheInvalidation 装饰器实现自动化缓存失效**：

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  @CacheInvalidation({
    entries: [
      { methodName: 'findById', paramMapping: ['args.0'] },
      { methodName: 'findByUserName', paramMapping: ['result.userName', 'args.1.userName'] }
    ]
  })
  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    // 方法执行完成后自动清理相关缓存，无需手动编写清理逻辑
    const { updatedUser } = await this.userRepository.update(id, data);
    return updatedUser;
  }
}
```

#### 5.2 手动失效（特殊情况）

在需要复杂缓存清理逻辑的特殊场景下，仍可使用手动清理：

```typescript
// 注入 CacheManagementService
constructor(
  private readonly cacheManagementService: CacheManagementService,
) {}

// 手动清理特定缓存
await this.cacheManagementService.clearMethodCache('UserService', 'findById');

// 清理特定参数的缓存
await this.cacheManagementService.clearMethodCacheWithArgs(
  'UserService',
  'findByUserName',
  ['username']
);
```

#### 5.3 缓存统计和监控

```typescript
// 获取缓存统计
const stats = await this.cacheManagementService.getCacheStats();
console.log(`当前缓存项数: ${stats.totalKeys}`);

// 清除整个服务的缓存（谨慎使用）
await this.cacheManagementService.clearClassCache('UserService');
```

### 6. 缓存 TTL 建议

#### 6.1 按数据类型分类

- **实时数据**：不缓存或 1-5 分钟（股票价格、在线状态）
- **热点数据**：5-15 分钟（热门产品、排行榜）
- **业务数据**：30分钟-2小时（用户信息、产品信息）
- **配置数据**：2-4 小时（系统配置、权限设置）
- **基础数据**：4-24 小时（字典数据、地域信息）

#### 6.2 按操作类型分类

```typescript
// 查询操作
@Cacheable({ ttl: DEFAULT_TTL_CONFIG.MEDIUM })
async findUsers(filters: UserFilters): Promise<User[]> {}

// 统计操作
@Cacheable({ ttl: DEFAULT_TTL_CONFIG.SHORT })
async getDashboardStats(): Promise<DashboardStats> {}

// 配置查询
@Cacheable({ ttl: DEFAULT_TTL_CONFIG.LONG })
async getSystemConfig(): Promise<SystemConfig> {}

// 实时查询
@Cacheable({ disabled: true })
async getCurrentStockPrice(symbol: string): Promise<number> {}
```

### 7. 最佳实践

#### 7.1 缓存设计原则

- **声明式配置**：使用装饰器进行声明式缓存配置，避免硬编码
- **自动化管理**：优先使用 @CacheInvalidation 装饰器自动管理缓存失效
- **单一职责**：每个方法专注于单一业务功能，缓存作为横切关注点
- **幂等性**：缓存不应影响方法的幂等性
- **一致性**：确保缓存与数据源的一致性
- **降级策略**：缓存失败时不影响业务功能

#### 7.2 @CacheInvalidation 使用指南

**推荐配置模式**：

1. **创建操作**：清理返回结果相关的缓存
```typescript
@CacheInvalidation({
  entries: [
    { methodName: 'findById', paramMapping: ['result.id'] },
    { methodName: 'findByUserName', paramMapping: ['result.userName'] }
  ]
})
```

2. **更新操作**：清理参数和返回结果相关的所有缓存
```typescript
@CacheInvalidation({
  entries: [
    { methodName: 'findById', paramMapping: ['args.0'] }, // 根据ID清理
    { methodName: 'findByUserName', paramMapping: ['result.userName', 'args.1.userName'] }, // 新旧用户名
    { methodName: 'findAll', clearAll: true } // 清理列表缓存
  ]
})
```

3. **删除操作**：清理被删除对象相关的所有缓存
```typescript
@CacheInvalidation({
  entries: [
    { methodName: 'findById', paramMapping: ['args.0'] },
    { methodName: 'findByEmail', paramMapping: ['result.email'] },
    { methodName: 'findAll', clearAll: true }
  ]
})
```

#### 7.3 性能考虑

- **缓存粒度**：避免缓存过大的对象，考虑分页缓存
- **内存管理**：设置合理的 TTL，避免内存泄漏
- **并发控制**：自动缓存清理机制避免了手动清理的并发问题
- **批量清理**：使用 `clearAll: true` 批量清理列表类缓存

#### 7.4 监控和调试

```typescript
// 启用调试日志
import { Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  @Cacheable()
  async getUserById(id: string): Promise<User> {
    this.logger.debug(`执行数据库查询：getUserById(${id})`);
    // 业务逻辑
  }
}

// 缓存清理日志由 CacheInvalidationInterceptor 自动记录
// 可以通过日志观察缓存清理行为
```

### 8. 常见陷阱和注意事项

#### 8.1 避免的问题

- **缓存雪崩**：大量缓存同时过期，给数据库造成压力
- **缓存穿透**：查询不存在的数据，绕过缓存直接访问数据库
- **缓存击穿**：热点数据过期瞬间，大量请求直接访问数据库
- **手动清理遗漏**：手动维护缓存清理逻辑容易遗漏某些缓存项
- **参数映射错误**：手动参数匹配容易出现错误

#### 8.2 解决方案

```typescript
// 1. 使用随机 TTL 避免缓存雪崩
@Cacheable({ ttl: DEFAULT_TTL_CONFIG.MEDIUM + Math.random() * 300 })
async getPopularProducts(): Promise<Product[]> {}

// 2. 缓存空值避免缓存穿透
@Cacheable({ ttl: DEFAULT_TTL_CONFIG.SHORT })
async getUserByName(name: string): Promise<User | null> {
  const user = await this.userRepository.findOneBy({ name });
  // 即使返回 null 也会被缓存
  return user;
}

// 3. 使用 @CacheInvalidation 避免手动清理遗漏
@CacheInvalidation({
  entries: [
    // 一次性配置所有需要清理的缓存，避免遗漏
    { methodName: 'findById', paramMapping: ['args.0'] },
    { methodName: 'findByEmail', paramMapping: ['result.email'] },
    { methodName: 'findAll', clearAll: true }
  ]
})
async updateUser(id: string, data: UpdateUserDto): Promise<User> {
  // 自动缓存清理，无需手动编写清理逻辑
}
```

#### 8.3 迁移指南

**从手动清理迁移到自动清理**：

1. **移除手动清理代码**：
```typescript
// 删除这样的代码
// await this.clearUserRelatedCache(userId, userName);
```

2. **添加 @CacheInvalidation 装饰器**：
```typescript
@CacheInvalidation({
  entries: [
    { methodName: 'findById', paramMapping: ['args.0'] },
    { methodName: 'findByUserName', paramMapping: ['args.1.userName'] }
  ]
})
```

3. **移除不必要的依赖注入**：
```typescript
// 如果不再需要手动清理，可以移除
constructor(
  // private readonly cacheManagementService: CacheManagementService,
  private readonly userRepository: UserRepository,
) {}
```

### 9. 缓存测试

```typescript
describe('UserService Caching', () => {
  let service: UserService;
  let cacheManagementService: CacheManagementService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService, CacheManagementService],
    }).compile();

    service = module.get<UserService>(UserService);
    cacheManagementService = module.get<CacheManagementService>(CacheManagementService);
  });

  it('should cache method results', async () => {
    const userId = '123';

    // 第一次调用
    const result1 = await service.getUserById(userId);

    // 清除缓存并验证缓存生效
    await cacheManagementService.clearMethodCache('UserService', 'getUserById');

    // 第二次调用应该从缓存获取
    const result2 = await service.getUserById(userId);

    expect(result1).toEqual(result2);
  });
});
```

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