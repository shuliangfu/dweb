/**
 * 限流中间件单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { rateLimit } from '../../../src/middleware/rate-limit.ts';

Deno.test('Rate Limit Middleware - 创建中间件', () => {
  const middleware = rateLimit({
    windowMs: 60000,
    max: 100,
  });
  
  assert(middleware !== null);
  assert(typeof middleware === 'function');
});

Deno.test('Rate Limit Middleware - 限制请求频率', async () => {
  const middleware = rateLimit({
    windowMs: 1000, // 1 秒
    max: 2, // 最多 2 个请求
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
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
  
  // 第一次请求应该通过
  await middleware(req, res, next);
  assert(nextCalled);
  nextCalled = false;
  
  // 第二次请求应该通过
  await middleware(req, res, next);
  assert(nextCalled);
  nextCalled = false;
  
  // 第三次请求应该被限制
  await middleware(req, res, next);
  assertEquals(res.status, 429);
  assert(!nextCalled);
});

Deno.test('Rate Limit Middleware - 跳过某些请求', async () => {
  const middleware = rateLimit({
    windowMs: 1000,
    max: 1,
    skip: (req) => req.url.includes('/skip'),
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/skip/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
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
  
  // 即使超过限制，跳过的请求也应该通过
  await middleware(req, res, next);
  assert(nextCalled);
});

Deno.test('Rate Limit Middleware - 自定义错误消息', async () => {
  const middleware = rateLimit({
    windowMs: 1000,
    max: 1,
    message: 'Too many requests, please try again later',
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
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
  
  // 第一次请求通过
  await middleware(req, res, next);
  nextCalled = false;
  
  // 第二次请求被限制
  await middleware(req, res, next);
  assertEquals(res.status, 429);
  if (res.body) {
    const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
    assert(body.message?.includes('Too many requests'));
  }
});

