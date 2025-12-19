/**
 * 请求 ID 中间件单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { requestId } from '../../../src/middleware/request-id.ts';

Deno.test('Request ID Middleware - 创建中间件', () => {
  const middleware = requestId();
  
  assert(middleware !== null);
  assert(typeof middleware === 'function');
});

Deno.test('Request ID Middleware - 生成请求 ID', async () => {
  const middleware = requestId();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    body: undefined as any,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  assert(nextCalled);
  const requestIdHeader = res.headers.get('X-Request-Id');
  assert(requestIdHeader !== null);
  assert(requestIdHeader!.length > 0);
  
  // 验证请求 ID 已附加到请求对象
  const reqId = (req as any).requestId;
  assert(reqId !== undefined);
  assertEquals(reqId, requestIdHeader);
});

Deno.test('Request ID Middleware - 使用请求头中的现有 ID', async () => {
  const middleware = requestId({
    useHeader: true,
  });
  
  const existingId = 'existing-request-id-123';
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'X-Request-Id': existingId,
    }),
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    body: undefined as any,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  assert(nextCalled);
  const requestIdHeader = res.headers.get('X-Request-Id');
  assertEquals(requestIdHeader, existingId);
  
  // 验证请求 ID 已附加到请求对象
  const reqId = (req as any).requestId;
  assertEquals(reqId, existingId);
});

Deno.test('Request ID Middleware - 自定义 ID 生成器', async () => {
  let generatorCalled = false;
  const middleware = requestId({
    generator: async () => {
      generatorCalled = true;
      return 'custom-id-123';
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
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    body: undefined as any,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  assert(nextCalled);
  assert(generatorCalled);
  const requestIdHeader = res.headers.get('X-Request-Id');
  assertEquals(requestIdHeader, 'custom-id-123');
});

Deno.test('Request ID Middleware - 跳过特定路径', async () => {
  const middleware = requestId({
    skip: ['/health', '/metrics'],
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
    body: undefined as any,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  assert(nextCalled);
  // 跳过的路径不应该设置请求 ID
  const requestIdHeader = res.headers.get('X-Request-Id');
  assertEquals(requestIdHeader, null);
});

Deno.test('Request ID Middleware - 自定义响应头名称', async () => {
  const middleware = requestId({
    headerName: 'X-Custom-Request-Id',
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    body: undefined as any,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  assert(nextCalled);
  const requestIdHeader = res.headers.get('X-Custom-Request-Id');
  assert(requestIdHeader !== null);
});

Deno.test('Request ID Middleware - 不暴露响应头', async () => {
  const middleware = requestId({
    exposeHeader: false,
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
    body: undefined as any,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  assert(nextCalled);
  // 请求 ID 仍然应该附加到请求对象
  const reqId = (req as any).requestId;
  assert(reqId !== undefined);
  // 但响应头中不应该有
  const requestIdHeader = res.headers.get('X-Request-Id');
  assertEquals(requestIdHeader, null);
});

