import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../../common/interfaces/authenticated-request.interface';
import { AuthService } from '../auth.service';

@Injectable()
export class TokenGuard implements CanActivate {
  private readonly logger = new Logger(TokenGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest() as AuthenticatedRequest;
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('未提供认证令牌');
    }

    const user = await this.authService.validateToken(token);

    if (!user) {
      throw new UnauthorizedException('认证令牌无效或已过期');
    }

    // 检查用户的最新状态
    const currentUser = await this.authService.getUserById(user.userId);
    if (!currentUser) {
      this.logger.warn(`Token 对应的用户不存在: ${user.userName}, 注销 token`);
      await this.authService.logout(token);
      throw new UnauthorizedException('用户不存在，认证令牌已失效');
    }

    // 检查用户状态
    if (currentUser.userStatus === 2) {
      this.logger.warn(
        `被封锁的用户尝试访问: ${currentUser.userName}, 注销 token`,
      );
      await this.authService.logout(token);
      throw new UnauthorizedException('账户已被封锁，请联系管理员');
    }

    if (currentUser.userStatus !== 1) {
      this.logger.warn(
        `用户状态异常: ${currentUser.userName}, 状态: ${currentUser.userStatus}, 注销 token`,
      );
      await this.authService.logout(token);
      throw new UnauthorizedException('账户状态异常，请联系管理员');
    }

    // 更新缓存的用户信息（以防有其他信息变更）
    Object.assign(user, {
      userStatus: currentUser.userStatus,
      updatedAt: currentUser.updatedAt,
    });

    // 将用户信息挂载到 request 对象上
    request.user = user;

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
