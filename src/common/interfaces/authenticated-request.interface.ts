import { Request } from 'express';

/**
 * 认证后的用户信息
 */
export interface AuthenticatedUser {
  userId: string;
  userType: number;
  userName: string;
}

/**
 * 扩展的 Express Request 接口，包含认证用户信息
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
