import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ConfigValidationService } from './config/config-validation.service';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 在应用启动后立即进行配置校验
  const configValidationService = app.get(ConfigValidationService);
  configValidationService.validateAll();

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Apply global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Apply global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  AppModule.setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
