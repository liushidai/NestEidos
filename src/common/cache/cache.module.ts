import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { MethodCacheInterceptor } from './interceptors/method-cache.interceptor';
import { CacheManagementService } from './services/cache-management.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SampleCacheService } from './examples/sample-cache.service';
import { SampleCacheController } from './examples/sample-cache.controller';

@Module({
  imports: [
    CacheModule.register({
      // 全局缓存配置
      isGlobal: true,
      ttl: 3600, // 默认1小时
      max: 1000, // 最大缓存项数
    }),
  ],
  providers: [
    // 提供全局缓存拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: MethodCacheInterceptor,
      global: true,
    },
    // 缓存管理服务
    CacheManagementService,
    // 示例服务
    SampleCacheService,
  ],
  controllers: [
    // 示例控制器
    SampleCacheController,
  ],
  exports: [
    // 导出缓存管理服务供其他模块使用
    CacheManagementService,
    // 导出示例服务供演示使用
    SampleCacheService,
  ],
})
export class CacheModule {}