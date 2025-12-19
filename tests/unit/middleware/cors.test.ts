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

