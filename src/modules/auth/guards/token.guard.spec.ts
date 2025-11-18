import { Test, TestingModule } from '@nestjs/testing';
import { TokenGuard } from './token.guard';
import { AuthService } from '../auth.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('TokenGuard', () => {
  let guard: TokenGuard;
  let authService: jest.Mocked<AuthService>;
  let mockContext: ExecutionContext;

  const mockUser = {
    userId: '1234567890123456789',
    userName: 'testuser',
    userType: 10,
  };

  const mockAuthService = {
    validateToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenGuard,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        Reflector,
      ],
    }).compile();

    guard = module.get<TokenGuard>(TokenGuard);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  const createMockContext = (headers: any = {}, query: any = {}) => {
    const request = {
      headers,
      query,
      user: undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const validToken =
      'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';

    it('should allow access with valid Bearer token', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockUser);
      mockContext = createMockContext({
        authorization: `Bearer ${validToken}`,
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthService.validateToken).toHaveBeenCalledWith(validToken);
      expect(mockContext.switchToHttp().getRequest<any>().user).toEqual(
        mockUser,
      );
    });

    it('should allow access with valid token in query params', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockUser);
      mockContext = createMockContext({}, { token: validToken });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthService.validateToken).toHaveBeenCalledWith(validToken);
    });

    it('should throw UnauthorizedException when no token is provided', async () => {
      mockContext = createMockContext();

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthService.validateToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when authorization header is malformed', async () => {
      mockContext = createMockContext({
        authorization: 'InvalidFormat',
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthService.validateToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthService.validateToken.mockResolvedValue(null);
      mockContext = createMockContext({
        authorization: `Bearer ${validToken}`,
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthService.validateToken).toHaveBeenCalledWith(validToken);
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      mockAuthService.validateToken.mockResolvedValue(null);
      mockContext = createMockContext({
        authorization: `Bearer ${validToken}`,
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthService.validateToken).toHaveBeenCalledWith(validToken);
    });

    it('should handle empty authorization header', async () => {
      mockContext = createMockContext({
        authorization: '',
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthService.validateToken).not.toHaveBeenCalled();
    });

    it('should handle authorization header without Bearer prefix', async () => {
      mockContext = createMockContext({
        authorization: validToken,
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthService.validateToken).not.toHaveBeenCalled();
    });
  });
});
