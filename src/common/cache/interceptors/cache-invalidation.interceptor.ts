import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheManagementService } from '../services/cache-management.service';
import { getCacheInvalidationConfig, CacheInvalidationConfig } from '../decorators/cache-invalidation.decorator';

/**
 * 缓存失效拦截器
 * 在方法执行后自动清理相关缓存
 */
@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheManagementService: CacheManagementService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const config = this.reflector.get<CacheInvalidationConfig>(
      getCacheInvalidationConfig(handler.constructor.prototype, handler.name),
      handler,
    );

    if (!config) {
      return next.handle();
    }

    const className = handler.constructor.name;
    const args = context.getArgs();

    return next.handle().pipe(
      tap(async (result) => {
        // 方法执行成功后清理缓存
        await this.invalidateRelatedCaches(className, config, args, result);
      }),
      catchError(async (error) => {
        // 即使方法执行失败，仍然尝试清理相关缓存
        try {
          await this.invalidateRelatedCaches(className, config, args, null);
        } catch (cacheError) {
          // 缓存清理失败不应影响错误处理
          console.warn('缓存清理失败:', cacheError);
        }
        return throwError(() => error);
      }),
    );
  }

  /**
   * 清理相关缓存
   */
  private async invalidateRelatedCaches(
    className: string,
    config: CacheInvalidationConfig,
    args: any[],
    result: any,
  ): Promise<void> {
    const clearPromises: Promise<void>[] = [];

    for (const entry of config.entries) {
      if (entry.clearAll) {
        // 清理该方法的所有缓存
        clearPromises.push(
          this.cacheManagementService.clearMethodCache(className, entry.methodName)
        );
      } else if (entry.paramMapping) {
        // 根据参数映射清理特定缓存
        const mappedArgs = this.mapArguments(entry.paramMapping, args, result);
        if (mappedArgs.length > 0) {
          clearPromises.push(
            this.cacheManagementService.clearMethodCacheWithArgs(
              className,
              entry.methodName,
              mappedArgs
            )
          );
        }
      }
    }

    if (clearPromises.length > 0) {
      await Promise.all(clearPromises);
    }
  }

  /**
   * 映射参数
   * 支持从方法参数和返回结果中提取参数值
   */
  private mapArguments(mapping: string[], args: any[], result: any): any[] {
    const mappedArgs: any[] = [];

    for (const mapping of mapping) {
      if (mapping.startsWith('result.') && result) {
        // 从返回结果中提取
        const resultPath = mapping.replace('result.', '');
        const value = this.getNestedValue(result, resultPath);
        if (value !== undefined) {
          mappedArgs.push(value);
        }
      } else if (mapping.startsWith('args.')) {
        // 从方法参数中提取
        const argIndex = parseInt(mapping.replace('args.', ''), 10);
        if (!isNaN(argIndex) && argIndex < args.length) {
          mappedArgs.push(args[argIndex]);
        }
      } else if (mapping.startsWith('args.')) {
        // 支持按参数名映射（通过对象参数）
        const paramName = mapping.replace('args.', '');
        const value = this.findArgumentValue(args, paramName);
        if (value !== undefined) {
          mappedArgs.push(value);
        }
      } else {
        // 直接作为参数值
        mappedArgs.push(mapping);
      }
    }

    return mappedArgs;
  }

  /**
   * 从对象中获取嵌套值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * 从参数数组中查找指定名称的值
   */
  private findArgumentValue(args: any[], paramName: string): any {
    for (const arg of args) {
      if (typeof arg === 'object' && arg !== null) {
        const value = arg[paramName];
        if (value !== undefined) {
          return value;
        }
      }
    }
    return undefined;
  }
}