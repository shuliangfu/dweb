/**
 * 认证中间件扩展测试
 * 补充 auth 中间件的其他功能测试
 */

import { assertEquals, assert } from '@std/assert';
import { auth, signJWT } from '../../../src/middleware/auth.ts';

Deno.test('Auth Middleware - 从 Cookie 读取 Token', async () => {
  const middleware = auth({
    secret: 'test-secret-key',
    cookieName: 'auth-token',
  });
  
  // 生成一个有效的 JWT Token
  const token = await signJWT({ userId: '123' }, 'test-secret-key', 3600);
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/protected',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: { 'auth-token': token },
    getCookie: function(name: string) {
      return this.cookies[name] || null;
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
  
  // 从 Cookie 读取的有效 Token 应该通过
  assert(nextCalled);
  assertEquals(res.status, 200);
  // 验证用户信息已附加到请求
  assert((req as any).user !== undefined);
});

Deno.test('Auth Middleware - 自定义 Token 前缀', async () => {
  const middleware = auth({
    secret: 'test-secret-key',
    tokenPrefix: 'Token ',
  });
  
  // 生成一个有效的 JWT Token
  const token = await signJWT({ userId: '123' }, 'test-secret-key', 3600);
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/protected',
    headers: new Headers({
      'Authorization': `Token ${token}`,
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
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 自定义前缀的 Token 应该通过
  assert(nextCalled);
  assertEquals(res.status, 200);
});

Deno.test('Auth Middleware - 自定义请求头名称', async () => {
  const middleware = auth({
    secret: 'test-secret-key',
    headerName: 'X-Auth-Token',
  });
  
  // 生成一个有效的 JWT Token
  const token = await signJWT({ userId: '123' }, 'test-secret-key', 3600);
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/protected',
    headers: new Headers({
      'X-Auth-Token': `Bearer ${token}`,
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
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 自定义请求头名称的 Token 应该通过
  assert(nextCalled);
  assertEquals(res.status, 200);
});

Deno.test('Auth Middleware - 自定义验证函数', async () => {
  let customVerifyCalled = false;
  
  const middleware = auth({
    secret: 'test-secret-key',
    verifyToken: async (token: string, _secret: string) => {
      customVerifyCalled = true;
      // 简单的验证逻辑（实际应该验证 JWT）
      if (token === 'custom-valid-token') {
        return { userId: '123', custom: true };
      }
      return null;
    },
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/protected',
    headers: new Headers({
      'Authorization': 'Bearer custom-valid-token',
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
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 自定义验证函数应该被调用
  assert(customVerifyCalled);
  assert(nextCalled);
  assertEquals(res.status, 200);
  // 验证用户信息已附加
  assert((req as any).user !== undefined);
  assert((req as any).user.custom === true);
});

Deno.test('Auth Middleware - 错误处理回调', async () => {
  let errorCallbackCalled = false;
  let errorMessage = '';
  
  const middleware = auth({
    secret: 'test-secret-key',
    onError: (error: Error) => {
      errorCallbackCalled = true;
      errorMessage = error.message;
    },
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
  
  // 无 Token 时应该调用错误回调
  assert(errorCallbackCalled);
  assert(errorMessage.includes('No token') || errorMessage.length > 0);
  assertEquals(res.status, 401);
  assert(!nextCalled);
});

Deno.test('Auth Middleware - 无效 Token 处理', async () => {
  const middleware = auth({
    secret: 'test-secret-key',
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/protected',
    headers: new Headers({
      'Authorization': 'Bearer invalid-token-12345',
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
  if (res.body) {
    const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
    assert(body.error !== undefined);
  }
});

Deno.test('Auth Middleware - signJWT 生成 Token', async () => {
  const payload = { userId: '123', role: 'admin' };
  const token = await signJWT(payload, 'test-secret', 3600);
  
  // Token 应该是一个字符串
  assert(typeof token === 'string');
  assert(token.length > 0);
  
  // Token 应该包含三个部分（JWT 格式：header.payload.signature）
  const parts = token.split('.');
  assertEquals(parts.length, 3);
});

Deno.test('Auth Middleware - signJWT 过期时间', async () => {
  const payload = { userId: '123' };
  
  // 生成一个短期过期的 Token（1 秒）
  const shortToken = await signJWT(payload, 'test-secret', 1);
  
  // 等待 2 秒
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 验证 Token 应该已过期
  const middleware = auth({
    secret: 'test-secret',
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/protected',
    headers: new Headers({
      'Authorization': `Bearer ${shortToken}`,
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
  
  // 过期的 Token 应该返回 401
  assertEquals(res.status, 401);
  assert(!nextCalled);
});

