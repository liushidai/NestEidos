import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ModulesModule } from './modules/modules.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigValidationService } from './config/config-validation.service';
// 声明模块的依赖与组成。
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // 异步配置 TypeORM，使用 ConfigService 从环境变量中获取数据库连接信息。
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: Number.parseInt(configService.get<string>('DB_PORT', '5432'), 10),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'your_password'),
        database: configService.get('DB_DATABASE', 'nest_eidos'),
        // 自动加载通过各业务模块 TypeOrmModule.forFeature() 注册的实体（便于集中管理）
        autoLoadEntities: true,
        synchronize: false,
        logging: true,
      }),
      // 注入 ConfigService 以获取数据库配置。
      inject: [ConfigService],
    }),
    // 导入 ModulesModule 以包含所有业务模块。
    ModulesModule,
  ],
  // 声明 AppController 为控制器，AppService 为服务提供者。
  controllers: [AppController],
  providers: [AppService, ConfigValidationService],
})
// 模块类本身，包含构造函数注入与 setupSwagger() 静态方法，用于配置 Swagger 文档。
export class AppModule {
  constructor(private readonly dataSource: DataSource) {}

  static setupSwagger(app: INestApplication): void {
    // 配置 Swagger 文档的标题、描述、版本等信息。
    const config = new DocumentBuilder()
      .setTitle('Nest-TypeORM API')
      .setDescription('The Nest-TypeORM API description')
      .setVersion('1.0')
      .build();
    // 创建 Swagger 文档。
    const document = SwaggerModule.createDocument(app, config);
    // 设置 Swagger 文档的路由为 /api。
    SwaggerModule.setup('api', app, document);
    // 挂载 Swagger UI 到路径 /api-json ，并指定这份 UI 去读取的文档 JSON 路径为 api-json ，同时让它遵守全局前缀。
    // Add JSON document endpoint
    SwaggerModule.setup('api-json', app, document, {
      jsonDocumentUrl: 'api-json',
      useGlobalPrefix: true,
    });
  }
}
