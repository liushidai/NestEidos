import { ResponseInterceptor } from './response.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  const createMockContext = (method: string, url: string, statusCode: number = 200) => {
    const mockRequest = {
      method,
      url,
      route: { path: url },
    };

    const mockResponse = {
      statusCode,
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    return { mockContext, mockRequest, mockResponse };
  };

  const createMockCallHandler = (data: any = null) => {
    return {
      handle: () => of(data),
    } as CallHandler;
  };

  describe('基本响应包装', () => {
    it('应该正确包装响应数据', async () => {
      const { mockContext } = createMockContext('GET', '/test');
      const testData = { id: 1, name: 'test' };
      const mockNext = createMockCallHandler(testData);

      const result = await interceptor.intercept(mockContext, mockNext).toPromise();
      expect(result).toBeDefined();

      expect(result!).toEqual({
        code: 200,
        message: expect.any(String),
        data: testData,
        timestamp: expect.any(String),
        path: '/test',
      });
    });

    it('应该使用正确的响应状态码', async () => {
      const { mockContext } = createMockContext('POST', '/test', 201);
      const testData = { id: 1 };
      const mockNext = createMockCallHandler(testData);

      const result = await interceptor.intercept(mockContext, mockNext).toPromise();
      expect(result).toBeDefined();
      expect(result!.code).toBe(201);
    });
  });

  describe('默认HTTP方法消息', () => {
    const testCases = [
      { method: 'GET', expected: '查询成功' },
      { method: 'POST', expected: '创建成功' },
      { method: 'PUT', expected: '更新成功' },
      { method: 'PATCH', expected: '更新成功' },
      { method: 'DELETE', expected: '删除成功' },
    ];

    testCases.forEach(({ method, expected }) => {
      it(`${method} 请求应该返回 "${expected}"`, async () => {
        const { mockContext } = createMockContext(method, '/test');
        const mockNext = createMockCallHandler(null);

        const result = await interceptor.intercept(mockContext, mockNext).toPromise();
        expect(result).toBeDefined();
        expect(result!.message).toBe(expected);
      });
    });

    it('未知方法应该返回默认消息', async () => {
      const { mockContext } = createMockContext('UNKNOWN', '/test');
      const mockNext = createMockCallHandler(null);

      const result = await interceptor.intercept(mockContext, mockNext).toPromise();
      expect(result).toBeDefined();
      expect(result!.message).toBe('操作成功');
    });
  });

  describe('特殊路由语义化消息', () => {
    const specialRoutes = [
      { method: 'POST', path: '/auth/login', expected: '登录成功' },
      { method: 'POST', path: '/auth/logout', expected: '注销成功' },
      { method: 'POST', path: '/auth/register', expected: '注册成功' },
      { method: 'GET', path: '/auth/profile', expected: '获取用户信息成功' },
      { method: 'GET', path: '/users/profile', expected: '获取用户信息成功' },
      { method: 'GET', path: '/users/check-auth', expected: '认证验证成功' },
    ];

    specialRoutes.forEach(({ method, path, expected }) => {
      it(`${method} ${path} 应该返回 "${expected}"`, async () => {
        const { mockContext } = createMockContext(method, path);
        const mockNext = createMockCallHandler(null);

        const result = await interceptor.intercept(mockContext, mockNext).toPromise();
        expect(result).toBeDefined();
        expect(result!.message).toBe(expected);
      });
    });
  });

  describe('认证路由动态消息生成', () => {
    it('应该为认证相关的POST路由生成语义化消息', async () => {
      const { mockContext } = createMockContext('POST', '/auth/custom-action');
      const mockNext = createMockCallHandler(null);

      const result = await interceptor.intercept(mockContext, mockNext).toPromise();
      expect(result).toBeDefined();
      // custom-action 不在操作名称映射中，应该返回默认的"操作成功"
      expect(result!.message).toBe('操作成功');
    });

    it('应该为认证相关的GET路由返回获取成功', async () => {
      const { mockContext } = createMockContext('GET', '/auth/some-endpoint');
      const mockNext = createMockCallHandler(null);

      const result = await interceptor.intercept(mockContext, mockNext).toPromise();
      expect(result).toBeDefined();
      expect(result!.message).toBe('获取成功');
    });

    it('应该为认证相关的其他方法返回操作成功', async () => {
      const { mockContext } = createMockContext('PUT', '/auth/some-endpoint');
      const mockNext = createMockCallHandler(null);

      const result = await interceptor.intercept(mockContext, mockNext).toPromise();
      expect(result).toBeDefined();
      expect(result!.message).toBe('操作成功');
    });
  });

  describe('操作名称提取功能', () => {
    const operationTests = [
      { path: '/auth/login', expected: '登录' },
      { path: '/auth/logout', expected: '注销' },
      { path: '/auth/register', expected: '注册' },
      { path: '/auth/profile', expected: '获取信息' },
      { path: '/auth/unknown-operation', expected: '操作' },
    ];

    operationTests.forEach(({ path, expected }) => {
      it(`应该从路径 "${path}" 提取操作名称 "${expected}"`, async () => {
        const { mockContext } = createMockContext('POST', path);
        const mockNext = createMockCallHandler(null);

        const result = await interceptor.intercept(mockContext, mockNext).toPromise();
        expect(result).toBeDefined();
        expect(result!.message).toBe(`${expected}成功`);
      });
    });
  });

  describe('边界情况处理', () => {
    it('应该处理路径为空的情况', async () => {
      const mockRequest = {
        method: 'GET',
        url: '',
        route: { path: undefined },
      };

      const mockResponse = { statusCode: 200 };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockNext = createMockCallHandler(null);
      const result = await interceptor.intercept(mockContext, mockNext).toPromise();
      expect(result).toBeDefined();
      expect(result!.message).toBe('查询成功');
    });

    it('应该处理路径包含多个斜杠的情况', async () => {
      const { mockContext } = createMockContext('POST', '/api/v1/auth/login');
      const mockNext = createMockCallHandler(null);

      const result = await interceptor.intercept(mockContext, mockNext).toPromise();
      expect(result).toBeDefined();
      // 由于有特殊路由映射，应该优先匹配
      expect(result!.message).toBe('登录成功');
    });

    it('应该处理路径末尾有斜杠的情况', async () => {
      const { mockContext } = createMockContext('POST', '/auth/login/');
      const mockNext = createMockCallHandler(null);

      const result = await interceptor.intercept(mockContext, mockNext).toPromise();
      expect(result).toBeDefined();
      // 路径规范化后应该能正确匹配特殊路由
      expect(result!.message).toBe('登录成功');
    });
  });

  describe('时间戳和路径验证', () => {
    it('应该生成有效的ISO时间戳', async () => {
      const { mockContext } = createMockContext('GET', '/test');
      const mockNext = createMockCallHandler(null);

      const result = await interceptor.intercept(mockContext, mockNext).toPromise();
      expect(result).toBeDefined();
      expect(result!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(result!.timestamp)).toBeInstanceOf(Date);
    });

    it('应该正确设置请求路径', async () => {
      const { mockContext } = createMockContext('GET', '/api/users/123');
      const mockNext = createMockCallHandler(null);

      const result = await interceptor.intercept(mockContext, mockNext).toPromise();
      expect(result).toBeDefined();
      expect(result!.path).toBe('/api/users/123');
    });
  });
});