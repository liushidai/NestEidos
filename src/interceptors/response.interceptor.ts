import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/response.interface';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => ({
        code: response.statusCode || 200,
        message: this.getSuccessMessage(
          request.method,
          request.route?.path ?? request.url,
        ),
        data,
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }

  private getSuccessMessage(method: string, path?: string): string {
    // 特殊路由的语义化消息映射
    if (path) {
      // 规范化路径：移除末尾斜杠
      const normalizedPath = path.replace(/\/$/, '');
      const routeKey = `${method} ${normalizedPath}`;

      const specialRouteMessages: Record<string, string> = {
        'POST /auth/login': '登录成功',
        'POST /auth/logout': '注销成功',
        'POST /auth/register': '注册成功',
        'GET /auth/profile': '获取用户信息成功',
        'GET /users/profile': '获取用户信息成功',
        'GET /users/check-auth': '认证验证成功',
      };

      if (specialRouteMessages[routeKey]) {
        return specialRouteMessages[routeKey];
      }

      // 基于路由模式的动态消息生成
      if (normalizedPath.includes('/auth/')) {
        switch (method) {
          case 'POST':
            return this.extractOperationName(normalizedPath) + '成功';
          case 'GET':
            return '获取成功';
          default:
            return '操作成功';
        }
      }
    }

    // 默认HTTP方法消息映射
    const messages: Record<string, string> = {
      GET: '查询成功',
      POST: '创建成功',
      PUT: '更新成功',
      PATCH: '更新成功',
      DELETE: '删除成功',
    };

    return messages[method] || '操作成功';
  }

  /**
   * 从路由路径中提取操作名称
   * 例如: '/auth/login' -> '登录'
   */
  private extractOperationName(path: string): string {
    const segments = path.split('/').filter((segment) => segment.length > 0);
    const lastSegment = segments[segments.length - 1];

    // 常见操作的英文到中文映射
    const operationMap: Record<string, string> = {
      login: '登录',
      logout: '注销',
      register: '注册',
      profile: '获取信息',
      'check-auth': '认证验证',
    };

    return operationMap[lastSegment] || '操作';
  }
}
