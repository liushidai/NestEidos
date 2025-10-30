import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
config();

const configService = new ConfigService();

const AppDataSource = new DataSource({
  // 配置数据库连接信息
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: Number.parseInt(configService.get<string>('DB_PORT', '5432')),
  username: configService.get<string>('DB_USERNAME', 'postgres'),
  password: configService.get<string>('DB_PASSWORD', 'your_password'),
  database: configService.get<string>('DB_DATABASE', 'nest_eidos'),
  // 是否自动同步实体和数据库表结构（生产环境通常设为 false）
  synchronize: true,
  // 告诉 TypeORM：
  // 在哪里查找数据库实体类 （实体类就是对应数据库表的 JavaScript 类）
  // **/*.entity.ts 是一个 通配符路径 ，表示：
  // ** 表示「在所有文件夹和子文件夹中搜索」
  //  *.entity.ts 表示「所有文件名以 .entity.ts 结尾的文件」
  entities: ['**/*.entity.ts'],
  // 在哪里查找迁移文件 （迁移文件就是用于数据库版本管理的 JavaScript 类）
  // src/database/migrations/*-migration.ts 是一个 通配符路径 ，表示：
  // src/database/migrations/ 表示「在 src/database/migrations/ 文件夹中搜索」
  // *-migration.ts 表示「所有文件名以 -migration.ts 结尾的文件」
  migrations: ['src/database/migrations/*-migration.ts'],
  // 是否在应用启动时自动运行迁移文件
  // 这在开发环境中很方便，但是在生产环境中应该避免自动运行迁移文件，因为这可能会导致数据丢失。
  migrationsRun: false,
  // 是否记录 SQL 查询日志
  // 这在开发环境中很方便，但是在生产环境中应该避免记录 SQL 查询日志，因为这可能会暴露敏感信息。
  logging: true,
});

export default AppDataSource;
