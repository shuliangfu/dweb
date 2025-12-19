/**
 * IP 过滤中间件单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { ipFilter } from '../../../src/middleware/ip-filter.ts';

Deno.test('IP Filter Middleware - 创建中间件', () => {
  const middleware = ipFilter({
    whitelist: ['192.168.1.100'],
  });
  
  assert(middleware !== null);
  assert(typeof middleware === 'function');
});

Deno.test('IP Filter Middleware - 白名单模式 - 允许的 IP', async () => {
  const middleware = ipFilter({
    whitelist: ['192.168.1.100', '10.0.0.1'],
    whitelistMode: true,
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'x-forwarded-for': '192.168.1.100',
    }),
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
});

Deno.test('IP Filter Middleware - 白名单模式 - 拒绝的 IP', async () => {
  const middleware = ipFilter({
    whitelist: ['192.168.1.100'],
    whitelistMode: true,
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'x-forwarded-for': '192.168.1.200',
    }),
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
  assert(!nextCalled);
  assertEquals(res.status, 403);
});

Deno.test('IP Filter Middleware - 黑名单模式 - 拒绝的 IP', async () => {
  const middleware = ipFilter({
    blacklist: ['192.168.1.200'],
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'x-forwarded-for': '192.168.1.200',
    }),
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
  assert(!nextCalled);
  assertEquals(res.status, 403);
});

Deno.test('IP Filter Middleware - 黑名单模式 - 允许的 IP', async () => {
  const middleware = ipFilter({
    blacklist: ['192.168.1.200'],
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'x-forwarded-for': '192.168.1.100',
    }),
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
});

Deno.test('IP Filter Middleware - CIDR 格式支持', async () => {
  const middleware = ipFilter({
    whitelist: ['192.168.1.0/24'],
    whitelistMode: true,
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'x-forwarded-for': '192.168.1.100',
    }),
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
});

Deno.test('IP Filter Middleware - 跳过特定路径', async () => {
  const middleware = ipFilter({
    whitelist: ['192.168.1.100'],
    whitelistMode: true,
    skip: ['/public/*'],
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/public/test',
    headers: new Headers({
      'x-forwarded-for': '192.168.1.200', // 不在白名单中
    }),
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
  assert(nextCalled); // 应该跳过验证
  assertEquals(res.status, 200);
});

Deno.test('IP Filter Middleware - 自定义 IP 获取函数', async () => {
  const middleware = ipFilter({
    whitelist: ['192.168.1.100'],
    whitelistMode: true,
    getClientIP: (req) => {
      return req.headers.get('x-custom-ip') || 'unknown';
    },
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'x-custom-ip': '192.168.1.100',
    }),
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
});

