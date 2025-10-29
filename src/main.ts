import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import 'reflect-metadata';

async function bootstrap() {
  // 创建应用实例
  const app = await NestFactory.create(AppModule);

  // 配置全局验证器  这相当于Spring中的全局过滤器或拦截器，用于请求数据的自动验证。
  app.useGlobalPipes(new ValidationPipe());
  // 配置全局 Swagger 文档
  AppModule.setupSwagger(app);
  // 启动应用实例
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
