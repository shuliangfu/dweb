/**
 * Hybrid 渲染集成测试
 * 测试混合渲染功能（SSR + Hydration）
 */

import { assertEquals, assert } from '@std/assert';
import { Server } from '../../../src/core/server.ts';
import { Router } from '../../../src/core/router.ts';
import { RouteHandler } from '../../../src/core/route-handler.ts';
import * as path from '@std/path';
import { ensureDir, ensureFile, remove } from '@std/fs';

// 创建测试路由目录
const testRoutesDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'integration-rendering');
const testPagesDir = path.join(testRoutesDir, 'pages');
const testHybridPageFile = path.join(testPagesDir, 'hybrid.tsx');

// 辅助函数：创建 Hybrid 测试页面
async function createHybridPage() {
  await ensureDir(testPagesDir);
  await Deno.writeTextFile(testHybridPageFile, `
import { h } from 'preact';
import type { PageProps } from '../../../../src/types/index.ts';

// 明确指定 Hybrid 模式
export const renderMode = 'hybrid';

export default function HybridPage({ params, query }: PageProps) {
  return (
    <div>
      <h1>Hybrid Page</h1>
      <p>This is a hybrid rendered page (SSR + Hydration)</p>
    </div>
  );
}
`);
}

// 辅助函数：清理测试文件
async function cleanupTestFiles() {
  try {
    await remove(testRoutesDir, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      throw e;
    }
  }
}

Deno.test('Integration - Rendering - Hybrid 模式渲染', async () => {
  await cleanupTestFiles();
  await createHybridPage();

  const router = new Router(testPagesDir);
  await router.scan();
  const routeHandler = new RouteHandler(router);
  const server = new Server();

  server.setHandler(async (req, res) => {
    await routeHandler.handle(req, res);
  });

  // 测试 Hybrid 页面渲染
  const req = new Request('http://localhost:3000/pages/hybrid');
  const res = await server.handleRequest(req);

  assertEquals(res.status, 200);
  const html = await res.text();
  
  // Hybrid 模式应该包含服务端渲染的内容
  assert(html.includes('<h1>Hybrid Page</h1>') || html.includes('Hybrid Page'));
  
  // Hybrid 模式应该包含客户端脚本（用于 hydration）
  assert(html.includes('__INITIAL_PROPS__') || html.includes('hydrate(') || html.includes('import('));

  await cleanupTestFiles();
});

Deno.test('Integration - Rendering - Hybrid 模式包含 hydration 脚本', async () => {
  await cleanupTestFiles();
  await createHybridPage();

  const router = new Router(testPagesDir);
  await router.scan();
  const routeHandler = new RouteHandler(router);
  const server = new Server();

  server.setHandler(async (req, res) => {
    await routeHandler.handle(req, res);
  });

  // 测试 Hybrid 页面包含 hydration 脚本
  const req = new Request('http://localhost:3000/pages/hybrid');
  const res = await server.handleRequest(req);

  assertEquals(res.status, 200);
  const html = await res.text();
  
  // Hybrid 模式应该包含 script 标签
  assert(html.includes('<script') || html.includes('</script>'));
  
  // Hybrid 模式应该包含 hydration 相关的代码
  assert(html.includes('hydrate') || html.includes('__INITIAL_PROPS__'));

  await cleanupTestFiles();
});

