import { Module } from '@nestjs/common';
import { CacheModule as NestJSCacheModule } from '@nestjs/cache-manager';
import { MethodCacheInterceptor } from './interceptors/method-cache.interceptor';
import { CacheInvalidationInterceptor } from './interceptors/cache-invalidation.interceptor';
import { CacheManagementService } from './services/cache-management.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SampleCacheService } from './examples/sample-cache.service';
import { SampleCacheController } from './examples/sample-cache.controller';

@Module({
  imports: [
    NestJSCacheModule.register({
      // 全局缓存配置
      isGlobal: true,
      ttl: 3600, // 默认1小时
      max: 1000, // 最大缓存项数
    }),
  ],
  providers: [
    // 缓存管理服务
    CacheManagementService,
    // 缓存失效拦截器（全局注册）
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInvalidationInterceptor,
    },
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