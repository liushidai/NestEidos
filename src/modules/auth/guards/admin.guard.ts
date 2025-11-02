import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * 管理员权限守卫
 * 验证当前用户是否为管理员（userType = 1）
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('用户未认证');
    }

    if (user.userType !== 1) {
      throw new UnauthorizedException('需要管理员权限');
    }

    return true;
  }
}