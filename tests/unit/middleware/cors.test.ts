/**
 * CORS 中间件单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { cors } from '../../../src/middleware/cors.ts';

Deno.test('CORS Middleware - 默认配置允许所有来源', async () => {
  const middleware = cors();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Origin': 'http://example.com',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert(nextCalled);
});

Deno.test('CORS Middleware - 处理预检请求', async () => {
  const middleware = cors();
  
  const req = {
    method: 'OPTIONS',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Origin': 'http://example.com',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  assertEquals(res.status, 204);
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert(res.headers.get('Access-Control-Allow-Methods')?.includes('GET'));
  assert(!nextCalled); // 预检请求不应该调用 next
});

Deno.test('CORS Middleware - 允许特定来源', async () => {
  const middleware = cors({
    origin: 'http://example.com',
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Origin': 'http://example.com',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), 'http://example.com');
  assert(nextCalled);
});

Deno.test('CORS Middleware - 允许凭证', async () => {
  const middleware = cors({
    credentials: true,
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Origin': 'http://example.com',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  assertEquals(res.headers.get('Access-Control-Allow-Credentials'), 'true');
  assert(nextCalled);
});

Deno.test('CORS Middleware - 允许多个来源（数组）', async () => {
  const middleware = cors({
    origin: ['http://example.com', 'http://test.com'],
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Origin': 'http://example.com',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 匹配的来源应该被允许
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), 'http://example.com');
  assert(nextCalled);
});

Deno.test('CORS Middleware - 不匹配的来源（数组）', async () => {
  const middleware = cors({
    origin: ['http://example.com', 'http://test.com'],
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Origin': 'http://unauthorized.com',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 不匹配的来源不应该设置 Access-Control-Allow-Origin
  assert(res.headers.get('Access-Control-Allow-Origin') === null);
  assert(nextCalled);
});

Deno.test('CORS Middleware - 函数形式的 origin 配置', async () => {
  const middleware = cors({
    origin: (origin: string | null) => {
      return origin === 'http://example.com';
    },
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Origin': 'http://example.com',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 函数返回 true 时应该设置 origin
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), 'http://example.com');
  assert(nextCalled);
});

Deno.test('CORS Middleware - 函数形式的 origin 配置（拒绝）', async () => {
  const middleware = cors({
    origin: (origin: string | null) => {
      return origin === 'http://example.com';
    },
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Origin': 'http://unauthorized.com',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 函数返回 false 时不应该设置 origin
  assert(res.headers.get('Access-Control-Allow-Origin') === null);
  assert(nextCalled);
});

Deno.test('CORS Middleware - 暴露响应头', async () => {
  const middleware = cors({
    exposedHeaders: ['X-Custom-Header', 'X-Another-Header'],
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Origin': 'http://example.com',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 应该设置暴露的响应头
  const exposedHeaders = res.headers.get('Access-Control-Expose-Headers');
  assert(exposedHeaders !== null);
  assert(exposedHeaders.includes('X-Custom-Header'));
  assert(exposedHeaders.includes('X-Another-Header'));
  assert(nextCalled);
});

Deno.test('CORS Middleware - 自定义 maxAge', async () => {
  const middleware = cors({
    maxAge: 3600,
  });
  
  const req = {
    method: 'OPTIONS',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Origin': 'http://example.com',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 预检请求应该设置 maxAge
  assertEquals(res.headers.get('Access-Control-Max-Age'), '3600');
  assertEquals(res.status, 204);
  assert(!nextCalled);
});

Deno.test('CORS Middleware - 自定义方法和请求头', async () => {
  const middleware = cors({
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-Custom-Header'],
  });
  
  const req = {
    method: 'OPTIONS',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Origin': 'http://example.com',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 应该设置自定义的方法和请求头
  const methods = res.headers.get('Access-Control-Allow-Methods');
  assert(methods !== null);
  assert(methods.includes('GET'));
  assert(methods.includes('POST'));
  
  const headers = res.headers.get('Access-Control-Allow-Headers');
  assert(headers !== null);
  assert(headers.includes('Content-Type'));
  assert(headers.includes('X-Custom-Header'));
  
  assertEquals(res.status, 204);
  assert(!nextCalled);
});

Deno.test('CORS Middleware - 没有 Origin 头的请求', async () => {
  const middleware = cors();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(), // 没有 Origin
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 默认配置应该允许所有来源（设置为 *）
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert(nextCalled);
});

