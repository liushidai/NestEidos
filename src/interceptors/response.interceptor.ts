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
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => ({
        code: response.statusCode || 200,
        message: this.getSuccessMessage(request.method, request.route?.path),
        data,
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }

  private getSuccessMessage(method: string, path?: string): string {
    const messages: Record<string, string> = {
      GET: '查询成功',
      POST: '操作成功',
      PUT: '更新成功',
      PATCH: '更新成功',
      DELETE: '删除成功',
    };

    return messages[method] || '操作成功';
  }
}