/**
 * 健康检查中间件单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { health } from '../../../src/middleware/health.ts';

Deno.test('Health Middleware - 创建中间件', () => {
  const middleware = health();
  
  assert(middleware !== null);
  assert(typeof middleware === 'function');
});

Deno.test('Health Middleware - 默认健康检查', async () => {
  const middleware = health();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/health',
    headers: new Headers(),
    getHeader: function(_name: string) {
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
  
  // 应该返回健康状态
  assertEquals(res.status, 200);
  assert(res.body !== undefined);
  const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
  assertEquals(body.status, 'ok');
  assert(!nextCalled); // 健康检查不应该调用 next
});

Deno.test('Health Middleware - 就绪检查', async () => {
  const middleware = health();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/health/ready',
    headers: new Headers(),
    getHeader: function(_name: string) {
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
  
  // 应该返回就绪状态
  assertEquals(res.status, 200);
  assert(res.body !== undefined);
  const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
  assertEquals(body.status, 'ready');
  assert(!nextCalled);
});

Deno.test('Health Middleware - 存活检查', async () => {
  const middleware = health();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/health/live',
    headers: new Headers(),
    getHeader: function(_name: string) {
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
  
  // 应该返回存活状态
  assertEquals(res.status, 200);
  assert(res.body !== undefined);
  const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
  assertEquals(body.status, 'alive');
  assert(!nextCalled);
});

Deno.test('Health Middleware - 自定义健康检查函数', async () => {
  const middleware = health({
    healthCheck: async () => ({
      status: 'ok',
      message: 'Custom health check',
      details: { custom: 'data' },
    }),
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/health',
    headers: new Headers(),
    getHeader: function(_name: string) {
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
  
  // 应该返回自定义健康状态
  assertEquals(res.status, 200);
  const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
  assertEquals(body.status, 'ok');
  assertEquals(body.message, 'Custom health check');
  assertEquals(body.custom, 'data');
});

Deno.test('Health Middleware - 非健康检查路径继续处理', async () => {
  const middleware = health();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/other',
    headers: new Headers(),
    getHeader: function(_name: string) {
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
  
  // 非健康检查路径应该调用 next
  assert(nextCalled);
});

