import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Reflector } from '@nestjs/core';
import { getCacheableMetadata } from '../decorators/cacheable.decorator';
import { CacheUtils } from '../cache.utils';

@Injectable()
export class MethodCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MethodCacheInterceptor.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 获取缓存元数据
    const cacheOptions = this.getCacheOptions(context);
    if (!cacheOptions || cacheOptions.disabled) {
      // 未启用缓存或禁用缓存，直接执行原方法
      return next.handle();
    }

    const { ttl } = cacheOptions;
    const cacheKey = this.generateCacheKey(context);

    this.logger.debug(`缓存拦截器检查键: ${cacheKey}`);

    // 创建一个新的 Observable 来处理缓存逻辑
    return new Observable(subscriber => {
      this.getCachedValue(cacheKey).then(cachedValue => {
        if (cachedValue !== undefined) {
          this.logger.debug(`缓存命中: ${cacheKey}`);
          subscriber.next(cachedValue);
          subscriber.complete();
        } else {
          this.logger.debug(`缓存未命中: ${cacheKey}`);
          // 缓存未命中，执行原方法并缓存结果
          next.handle().pipe(
            tap(result => {
              // 只缓存非 undefined 的结果
              if (result !== undefined) {
                this.setCachedValue(cacheKey, result, ttl);
                this.logger.debug(`缓存已设置: ${cacheKey}, TTL: ${ttl}s`);
              }
            }),
            catchError(error => {
              this.logger.error(`方法执行失败，不缓存结果: ${cacheKey}`, error.stack);
              return throwError(() => error);
            }),
          ).subscribe({
            next: (result) => {
              subscriber.next(result);
              subscriber.complete();
            },
            error: (error) => {
              subscriber.error(error);
            }
          });
        }
      }).catch(error => {
        this.logger.error(`缓存操作失败: ${cacheKey}`, error.stack);
        // 缓存出错时直接执行原方法
        next.handle().subscribe({
          next: (result) => {
            subscriber.next(result);
            subscriber.complete();
          },
          error: (error) => {
            subscriber.error(error);
          }
        });
      });
    });
  }

  /**
   * 获取缓存选项
   */
  private getCacheOptions(context: ExecutionContext): { ttl: number; disabled?: boolean } | null {
    const handler = context.getHandler();
    const controller = context.getClass();

    // 尝试从方法获取元数据
    let metadata = this.reflector.get<any>('cacheable', handler);
    if (!metadata) {
      // 尝试从控制器获取元数据
      metadata = this.reflector.get<any>('cacheable', controller);
    }

    // 确保返回的metadata包含ttl属性且ttl是数字
    if (metadata && typeof metadata === 'object' && 'ttl' in metadata) {
      const ttl = (metadata as any).ttl;
      if (typeof ttl === 'number') {
        return {
          ttl,
          disabled: (metadata as any).disabled || false
        };
      }
    }

    return null;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(context: ExecutionContext): string {
    const controller = context.getClass();
    const handler = context.getHandler();
    const args = context.getArgs();

    const className = controller.name;
    const methodName = handler.name;

    return CacheUtils.generateMethodKey(className, methodName, args);
  }

  /**
   * 从缓存获取值
   */
  private async getCachedValue(key: string): Promise<any> {
    try {
      return await this.cacheManager.get(key);
    } catch (error) {
      this.logger.error(`获取缓存失败: ${key}`, error.stack);
      return undefined;
    }
  }

  /**
   * 设置缓存值
   */
  private async setCachedValue(key: string, value: any, ttl: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.error(`设置缓存失败: ${key}`, error.stack);
      // 缓存设置失败不应该影响主要功能
    }
  }
}