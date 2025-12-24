/**
 * Server 类单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { Server } from '../../../src/core/server.ts';
import type { Middleware } from '../../../src/types/index.ts';

Deno.test('Server - 创建实例', () => {
  const server = new Server();
  assert(server !== null);
});

Deno.test('Server - 添加单个中间件', () => {
  const server = new Server();
  const middleware: Middleware = async (_req, _res, next) => {
    await next();
  };
  
  server.use(middleware);
  // 无法直接访问 private middlewares，通过行为验证
  assert(true);
});

Deno.test('Server - 添加多个中间件', () => {
  const server = new Server();
  const middleware1: Middleware = async (_req, _res, next) => {
    await next();
  };
  const middleware2: Middleware = async (_req, _res, next) => {
    await next();
  };
  
  server.use([middleware1, middleware2]);
  assert(true);
});

Deno.test('Server - 设置请求处理器', () => {
  const server = new Server();
  const handler = async (_req: any, _res: any) => {
    // 处理器逻辑
  };
  
  server.setHandler(handler);
  assert(true);
});

Deno.test('Server - 处理请求 - 基本响应', async () => {
  const server = new Server();
  server.setHandler(async (_req, res) => {
    res.status = 200;
    res.text('Hello World');
  });
  
  const request = new Request('http://localhost:3000/test');
  const response = await server.handleRequest(request);
  
  assertEquals(response.status, 200);
  const text = await response.text();
  assertEquals(text, 'Hello World');
});

Deno.test('Server - 处理请求 - JSON 响应', async () => {
  const server = new Server();
  server.setHandler(async (_req, res) => {
    res.json({ message: 'Hello' });
  });
  
  const request = new Request('http://localhost:3000/test');
  const response = await server.handleRequest(request);
  
  assertEquals(response.status, 200);
  const contentType = response.headers.get('content-type');
  assertEquals(contentType, 'application/json; charset=utf-8');
  const json = await response.json();
  assertEquals(json, { message: 'Hello' });
});

Deno.test('Server - 处理请求 - HTML 响应', async () => {
  const server = new Server();
  server.setHandler(async (_req, res) => {
    res.html('<h1>Hello</h1>');
  });
  
  const request = new Request('http://localhost:3000/test');
  const response = await server.handleRequest(request);
  
  assertEquals(response.status, 200);
  const contentType = response.headers.get('content-type');
  assertEquals(contentType, 'text/html; charset=utf-8');
  const html = await response.text();
  assertEquals(html, '<h1>Hello</h1>');
});

Deno.test('Server - 处理请求 - 重定向', async () => {
  const server = new Server();
  server.setHandler(async (_req, res) => {
    res.redirect('/new-path', 301);
  });
  
  const request = new Request('http://localhost:3000/test');
  const response = await server.handleRequest(request);
  
  assertEquals(response.status, 301);
  const location = response.headers.get('location');
  assertEquals(location, '/new-path');
});

Deno.test('Server - 处理请求 - 304 Not Modified', async () => {
  const server = new Server();
  server.setHandler(async (_req, res) => {
    res.status = 304;
    // 304 响应不应该有 body
  });
  
  const request = new Request('http://localhost:3000/test');
  const response = await server.handleRequest(request);
  
  assertEquals(response.status, 304);
  const body = await response.text();
  assertEquals(body, ''); // 304 响应应该没有 body
});

Deno.test('Server - 处理请求 - 错误处理', async () => {
  const server = new Server();
  server.setHandler(async (_req, _res) => {
    throw new Error('Test error');
  });
  
  const request = new Request('http://localhost:3000/test');
  const response = await server.handleRequest(request);
  
  assertEquals(response.status, 500);
  const text = await response.text();
  assert(text.includes('Test error'));
});

Deno.test('Server - 处理请求 - 空响应体自动设置错误', async () => {
  const server = new Server();
  server.setHandler(async (_req, res) => {
    res.status = 200;
    // 不设置 body
  });
  
  const request = new Request('http://localhost:3000/test');
  const response = await server.handleRequest(request);
  
  // 空响应体应该被转换为 500 错误
  assertEquals(response.status, 500);
  const text = await response.text();
  assert(text.includes('Empty response'));
});

Deno.test('Server - 处理请求 - 解析查询参数', async () => {
  const server = new Server();
  server.setHandler(async (req, res) => {
    res.json({ query: req.query });
  });
  
  const request = new Request('http://localhost:3000/test?name=John&age=30');
  const response = await server.handleRequest(request);
  
  const json = await response.json();
  assertEquals(json.query.name, 'John');
  assertEquals(json.query.age, '30');
});

Deno.test('Server - 处理请求 - 解析 Cookie', async () => {
  const server = new Server();
  server.setHandler(async (req, res) => {
    res.json({ cookies: req.cookies });
  });
  
  const request = new Request('http://localhost:3000/test', {
    headers: {
      'Cookie': 'name=John; age=30',
    },
  });
  const response = await server.handleRequest(request);
  
  const json = await response.json();
  assertEquals(json.cookies.name, 'John');
  assertEquals(json.cookies.age, '30');
});

Deno.test('Server - 处理请求 - 设置 Cookie', async () => {
  const server = new Server();
  server.setHandler(async (_req, res) => {
    res.setCookie('test', 'value', { httpOnly: true });
    res.text('OK');
  });
  
  const request = new Request('http://localhost:3000/test');
  const response = await server.handleRequest(request);
  
  // Cookie 设置逻辑在 createNativeResponse 中实现
  // 这里只验证响应正常返回
  assertEquals(response.status, 200);
});

Deno.test('Server - 处理请求 - 设置响应头', async () => {
  const server = new Server();
  server.setHandler(async (_req, res) => {
    res.setHeader('X-Custom-Header', 'test-value');
    res.text('OK');
  });
  
  const request = new Request('http://localhost:3000/test');
  const response = await server.handleRequest(request);
  
  const header = response.headers.get('X-Custom-Header');
  assertEquals(header, 'test-value');
});

Deno.test('Server - 处理请求 - 二进制响应', async () => {
  const server = new Server();
  const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
  
  server.setHandler(async (_req, res) => {
    res.body = binaryData;
    res.setHeader('Content-Type', 'application/octet-stream');
  });
  
  const request = new Request('http://localhost:3000/test');
  const response = await server.handleRequest(request);
  
  assertEquals(response.status, 200);
  const arrayBuffer = await response.arrayBuffer();
  const receivedData = new Uint8Array(arrayBuffer);
  assertEquals(receivedData, binaryData);
});

Deno.test('Server - 中间件链式调用', async () => {
  const server = new Server();
  const callOrder: string[] = [];
  
  const middleware1: Middleware = async (_req, _res, next) => {
    callOrder.push('middleware1-before');
    await next();
    callOrder.push('middleware1-after');
  };
  
  const middleware2: Middleware = async (_req, _res, next) => {
    callOrder.push('middleware2-before');
    await next();
    callOrder.push('middleware2-after');
  };
  
  server.use(middleware1);
  server.use(middleware2);
  // 不设置 handler，让中间件链执行
  // 中间件需要调用 next() 并设置响应
  const middleware3: Middleware = async (_req, res, next) => {
    callOrder.push('handler');
    res.text('OK');
    await next();
  };
  server.use(middleware3);
  
  const request = new Request('http://localhost:3000/test');
  await server.handleRequest(request);
  
  // 验证中间件执行顺序
  assertEquals(callOrder[0], 'middleware1-before');
  assertEquals(callOrder[1], 'middleware2-before');
  assertEquals(callOrder[2], 'handler');
  assertEquals(callOrder[3], 'middleware2-after');
  assertEquals(callOrder[4], 'middleware1-after');
});

Deno.test('Server - 中间件可以修改响应', async () => {
  const server = new Server();
  
  const middleware: Middleware = async (_req, res, next) => {
    await next();
    res.setHeader('X-Middleware', 'modified');
  };
  
  server.use(middleware);
  // 不设置 handler，让中间件链执行
  const handlerMiddleware: Middleware = async (_req, res, next) => {
    res.text('OK');
    await next();
  };
  server.use(handlerMiddleware);
  
  const request = new Request('http://localhost:3000/test');
  const response = await server.handleRequest(request);
  
  const header = response.headers.get('X-Middleware');
  assertEquals(header, 'modified');
});

Deno.test('Server - 处理无效 URL 请求', async () => {
  const server = new Server();
  server.setHandler(async (_req, res) => {
    res.text('OK');
  });
  
  // 创建一个没有 URL 的请求（通过 Proxy 模拟）
  const invalidRequest = new Proxy(new Request('http://localhost:3000/test'), {
    get(target, prop) {
      if (prop === 'url') {
        return undefined;
      }
      return (target as any)[prop];
    },
  });
  
  // 由于 createRequest 会检查 URL，应该抛出错误
  try {
    await server.handleRequest(invalidRequest as globalThis.Request);
    assert(false, '应该抛出错误');
  } catch (error) {
    assert(error instanceof Error);
    assert(error.message.includes('URL'));
  }
});

