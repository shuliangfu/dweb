/**
 * 中间件链集成测试
 * 测试多个中间件协同工作
 */

import { assertEquals, assert } from '@std/assert';
import { Server } from '../../../src/core/server.ts';
import { cors } from '../../../src/middleware/cors.ts';
import { compression } from '../../../src/middleware/compression.ts';
import { logger } from '../../../src/middleware/logger.ts';
import type { Middleware } from '../../../src/types/index.ts';

Deno.test('Integration - Middleware - 中间件链式调用', async () => {
  const server = new Server();
  
  // 添加多个中间件
  server.use(cors());
  server.use(compression());
  server.use(logger());
  
  // 设置处理器
  server.setHandler(async (_req, res) => {
    res.json({ message: 'Hello World' });
  });
  
  // 发送请求
  const request = new Request('http://localhost:3000/test', {
    headers: {
      'Origin': 'http://example.com',
      'Accept-Encoding': 'gzip',
    },
  });
  
  const response = await server.handleRequest(request);
  
  // 验证响应
  assertEquals(response.status, 200);
  
  // 验证 CORS 头
  const corsHeader = response.headers.get('Access-Control-Allow-Origin');
  assert(corsHeader !== null);
  
  // 验证响应体
  const json = await response.json();
  assertEquals(json.message, 'Hello World');
});

Deno.test('Integration - Middleware - 中间件执行顺序', async () => {
  const server = new Server();
  const callOrder: string[] = [];
  
  // 创建自定义中间件来跟踪执行顺序
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
  
  const middleware3: Middleware = async (_req, _res, next) => {
    callOrder.push('middleware3-before');
    await next();
    callOrder.push('middleware3-after');
  };
  
  // 添加中间件
  server.use(middleware1);
  server.use(middleware2);
  server.use(middleware3);
  
  // 设置处理器
  server.setHandler(async (_req, res) => {
    callOrder.push('handler');
    res.text('OK');
  });
  
  // 发送请求
  const request = new Request('http://localhost:3000/test');
  await server.handleRequest(request);
  
  // 验证执行顺序
  assertEquals(callOrder[0], 'middleware1-before');
  assertEquals(callOrder[1], 'middleware2-before');
  assertEquals(callOrder[2], 'middleware3-before');
  assertEquals(callOrder[3], 'handler');
  assertEquals(callOrder[4], 'middleware3-after');
  assertEquals(callOrder[5], 'middleware2-after');
  assertEquals(callOrder[6], 'middleware1-after');
});

Deno.test('Integration - Middleware - 中间件修改请求和响应', async () => {
  const server = new Server();
  
  // 创建修改请求的中间件
  const modifyRequest: Middleware = async (req, _res, next) => {
    // 添加自定义属性到请求
    (req as any).customData = 'modified';
    await next();
  };
  
  // 创建修改响应的中间件
  const modifyResponse: Middleware = async (_req, res, next) => {
    await next();
    // 修改响应头
    res.setHeader('X-Custom-Header', 'test-value');
  };
  
  server.use(modifyRequest);
  server.use(modifyResponse);
  
  // 设置处理器
  server.setHandler(async (req, res) => {
    const customData = (req as any).customData;
    res.json({ data: customData });
  });
  
  // 发送请求
  const request = new Request('http://localhost:3000/test');
  const response = await server.handleRequest(request);
  
  // 验证响应
  assertEquals(response.status, 200);
  assertEquals(response.headers.get('X-Custom-Header'), 'test-value');
  
  const json = await response.json();
  assertEquals(json.data, 'modified');
});

