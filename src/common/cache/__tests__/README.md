# 缓存模块测试文档

本文档描述了缓存模块的完整测试覆盖范围和运行说明。

## 测试结构

```
__tests__/
├── decorators/
│   ├── cacheable.decorator.spec.ts      # @Cacheable 装饰器测试
│   └── cache-invalidation.decorator.spec.ts  # @CacheInvalidation 装饰器测试
├── interceptors/
│   ├── method-cache.interceptor.spec.ts    # 方法缓存拦截器测试
│   └── cache-invalidation.interceptor.spec.ts  # 缓存失效拦截器测试
├── services/
│   └── cache-management.service.spec.ts    # 缓存管理服务测试
├── integration/
│   └── cache-e2e.spec.ts                  # 端到端集成测试
├── cache-concurrency.spec.ts              # 并发访问测试
├── cache-exception-handling.spec.ts       # 异常处理测试
├── cache-invalidation.spec.ts             # 缓存失效机制测试
├── cache-test-utils.ts                    # 测试工具函数
└── README.md                              # 本文档
```

## 测试覆盖范围

### 1. 装饰器测试 (Decorators)

#### @Cacheable 装饰器测试
- ✅ 默认配置测试
- ✅ 自定义 TTL 测试
- ✅ 禁用缓存测试
- ✅ 多选项组合测试
- ✅ Symbol 方法名测试
- ✅ 边界条件测试

#### @CacheInvalidation 装饰器测试
- ✅ 基本缓存失效配置测试
- ✅ clearAll 标志测试
- ✅ 复杂参数映射测试
- ✅ 空配置测试
- ✅ 边界条件测试

### 2. 拦截器测试 (Interceptors)

#### 方法缓存拦截器测试
- ✅ 缓存命中/未命中测试
- ✅ 缓存禁用测试
- ✅ 缓存错误处理测试
- ✅ TTL 配置测试
- ✅ 缓存键生成测试
- ✅ 多参数处理测试
- ✅ 异常情况处理测试

#### 缓存失效拦截器测试
- ✅ 参数映射测试 (args.0, result.path, 固定值)
- ✅ clearAll 功能测试
- ✅ 混合参数映射测试
- ✅ 方法失败时的缓存清理测试
- ✅ 嵌套路径提取测试
- ✅ 未定义值处理测试
- ✅ 并行缓存清理测试

### 3. 服务测试 (Services)

#### 缓存管理服务测试
- ✅ 类级别缓存清理测试
- ✅ 方法级别缓存清理测试
- ✅ 特定参数缓存清理测试
- ✅ 全部缓存清理测试
- ✅ 缓存设置/获取测试
- ✅ 缓存存在性检查测试
- ✅ 缓存统计测试
- ✅ 错误处理测试

### 4. 并发访问测试 (Concurrency)

- ✅ 并发缓存未命中测试
- ✅ 并发缓存命中测试
- ✅ 混合缓存命中/未命中测试
- ✅ 并发缓存失效测试
- ✅ 缓存雪崩防护测试
- ✅ 读写一致性测试

### 5. 异常处理测试 (Exception Handling)

#### 方法缓存异常处理
- ✅ 缓存读取异常处理
- ✅ 缓存写入异常处理
- ✅ 方法执行异常处理
- ✅ 组合异常处理
- ✅ 超时场景处理
- ✅ 损坏数据处理

#### 缓存失效异常处理
- ✅ 缓存失效异常处理
- ✅ 方法失败时的缓存失效
- ✅ 部分缓存失效失败处理
- ✅ 超时处理

#### 缓存管理服务异常处理
- ✅ 各种操作的异常处理
- ✅ 空缓存管理器处理
- ✅ 格式错误的缓存键处理

### 6. 集成测试 (E2E Integration)

- ✅ 基本缓存操作测试
- ✅ 缓存失效集成测试
- ✅ 复杂缓存失效场景测试
- ✅ 跨服务缓存行为测试
- ✅ 并发操作测试
- ✅ 缓存性能和 TTL 测试
- ✅ 错误处理和恢复测试
- ✅ 缓存统计和监控测试

