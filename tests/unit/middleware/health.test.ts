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

Deno.test('Health Middleware - 健康检查返回 error 状态', async () => {
  const middleware = health({
    healthCheck: async () => ({
      status: 'error',
      message: 'Service is unhealthy',
      details: { reason: 'Database connection failed' },
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
  
  // 应该返回 503 状态
  assertEquals(res.status, 503);
  const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
  assertEquals(body.status, 'error');
  assertEquals(body.message, 'Service is unhealthy');
  assertEquals(body.reason, 'Database connection failed');
  assert(!nextCalled);
});

Deno.test('Health Middleware - 就绪检查返回 not-ready 状态', async () => {
  const middleware = health({
    readyCheck: async () => ({
      status: 'not-ready',
      message: 'Service is not ready',
      details: { reason: 'Initializing' },
    }),
  });
  
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
  
  // 应该返回 503 状态
  assertEquals(res.status, 503);
  const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
  assertEquals(body.status, 'not-ready');
  assertEquals(body.message, 'Service is not ready');
  assertEquals(body.reason, 'Initializing');
  assert(!nextCalled);
});

Deno.test('Health Middleware - 存活检查返回 dead 状态', async () => {
  const middleware = health({
    liveCheck: async () => ({
      status: 'dead',
      message: 'Service is dead',
      details: { reason: 'Process terminated' },
    }),
  });
  
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
  
  // 应该返回 503 状态
  assertEquals(res.status, 503);
  const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
  assertEquals(body.status, 'dead');
  assertEquals(body.message, 'Service is dead');
  assertEquals(body.reason, 'Process terminated');
  assert(!nextCalled);
});

Deno.test('Health Middleware - 健康检查函数抛出异常', async () => {
  const middleware = health({
    healthCheck: async () => {
      throw new Error('Health check failed');
    },
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
  
  // 应该返回 503 状态
  assertEquals(res.status, 503);
  const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
  assertEquals(body.status, 'error');
  assertEquals(body.message, 'Health check failed');
  assert(!nextCalled);
});

Deno.test('Health Middleware - 自定义路径配置', async () => {
  const middleware = health({
    path: '/custom-health',
    readyPath: '/custom-ready',
    livePath: '/custom-live',
  });
  
  // 测试自定义健康检查路径
  const req1 = {
    method: 'GET',
    url: 'http://localhost:3000/custom-health',
    headers: new Headers(),
    getHeader: function(_name: string) {
      return null;
    },
  } as any;
  
  const res1 = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
    json: function(data: any) {
      this.body = data;
      return this;
    },
    body: undefined as any,
  } as any;
  
  let nextCalled1 = false;
  const next1 = async () => {
    nextCalled1 = true;
  };
  
  await middleware(req1, res1, next1);
  
  assertEquals(res1.status, 200);
  const body1 = typeof res1.body === 'string' ? JSON.parse(res1.body) : res1.body;
  assertEquals(body1.status, 'ok');
  assert(!nextCalled1);
  
  // 测试自定义就绪检查路径
  const req2 = {
    method: 'GET',
    url: 'http://localhost:3000/custom-ready',
    headers: new Headers(),
    getHeader: function(_name: string) {
      return null;
    },
  } as any;
  
  const res2 = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
    json: function(data: any) {
      this.body = data;
      return this;
    },
    body: undefined as any,
  } as any;
  
  let nextCalled2 = false;
  const next2 = async () => {
    nextCalled2 = true;
  };
  
  await middleware(req2, res2, next2);
  
  assertEquals(res2.status, 200);
  const body2 = typeof res2.body === 'string' ? JSON.parse(res2.body) : res2.body;
  assertEquals(body2.status, 'ready');
  assert(!nextCalled2);
  
  // 测试自定义存活检查路径
  const req3 = {
    method: 'GET',
    url: 'http://localhost:3000/custom-live',
    headers: new Headers(),
    getHeader: function(_name: string) {
      return null;
    },
  } as any;
  
  const res3 = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
    json: function(data: any) {
      this.body = data;
      return this;
    },
    body: undefined as any,
  } as any;
  
  let nextCalled3 = false;
  const next3 = async () => {
    nextCalled3 = true;
  };
  
  await middleware(req3, res3, next3);
  
  assertEquals(res3.status, 200);
  const body3 = typeof res3.body === 'string' ? JSON.parse(res3.body) : res3.body;
  assertEquals(body3.status, 'alive');
  assert(!nextCalled3);
});

