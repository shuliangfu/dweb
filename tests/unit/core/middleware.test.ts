/**
 * 中间件系统测试
 */

import { assertEquals, assert } from '@std/assert';
import { MiddlewareManager } from '../../../src/core/middleware.ts';
import type { Middleware, Request, Response } from '../../../src/types/index.ts';

Deno.test('MiddlewareManager - 添加函数中间件', () => {
  const manager = new MiddlewareManager();
  const middleware: Middleware = async (_req, _res, next) => {
    await next();
  };
  
  manager.add(middleware);
  const middlewares = manager.getAll();
  
  assertEquals(middlewares.length, 1);
  assertEquals(middlewares[0], middleware);
});

Deno.test('MiddlewareManager - 添加配置对象中间件', () => {
  const manager = new MiddlewareManager();
  const middleware: Middleware = async (_req, _res, next) => {
    await next();
  };
  
  manager.add({ handler: middleware });
  const middlewares = manager.getAll();
  
  assertEquals(middlewares.length, 1);
  assertEquals(middlewares[0], middleware);
});

Deno.test('MiddlewareManager - 批量添加中间件', () => {
  const manager = new MiddlewareManager();
  const middleware1: Middleware = async (_req, _res, next) => {
    await next();
  };
  const middleware2: Middleware = async (_req, _res, next) => {
    await next();
  };
  
  manager.addMany([middleware1, middleware2]);
  const middlewares = manager.getAll();
  
  assertEquals(middlewares.length, 2);
  assertEquals(middlewares[0], middleware1);
  assertEquals(middlewares[1], middleware2);
});

Deno.test('MiddlewareManager - 清空中间件', () => {
  const manager = new MiddlewareManager();
  const middleware: Middleware = async (_req, _res, next) => {
    await next();
  };
  
  manager.add(middleware);
  assertEquals(manager.getAll().length, 1);
  
  manager.clear();
  assertEquals(manager.getAll().length, 0);
});

Deno.test('MiddlewareManager - 中间件链式调用', async () => {
  const manager = new MiddlewareManager();
  const callOrder: number[] = [];
  
  const middleware1: Middleware = async (_req, _res, next) => {
    callOrder.push(1);
    await next();
    callOrder.push(4);
  };
  
  const middleware2: Middleware = async (_req, _res, next) => {
    callOrder.push(2);
    await next();
    callOrder.push(3);
  };
  
  manager.add(middleware1);
  manager.add(middleware2);
  
  // 模拟中间件执行
  const middlewares = manager.getAll();
  let index = 0;
  const next = async () => {
    if (index < middlewares.length) {
      const middleware = middlewares[index++];
      await middleware({} as Request, {} as Response, next);
    }
  };
  
  await next();
  
  // 验证调用顺序：1 -> 2 -> 3 -> 4
  assertEquals(callOrder, [1, 2, 3, 4]);
});

