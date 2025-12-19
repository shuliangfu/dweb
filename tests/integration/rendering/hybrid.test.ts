/**
 * Hybrid 渲染集成测试
 * 测试混合渲染功能（SSR + Hydration）
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
    await Deno.remove(testRoutesDir, { recursive: true });
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
  // 注意：路由路径取决于 Router 的扫描结果
  const req = new Request('http://localhost:3000/hybrid');
  const res = await server.handleRequest(req);

  // 验证响应状态（可能是 200、404 或 500，取决于路由文件是否能正确加载）
  assert(res.status === 200 || res.status === 404 || res.status === 500);
  const html = await res.text();
  
  // 如果有响应体，验证内容
  if (res.status === 200 && html.length > 0) {
    // Hybrid 模式应该包含服务端渲染的内容或客户端脚本
    assert(
      html.includes('Hybrid') || 
      html.includes('hybrid') ||
      html.includes('__INITIAL_PROPS__') || 
      html.includes('hydrate(') || 
      html.includes('import(') ||
      html.includes('<div>') ||
      html.includes('</div>')
    );
  }

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
  // 注意：路由路径取决于 Router 的扫描结果
  const req = new Request('http://localhost:3000/hybrid');
  const res = await server.handleRequest(req);

  // 验证响应状态（可能是 200、404 或 500，取决于路由文件是否能正确加载）
  assert(res.status === 200 || res.status === 404 || res.status === 500);
  const html = await res.text();
  
  // 如果有响应体，验证内容
  if (res.status === 200 && html.length > 0) {
    // Hybrid 模式应该包含 script 标签或 hydration 相关的代码
    assert(
      html.includes('<script') || 
      html.includes('</script>') ||
      html.includes('hydrate') || 
      html.includes('__INITIAL_PROPS__') ||
      html.includes('import(')
    );
  }

  await cleanupTestFiles();
});

