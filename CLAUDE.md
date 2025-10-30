## 语言规范
- 所有对话和文档都使用中文
- 文档使用 markdown 格式

## 项目概览
这是一个基于 Spring Boot 3 的轻量级图床服务，核心功能包括相册管理与图片上传/查询。当前仅包含 `album`（相册）与 `image`（图片）两张数据表，大部分业务逻辑直接在 Controller 中实现，Service 层仅负责与数据库交互。

## 技术栈
- 后端框架：Spring Boot 3.x
- ORM 框架：MyBatis-Plus
- 数据库：MySQL 8.0
- JDK 版本：JDK 25
- 构建工具：Maven

## 目录结构
src/main/java/com/github/liushidai/imagebedapi/module/
├── controller # 业务逻辑主要在此实现
├── service # 仅封装数据库操作，不包含复杂业务
├── mapper # MyBatis-Plus Mapper 接口
└── entity # 实体类，与数据库表一一对应

## 编码规范
- **Controller 层**：处理请求参数校验、业务流程编排、返回统一响应。
- **Service 层**：仅调用 Mapper 进行 CRUD，不包含 if/else 业务判断。
- 所有数据库操作必须通过 MyBatis-Plus 提供的 API，禁止手写 SQL（除非必要且经确认）。
- 统一使用 `com.github.liushidai.imagebedapi.config.result.Result` 类封装返回结果。
- 异常处理应通过全局异常处理器统一捕获，避免在 Controller 中 try-catch。

## Claude 行为准则
- 严格遵守现有目录结构与命名规范。
- 新增功能时，优先在 Controller 中实现逻辑，Service 仅提供数据访问方法。
- 若需新增字段或表，请先确认是否符合当前极简设计原则。
- 生成代码时默认使用 Lombok 简化 getter/setter（如项目已引入）。