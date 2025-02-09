<h4 align="right"><a href="https://github.com/Penggeor/nestjs-template">English</a> | <strong>简体中文</strong></h4>

# NestJS 模板

## 技术栈
- [Nest.js](https://nestjs.com/)：一个用于构建高效、可扩展的 Node.js 应用程序的框架。
- [TypeORM](https://typeorm.io/)：一个用于连接和操作数据库的 ORM 工具。
- [PostgreSQL](https://www.postgresql.org/)：一个开源的关系型数据库管理系统。
- [Redis](https://redis.io/)：一个开源的内存数据结构存储，用作数据库、缓存和消息代理。
- [Swagger](https://swagger.io/)：一个用于生成 API 文档的工具。
> Swagger 的 UI 访问界面为 `http://localhost:3000/api`，如果是用 APIFox 或者 Postman ，则可调用 `http://localhost:3000/api-json` 导入

## 运行项目

### 运行数据库和 redis

```bash
docker compose up -f ./docker-compose.yml -d
```

> Docker Compose 是 Docker 的编排工具，用于定义和运行多容器 Docker 应用程序，跑数据库镜像比较方便。

### 安装依赖

```bash
npm install
```

### 启动项目

```bash
npm run start:dev
```

### 访问项目

1. 通过命令终端访问

```bash
curl --location --request GET 'http://localhost:3000'
```

2. 通过浏览器访问

```bash
http://localhost:3000
```

都可以看到返回了 `Hello World!`


## 联系作者

如果你遇到任何问题，除了 GitHub Issue 之外，你可以在 [wukaipeng.com](https://wukaipeng.com/) 上找到我的联系方式。