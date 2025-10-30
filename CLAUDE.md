## 语言规范
- 所有对话和文档都使用中文
- 文档使用 markdown 格式

## 项目概览
这是一个基于 Node.js 的轻量级图床服务。当前共有三张表，ddl在 doc\ddl.sql中 若有变动则实时更新ddls

## 技术栈
- [Nest.js](https://nestjs.com/)：一个用于构建高效、可扩展的 Node.js 应用程序的框架。
- [TypeORM](https://typeorm.io/)：一个用于连接和操作数据库的 ORM 工具。
- [PostgreSQL](https://www.postgresql.org/)：一个开源的关系型数据库管理系统。
- [Redis](https://redis.io/)：一个开源的内存数据结构存储，用作数据库、缓存和消息代理。
- [Swagger](https://swagger.io/)：一个用于生成 API 文档的工具。
> Swagger 的 UI 访问界面为 `http://localhost:3000/api`，如果是用 APIFox 或者 Postman ，则可调用 `http://localhost:3000/api-json` 导入


## Claude 行为准则
- 严格遵守现有目录结构与命名规范。
- 所有的id使用雪花算法生成
- 所有的表的created_at和updated_at字段，由程序进行插入更新操作，默认值为当前时间