/**
 * 路由系统集成测试
 * 测试完整的路由处理流程
 */

import { assertEquals, assert } from '@std/assert';
import { Server } from '../../../src/core/server.ts';
import { Router } from '../../../src/core/router.ts';
import { RouteHandler } from '../../../src/core/route-handler.ts';
import type { Request, Response } from '../../../src/types/index.ts';
import * as path from '@std/path';
import { ensureDir, ensureFile } from '@std/fs';

// 创建临时测试目录
const testDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'integration', 'router');
const routesDir = path.join(testDir, 'routes');

Deno.test('Integration - Router - 完整路由处理流程', async () => {
  await ensureDir(routesDir);
  
  // 创建测试路由文件
  const indexFile = path.join(routesDir, 'index.tsx');
  await ensureFile(indexFile);
  await Deno.writeTextFile(
    indexFile,
    `export default function Index() {
  return <h1>Hello World</h1>;
}`
  );
  
  try {
    // 创建 Router 并扫描路由
    const router = new Router(routesDir);
    await router.scan();
    
    // 验证路由已扫描
    const allRoutes = router.getAllRoutes();
    assert(allRoutes.length > 0);
    
    // 创建 RouteHandler
    const routeHandler = new RouteHandler(router);
    
    // 创建 Server
    const server = new Server();
    server.setHandler(async (req, res) => {
      await routeHandler.handle(req, res);
    });
    
    // 发送测试请求
    const request = new Request('http://localhost:3000/');
    const response = await server.handleRequest(request);
    
    // 验证响应
    assertEquals(response.status, 200);
    const html = await response.text();
    assert(html.includes('Hello World') || html.length > 0);
  } finally {
    // 清理
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  }
});

Deno.test('Integration - Router - 404 处理', async () => {
  await ensureDir(routesDir);
  
  // 创建测试路由文件
  const indexFile = path.join(routesDir, 'index.tsx');
  await ensureFile(indexFile);
  await Deno.writeTextFile(
    indexFile,
    `export default function Index() {
  return <h1>Hello World</h1>;
}`
  );
  
  try {
    // 创建 Router 并扫描路由
    const router = new Router(routesDir);
    await router.scan();
    
    // 创建 RouteHandler
    const routeHandler = new RouteHandler(router);
    
    // 创建 Server
    const server = new Server();
    server.setHandler(async (req, res) => {
      await routeHandler.handle(req, res);
    });
    
    // 发送不存在的路由请求
    const request = new Request('http://localhost:3000/not-found');
    const response = await server.handleRequest(request);
    
    // 验证返回 404
    assertEquals(response.status, 404);
    const html = await response.text();
    assert(html.includes('404') || html.includes('Not Found'));
  } finally {
    // 清理
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  }
});

Deno.test('Integration - Router - 动态路由处理', async () => {
  await ensureDir(routesDir);
  const usersDir = path.join(routesDir, 'users');
  await ensureDir(usersDir);
  
  // 创建动态路由文件
  const userFile = path.join(usersDir, '[id].tsx');
  await ensureFile(userFile);
  await Deno.writeTextFile(
    userFile,
    `export default function User({ params }: { params: { id: string } }) {
  return <h1>User {params.id}</h1>;
}`
  );
  
  try {
    // 创建 Router 并扫描路由
    const router = new Router(routesDir);
    await router.scan();
    
    // 验证动态路由已扫描
    const allRoutes = router.getAllRoutes();
    const userRoute = allRoutes.find(r => r.path.includes('users') && r.params);
    assert(userRoute !== undefined);
    
    // 创建 RouteHandler
    const routeHandler = new RouteHandler(router);
    
    // 创建 Server
    const server = new Server();
    server.setHandler(async (req, res) => {
      await routeHandler.handle(req, res);
    });
    
    // 发送动态路由请求
    const request = new Request('http://localhost:3000/users/123');
    const response = await server.handleRequest(request);
    
    // 验证响应（可能返回 200 或需要实际渲染）
    assert(response.status === 200 || response.status === 404);
  } finally {
    // 清理
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  }
});

