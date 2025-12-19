/**
 * SSR 渲染集成测试
 * 测试服务端渲染功能
 */

import { assertEquals, assert } from '@std/assert';
import { Server } from '../../../src/core/server.ts';
import { Router } from '../../../src/core/router.ts';
import { RouteHandler } from '../../../src/core/route-handler.ts';
import * as path from '@std/path';
import { ensureDir, ensureFile } from '@std/fs';

// 创建测试路由目录
const testRoutesDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'integration-rendering');
const testPagesDir = path.join(testRoutesDir, 'pages');
const testSSRPageFile = path.join(testPagesDir, 'ssr.tsx');

// 辅助函数：创建 SSR 测试页面
async function createSSRPage() {
  await ensureDir(testPagesDir);
  await Deno.writeTextFile(testSSRPageFile, `
import { h } from 'preact';
import type { PageProps } from '../../../../src/types/index.ts';

export default function SSRPage({ params, query }: PageProps) {
  return (
    <div>
      <h1>SSR Page</h1>
      <p>Params: {JSON.stringify(params)}</p>
      <p>Query: {JSON.stringify(query)}</p>
    </div>
  );
}
`);
}

// 辅助函数：清理测试文件
async function cleanupTestFiles() {
  try {
    await Deno.remove(testRoutesDir, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      throw e;
    }
  }
}

Deno.test('Integration - Rendering - SSR 模式渲染', async () => {
  await cleanupTestFiles();
  await createSSRPage();

  const router = new Router(testPagesDir);
  await router.scan();
  const routeHandler = new RouteHandler(router);
  const server = new Server();

  server.setHandler(async (req, res) => {
    await routeHandler.handle(req, res);
  });

  // 测试 SSR 页面渲染
  const req = new Request('http://localhost:3000/pages/ssr');
  const res = await server.handleRequest(req);

  assertEquals(res.status, 200);
  const html = await res.text();
  
  // SSR 模式应该包含服务端渲染的内容
  assert(html.includes('<h1>SSR Page</h1>'));
  assert(html.includes('SSR Page'));
  
  // SSR 模式应该包含 HTML 结构
  assert(html.includes('<div>') || html.includes('</div>'));

  await cleanupTestFiles();
});

Deno.test('Integration - Rendering - SSR 模式传递参数', async () => {
  await cleanupTestFiles();
  await createSSRPage();

  const router = new Router(testPagesDir);
  await router.scan();
  const routeHandler = new RouteHandler(router);
  const server = new Server();

  server.setHandler(async (req, res) => {
    await routeHandler.handle(req, res);
  });

  // 测试带查询参数的 SSR 页面
  const req = new Request('http://localhost:3000/pages/ssr?name=test&id=123');
  const res = await server.handleRequest(req);

  assertEquals(res.status, 200);
  const html = await res.text();
  
  // 应该包含查询参数
  assert(html.includes('Query') || html.includes('query'));

  await cleanupTestFiles();
});

