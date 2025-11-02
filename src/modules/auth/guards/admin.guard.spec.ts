import { AdminGuard } from './admin.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access for admin user', () => {
      const mockRequest = {
        user: {
          userId: '123',
          userName: 'admin',
          userType: 1, // Admin
        },
      } as any;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should throw UnauthorizedException when no user is attached', () => {
      const mockRequest = {
        user: undefined,
      } as any;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockContext)).toThrow('用户未认证');
    });

    it('should throw UnauthorizedException for non-admin user', () => {
      const mockRequest = {
        user: {
          userId: '123',
          userName: 'user',
          userType: 10, // Regular user
        },
      } as any;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockContext)).toThrow('需要管理员权限');
    });

    it('should throw UnauthorizedException for user with undefined userType', () => {
      const mockRequest = {
        user: {
          userId: '123',
          userName: 'user',
          userType: undefined,
        },
      } as any;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockContext)).toThrow('需要管理员权限');
    });
  });
});