<h4 align="right"><strong>English</strong> | <a href="https://github.com/Penggeor/nestjs-template/blob/main/README_CN.md">简体中文</a>

![NestJS Template](./res/cover.jpg)

# NestJS Template

## Tech Stack
- [Nest.js](https://nestjs.com/): A framework for building efficient, scalable Node.js applications.
- [TypeORM](https://typeorm.io/): An ORM tool for database connection and operations.
- [PostgreSQL](https://www.postgresql.org/): An open-source relational database management system.
- [Redis](https://redis.io/): An open-source in-memory data structure store, used as a database, cache, and message broker.
- [Swagger](https://swagger.io/): A tool for generating API documentation.
> Swagger UI is accessible at `http://localhost:3000/api`. If you're using APIFox or Postman, you can import the API documentation from `http://localhost:3000/api-json`

## Running the Project

### Start Database and Redis

```bash
docker compose up -f ./docker-compose.yml -d
```

> To stop the docker containers, run `docker compose -f ./docker-compose.yml down`

### Install Dependencies

```bash
npm install
```

### Start the Project

```bash
npm run start:dev
```

### Access the Project

1. Via Terminal

```bash
curl --location --request GET 'http://localhost:3000'
```

2. Via Browser

```bash
http://localhost:3000
```

Both methods will return `Hello World!`

## Authentication System

This project includes a lightweight Token-based authentication system with Redis storage. The system provides secure user authentication without using JWT tokens.

### Architecture Overview

```mermaid
graph TB
    Client[客户端应用] --> Gateway[API Gateway /api]

    Gateway --> |1. 注册请求| AuthController[AuthController<br/>POST /api/auth/register]
    Gateway --> |2. 登录请求| AuthController
    Gateway --> |3. 受保护请求| ProtectedController[Protected Controllers<br/>GET /api/users/*]

    AuthController --> AuthService[AuthService]
    AuthController --> |4. 用户查询| UserRepository[(PostgreSQL)<br/>User Repository]

    AuthService --> |5. 密码验证| Bcrypt[bcrypt哈希验证]
    AuthService --> |6. Token生成| TokenGen[Token生成器<br/>randomBytes(32)]
    AuthService --> |7. Redis存储| Redis[(Redis)<br/>Token Storage]

    ProtectedController --> |8. Token验证| TokenGuard[TokenGuard]
    TokenGuard --> AuthService

    Redis --> |9. TTL自动过期| TokenCleanup[Token自动清理]

    subgraph "认证流程"
        AuthController --> AuthService --> Redis
    end

    subgraph "数据存储"
        UserRepository
        Redis
    end
```

### Authentication Flow

1. **用户注册** (`POST /api/auth/register`)
   - 客户端提交用户名、密码、用户类型
   - 服务端验证用户名唯一性
   - 密码使用 bcrypt 哈希存储
   - 返回用户信息（不含密码）

2. **用户登录** (`POST /api/auth/login`)
   - 客户端提交用户名、密码
   - 服务端验证凭据
   - 生成高强度随机 Token (64位hex字符串)
   - Token 存储到 Redis (TTL: 3600秒)
   - 返回 `{ token, expires_in }`

3. **请求认证**
   - 客户端在请求头中携带：`Authorization: Bearer <token>`
   - TokenGuard 中间件验证 Token
   - 从 Redis 查询 Token 有效性
   - 用户信息挂载到 `request.user`

4. **用户注销** (`POST /api/auth/logout`)
   - 客户端提交 Token
   - 从 Redis 删除对应 Token
   - 立即失效

### Security Features

- 🔐 **密码安全**: bcrypt 哈希存储，可配置加密轮数
- 🎫 **高强度Token**: crypto.randomBytes(32) 生成64位hex字符串
- ⏰ **自动过期**: Redis TTL 自动清理过期Token
- 🛡️ **防枚举攻击**: 统一错误信息，不泄露用户存在状态
- 📊 **配置化**: 所有关键参数支持环境变量配置

### Environment Configuration

```bash
# Token 配置
AUTH_TOKEN_EXPIRES_IN=3600        # Token 过期时间（秒）
AUTH_TOKEN_BYTES_LENGTH=32        # Token 字节长度
AUTH_REDIS_KEY_PREFIX=auth:token: # Redis 键前缀

# 安全配置
AUTH_BCRYPT_ROUNDS=10             # bcrypt 加密轮数
AUTH_MAX_LOGIN_ATTEMPTS=5         # 最大登录尝试次数
AUTH_LOCKOUT_TIME=900             # 账号锁定时间（秒）
```

### API Endpoints

#### Public Endpoints (No Authentication Required)
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户注销
- `GET /api/auth/profile` - 获取当前用户信息

#### Protected Endpoints (Authentication Required)
- `GET /api/users` - 获取所有用户
- `GET /api/users/profile` - 用户详细信息
- `GET /api/users/check-auth` - 检查认证状态

### Testing

The authentication system includes comprehensive test coverage:

- **AuthService Tests**: 25+ test cases covering all scenarios
- **AuthController Tests**: 7+ test cases for API endpoints
- **TokenGuard Tests**: 9+ test cases for authentication middleware
- **Error Handling**: Redis connection failures, invalid data, edge cases

```bash
# Run authentication tests
npm test -- --testPathPattern="auth.*spec.ts$"

# Run all tests
npm test
```

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Access Swagger documentation
http://localhost:3000/api
```

## Contact the Author

If you encounter any issues, besides GitHub Issues, you can find my contact information at [wukaipeng.com](https://wukaipeng.com/). 