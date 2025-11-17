import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ConfigValidationService } from './config/config-validation.service';
import { ConfigService } from '@nestjs/config';
import 'reflect-metadata';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // 获取配置服务
    const configService = app.get(ConfigService);

    // 在应用启动后立即进行配置校验
    const configValidationService = app.get(ConfigValidationService);

    // 根据环境变量选择验证模式
    const validationMode = process.env.CONFIG_VALIDATION_MODE || 'strict';
    const isDevelopment = process.env.NODE_ENV === 'development';

    try {
      if (validationMode === 'strict' || (!isDevelopment && validationMode !== 'lenient')) {
        // 严格模式：验证所有配置
        configValidationService.validateAll();
        logger.log('✅ 严格模式配置验证成功，应用继续启动');
      } else {
        // 宽松模式：只验证关键配置
        const result = configValidationService.validateCritical(isDevelopment);
        logger.log(`✅ 宽松模式配置验证完成，成功: ${result.success.length}，警告: ${result.warnings.length}`);

        if (result.warnings.length > 0) {
          logger.warn('⚠️ 部分可选配置验证失败，应用以功能受限模式启动');
          logger.warn('💡 建议在生产环境中修复所有配置问题');
        }
      }
    } catch (configError) {
      logger.error('❌ 配置验证失败，应用无法启动');
      logger.error(configError.message);

      // 提供详细的错误信息和修复建议
      if (configError.message.includes('数据库配置缺失')) {
        logger.log('💡 请检查数据库相关环境变量：DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE');
      } else if (configError.message.includes('Redis 配置缺失')) {
        logger.log('💡 请检查 Redis 相关环境变量：REDIS_HOST');
      } else if (configError.message.includes('MinIO 配置缺失')) {
        logger.log('💡 请检查 MinIO 相关环境变量：MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET');
      } else if (configError.message.includes('SECURE_ID_SECRET_KEY')) {
        logger.log('💡 请生成强随机密钥：openssl rand -hex 32');
      } else if (configError.message.includes('认证配置')) {
        logger.log('💡 请检查认证相关环境变量：AUTH_TOKEN_EXPIRES_IN, AUTH_TOKEN_BYTES_LENGTH 等');
      }

      // 根据环境决定是否允许启动
      if (isDevelopment && validationMode === 'lenient') {
        logger.warn('⚠️ 开发环境宽松模式：应用将在配置缺失的情况下启动，功能可能受限');
      } else {
        logger.error('🛑 生产环境或严格模式：配置验证失败，应用终止启动');
        process.exit(1);
      }
    }

    // Set global API prefix, but exclude image access routes
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'i/*path', method: RequestMethod.GET }],
    });

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

    // 根据 ENABLE_SWAGGER 环境变量决定是否启用 Swagger 文档
    const enableSwagger = configService.get<boolean>('ENABLE_SWAGGER', true);
    if (enableSwagger) {
      AppModule.setupSwagger(app);
      logger.log('📚 Swagger API 文档已启用');
    } else {
      logger.log('📚 Swagger API 文档已禁用');
    }

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log(`🚀 应用启动成功，监听端口: ${port}`);

    if (enableSwagger) {
      logger.log(`📖 API 文档地址: http://localhost:${port}/api`);
    }

  } catch (error) {
    logger.error('❌ 应用启动过程中发生未预期的错误');
    logger.error(error.message);

    // 如果是未处理的异常，提供通用修复建议
    logger.log('💡 请检查以下可能的问题：');
    logger.log('   - 环境变量配置是否正确');
    logger.log('   - 数据库和 Redis 服务是否正常运行');
    logger.log('   - 端口是否被占用');
    logger.log('   - 依赖服务是否可用');

    process.exit(1);
  }
}

// 处理未捕获的 Promise 异常
process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ 未处理的 Promise 拒绝');
  logger.error(reason);
  process.exit(1);
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ 未捕获的异常');
  logger.error(error.message);
  process.exit(1);
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  const logger = new Logger('Bootstrap');
  logger.log('📴 收到 SIGTERM 信号，开始优雅关闭...');
  process.exit(0);
});

process.on('SIGINT', () => {
  const logger = new Logger('Bootstrap');
  logger.log('📴 收到 SIGINT 信号，开始优雅关闭...');
  process.exit(0);
});

bootstrap();
