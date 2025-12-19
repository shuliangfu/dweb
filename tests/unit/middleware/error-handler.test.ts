/**
 * 错误处理中间件单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { errorHandler } from '../../../src/middleware/error-handler.ts';

Deno.test('Error Handler Middleware - 创建中间件', () => {
  const middleware = errorHandler();
  
  assert(middleware !== null);
  assert(typeof middleware === 'function');
});

Deno.test('Error Handler Middleware - 捕获并处理错误', async () => {
  const middleware = errorHandler({
    debug: true,
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
    json: function(data: any) {
      this.body = data;
      return this;
    },
    body: undefined as any,
  } as any;
  
  const error = new Error('Test error');
  (error as any).statusCode = 500;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
    throw error;
  };
  
  await middleware(req, res, next);
  
  assert(nextCalled);
  assertEquals(res.status, 500);
  assert(res.body !== undefined);
  const body = res.body as any;
  assertEquals(body.error, 'Error');
  assertEquals(body.message, 'Test error');
  assertEquals(body.statusCode, 500);
});

Deno.test('Error Handler Middleware - 自动识别错误状态码', async () => {
  const middleware = errorHandler();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
    json: function(data: any) {
      this.body = data;
      return this;
    },
    body: undefined as any,
  } as any;
  
  const error = new Error('Not found') as Error & { statusCode?: number };
  error.statusCode = 404;
  
  const next = async () => {
    throw error;
  };
  
  await middleware(req, res, next);
  
  assertEquals(res.status, 404);
  const body = res.body as any;
  assertEquals(body.statusCode, 404);
});

Deno.test('Error Handler Middleware - 生产环境隐藏详细信息', async () => {
  const middleware = errorHandler({
    debug: false,
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
    json: function(data: any) {
      this.body = data;
      return this;
    },
    body: undefined as any,
  } as any;
  
  const error = new Error('Internal server error');
  
  const next = async () => {
    throw error;
  };
  
  await middleware(req, res, next);
  
  assertEquals(res.status, 500);
  const body = res.body as any;
  assertEquals(body.message, 'Internal server error');
  // 生产环境不应该包含堆栈信息
  assert(body.details === undefined);
});

Deno.test('Error Handler Middleware - 自定义错误格式化', async () => {
  const middleware = errorHandler({
    formatError: (error, req) => {
      return {
        success: false,
        error: error.name,
        message: error.message,
        statusCode: (error as any).statusCode || 500,
        path: req.url,
      };
    },
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
    json: function(data: any) {
      this.body = data;
      return this;
    },
    body: undefined as any,
  } as any;
  
  const error = new Error('Test error');
  
  const next = async () => {
    throw error;
  };
  
  await middleware(req, res, next);
  
  const body = res.body as any;
  assertEquals(body.success, false);
  assertEquals(body.error, 'Error');
  assertEquals(body.message, 'Test error');
  assertEquals(body.path, 'http://localhost:3000/test');
});

Deno.test('Error Handler Middleware - 自定义错误日志记录', async () => {
  let errorLogged = false;
  const middleware = errorHandler({
    onError: (error, req) => {
      errorLogged = true;
      assert(error.message === 'Test error');
      assert(req.url === 'http://localhost:3000/test');
    },
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
    json: function(data: any) {
      this.body = data;
      return this;
    },
    body: undefined as any,
  } as any;
  
  const error = new Error('Test error');
  
  const next = async () => {
    throw error;
  };
  
  await middleware(req, res, next);
  
  assert(errorLogged);
});

Deno.test('Error Handler Middleware - 跳过特定路径', async () => {
  const middleware = errorHandler({
    skip: ['/health'],
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/health',
    headers: new Headers(),
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
    json: function(data: any) {
      this.body = data;
      return this;
    },
    body: undefined as any,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
    // 跳过的路径，错误处理中间件不会捕获错误
    // 这里不抛出错误，只验证中间件正常执行
  };
  
  await middleware(req, res, next);
  
  // 跳过的路径应该正常执行
  assert(nextCalled);
  assertEquals(res.status, 200);
});

Deno.test('Error Handler Middleware - 正常请求不处理', async () => {
  const middleware = errorHandler();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
    json: function(data: any) {
      this.body = data;
      return this;
    },
    body: undefined as any,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  assert(nextCalled);
  assertEquals(res.status, 200);
  assert(res.body === undefined);
});

