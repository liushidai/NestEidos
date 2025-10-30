import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class TokenGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('未提供认证令牌');
    }

    const user = await this.authService.validateToken(token);

    if (!user) {
      throw new UnauthorizedException('认证令牌无效或已过期');
    }

    // 将用户信息挂载到 request 对象上
    (request as any).user = user;

    return true;
  }

  private extractTokenFromRequest(request: Request): string | null {
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 也可以从 query 参数中获取 token（用于测试或特殊情况）
    const tokenFromQuery = request.query.token as string;
    if (tokenFromQuery) {
      return tokenFromQuery;
    }

    return null;
  }
}