## 运行测试

### 运行所有缓存测试

```bash
# 运行缓存模块的所有测试
npm test -- --testPathPattern=src/common/cache

# 或者使用 Jest 模式
npx jest src/common/cache
```

### 运行特定类型的测试

```bash
# 只运行单元测试
npm test -- --testPathPattern=src/common/cache --testNamePattern="(Unit|Decorator|Interceptor|Service)"

# 只运行集成测试
npm test -- --testPathPattern=src/common/cache/integration

# 只运行并发测试
npm test -- --testPathPattern=src/common/cache --testNamePattern="Concurrency"

# 只运行异常处理测试
npm test -- --testPathPattern=src/common/cache --testNamePattern="Exception"
```

### 运行特定文件的测试

```bash
# 运行装饰器测试
npm test -- src/common/cache/__tests__/decorators/

# 运行拦截器测试
npm test -- src/common/cache/__tests__/interceptors/

# 运行服务测试
npm test -- src/common/cache/__tests__/services/

# 运行集成测试
npm test -- src/common/cache/__tests__/integration/
```

### 带覆盖率报告运行测试

```bash
# 生成覆盖率报告
npm test -- --testPathPattern=src/common/cache --coverage

# 生成详细的覆盖率报告
npm test -- --testPathPattern=src/common/cache --coverage --coverageReporters=text-lcov

# 生成 HTML 覆盖率报告
npm test -- --testPathPattern=src/common/cache --coverage --coverageReporters=html
```

## 测试工具

### cache-test-utils.ts

提供了一系列测试辅助函数：

- `createMockCacheManager()` - 创建功能完整的模拟缓存管理器
- `createTestingModuleWithCache()` - 创建带模拟缓存的测试模块
- `createMockExecutionContext()` - 创建模拟执行上下文
- `createMockCallHandler()` - 创建模拟调用处理器
- `generateConcurrentRequests()` - 生成并发请求
- `measureTime()` - 测量执行时间
- `createFailingCacheManager()` - 创建会失败的缓存管理器
- `cleanupTestCache()` - 清理测试缓存

## 性能测试

缓存模块包含了性能测试用例，可以验证：

1. **缓存性能提升**：缓存命中比缓存未命中快多少
2. **并发性能**：大量并发请求下的表现
3. **TTL 准确性**：不同 TTL 配置的效果
4. **内存使用**：缓存占用的内存情况

### 运行性能测试

```bash
# 运行包含性能测试的测试文件
npm test -- --testPathPattern=src/common/cache --testNamePattern="Performance"
```

## 调试测试

### 启用详细日志

```bash
# 运行测试时显示详细输出
npm test -- --testPathPattern=src/common/cache --verbose

# 运行特定测试并显示详细输出
npm test -- --testPathPattern=src/common/cache --verbose --testNamePattern="specific test name"
```

### 调试单个测试

```bash
# 在 Node.js 调试模式下运行测试
node --inspect-brk node_modules/.bin/jest --testPathPattern=src/common/cache/__tests__/specific-file.spec.ts
```

## 持续集成

在 CI/CD 环境中运行测试：

```bash
# CI 环境中的测试命令
CI=true npm test -- --testPathPattern=src/common/cache --coverage --watchAll=false
```

## 测试最佳实践

1. **隔离性**：每个测试都应该独立运行，不依赖其他测试的状态
2. **清理**：使用 `afterEach` 清理测试状态
3. **模拟**：使用 Jest 模拟函数来隔离外部依赖
4. **断言**：使用明确的断言来验证预期行为
5. **边界条件**：测试正常情况和边界情况
6. **错误处理**：测试各种错误场景
7. **性能**：在必要时测试性能特征

## 覆盖率目标

- **语句覆盖率**：≥ 95%
- **分支覆盖率**：≥ 90%
- **函数覆盖率**：≥ 95%
- **行覆盖率**：≥ 95%

当前测试套件覆盖了缓存模块的所有主要功能，包括正常流程、异常处理、并发访问和性能特征。