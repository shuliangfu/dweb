/**
 * 认证中间件单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { auth, type AuthOptions } from '../../../src/middleware/auth.ts';

Deno.test('Auth Middleware - 创建中间件', () => {
  const middleware = auth({
    secret: 'test-secret-key',
  });
  
  assert(middleware !== null);
  assert(typeof middleware === 'function');
});

Deno.test('Auth Middleware - 无 Token 时返回 401', async () => {
  const middleware = auth({
    secret: 'test-secret-key',
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/protected',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: {},
    getCookie: function(_name: string) {
      return null;
    },
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
  
  // 无 Token 应该返回 401
  assertEquals(res.status, 401);
  assert(!nextCalled);
});

Deno.test('Auth Middleware - 跳过公开路径', async () => {
  const middleware = auth({
    secret: 'test-secret-key',
    skip: ['/public/*'],
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/public/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: {},
    getCookie: function(_name: string) {
      return null;
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 公开路径应该跳过认证
  assert(nextCalled);
});

Deno.test('Auth Middleware - 从 Header 读取 Token', async () => {
  // 注意：这个测试需要实际的 JWT Token，这里只测试中间件可以正常处理
  const middleware = auth({
    secret: 'test-secret-key',
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/protected',
    headers: new Headers({
      'Authorization': 'Bearer invalid-token',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: {},
    getCookie: function(_name: string) {
      return null;
    },
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
  
  // 无效 Token 应该返回 401
  assertEquals(res.status, 401);
  assert(!nextCalled);
});

