/**
 * 构建功能测试
 * 测试 build.ts 中的构建功能
 */

import { assertEquals, assert } from '@std/assert';
import { build } from '../../../src/features/build.ts';
import type { AppConfig } from '../../../src/types/index.ts';
import * as path from '@std/path';
import { ensureDir, ensureFile } from '@std/fs';

// 创建测试目录
const testDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'build-test');
const testRoutesDir = path.join(testDir, 'routes');
const testComponentsDir = path.join(testDir, 'components');
const testAssetsDir = path.join(testDir, 'assets');
const testOutDir = path.join(testDir, 'dist');

// 辅助函数：创建测试文件
async function createTestFiles() {
  await ensureDir(testRoutesDir);
  await ensureDir(testComponentsDir);
  await ensureDir(testAssetsDir);

  // 创建测试路由文件
  await ensureFile(path.join(testRoutesDir, 'index.tsx'));
  await Deno.writeTextFile(
    path.join(testRoutesDir, 'index.tsx'),
    `import { h } from 'preact';
export default function Index() {
  return <h1>Test Page</h1>;
}`
  );

  // 创建测试组件文件
  await ensureFile(path.join(testComponentsDir, 'Button.tsx'));
  await Deno.writeTextFile(
    path.join(testComponentsDir, 'Button.tsx'),
    `import { h } from 'preact';
export function Button() {
  return <button>Click</button>;
}`
  );

  // 创建测试静态资源文件
  await ensureFile(path.join(testAssetsDir, 'test.txt'));
  await Deno.writeTextFile(path.join(testAssetsDir, 'test.txt'), 'test content');
}

// 辅助函数：清理测试文件
async function cleanupTestFiles() {
  try {
    await Deno.remove(testDir, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      throw e;
    }
  }
}

Deno.test('Build - 构建配置验证', async () => {
  await cleanupTestFiles();
  await createTestFiles();

  const originalCwd = Deno.cwd();
  try {
    Deno.chdir(testDir);

    // 测试缺少 build 配置
    const configWithoutBuild: Partial<AppConfig> = {
      routes: { dir: 'routes' },
    };

    let errorThrown = false;
    try {
      await build(configWithoutBuild as AppConfig);
    } catch (error) {
      errorThrown = true;
      assert(error instanceof Error);
      assert(error.message.includes('构建配置') || error.message.includes('build'));
    }
    assert(errorThrown, '应该抛出缺少构建配置的错误');

    // 测试缺少 routes 配置
    const configWithoutRoutes: Partial<AppConfig> = {
      build: { outDir: 'dist' },
    };

    errorThrown = false;
    try {
      await build(configWithoutRoutes as AppConfig);
    } catch (error) {
      errorThrown = true;
      assert(error instanceof Error);
      assert(error.message.includes('路由配置') || error.message.includes('routes'));
    }
    assert(errorThrown, '应该抛出缺少路由配置的错误');
  } finally {
    Deno.chdir(originalCwd);
    await cleanupTestFiles();
  }
});

Deno.test({
  name: 'Build - 基本构建流程',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await cleanupTestFiles();
    await createTestFiles();

    const originalCwd = Deno.cwd();
    try {
      Deno.chdir(testDir);

      const config: AppConfig = {
        build: { outDir: 'dist' },
        routes: { dir: 'routes' },
        static: { dir: 'assets' },
      };

      // 执行构建
      await build(config);

      // 等待所有异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证输出目录已创建
      const outDirStat = await Deno.stat(path.join(testDir, 'dist'));
      assert(outDirStat.isDirectory, '输出目录应该已创建');

      // 验证路由映射文件已生成
      const serverRouteMapPath = path.join(testDir, 'dist', 'server.json');
      const clientRouteMapPath = path.join(testDir, 'dist', 'client.json');
      const serverRouteMapExists = await Deno.stat(serverRouteMapPath)
        .then(() => true)
        .catch(() => false);
      const clientRouteMapExists = await Deno.stat(clientRouteMapPath)
        .then(() => true)
        .catch(() => false);
      assert(serverRouteMapExists, '服务端路由映射文件应该已生成');
      assert(clientRouteMapExists, '客户端路由映射文件应该已生成');

      // 注意：.file-map.json 文件已不再生成（生产服务中未使用）
    } finally {
      Deno.chdir(originalCwd);
      await cleanupTestFiles();
    }
  },
});

Deno.test({
  name: 'Build - 静态资源复制',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await cleanupTestFiles();
    await createTestFiles();

    const originalCwd = Deno.cwd();
    try {
      Deno.chdir(testDir);

      const config: AppConfig = {
        build: { outDir: 'dist' },
        routes: { dir: 'routes' },
        static: { dir: 'assets' },
      };

      await build(config);

      // 等待所有异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证静态资源已复制到输出目录
      const staticOutPath = path.join(testDir, 'dist', 'assets', 'test.txt');
      const staticExists = await Deno.stat(staticOutPath)
        .then(() => true)
        .catch(() => false);
      assert(staticExists, '静态资源应该已复制到输出目录');

      // 验证静态资源内容正确
      if (staticExists) {
        const content = await Deno.readTextFile(staticOutPath);
        assertEquals(content, 'test content');
      }
    } finally {
      Deno.chdir(originalCwd);
      await cleanupTestFiles();
    }
  },
});

Deno.test({
  name: 'Build - 路由文件编译',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await cleanupTestFiles();
    await createTestFiles();

    const originalCwd = Deno.cwd();
    try {
      Deno.chdir(testDir);

      const config: AppConfig = {
        build: { outDir: 'dist' },
        routes: { dir: 'routes' },
        static: { dir: 'assets' },
      };

      await build(config);

      // 等待所有异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 注意：.file-map.json 文件已不再生成（生产服务中未使用）
      // 验证路由文件已编译（检查 server 和 client 目录中的文件）
      const serverRouteFile = path.join(testDir, 'dist', 'server', 'routes_index');
      const clientRouteFile = path.join(testDir, 'dist', 'client', 'routes_index');
      const serverFiles = [];
      const clientFiles = [];
      
      try {
        for await (const entry of Deno.readDir(path.join(testDir, 'dist', 'server'))) {
          if (entry.name.startsWith('routes_index')) {
            serverFiles.push(entry.name);
          }
        }
      } catch {
        // 目录不存在
      }
      
      try {
        for await (const entry of Deno.readDir(path.join(testDir, 'dist', 'client'))) {
          if (entry.name.startsWith('routes_index')) {
            clientFiles.push(entry.name);
          }
        }
      } catch {
        // 目录不存在
      }
      
      assert(serverFiles.length > 0, 'server 目录应该包含路由文件');
      assert(clientFiles.length > 0, 'client 目录应该包含路由文件');
    } finally {
      Deno.chdir(originalCwd);
      await cleanupTestFiles();
    }
  },
});

Deno.test({
  name: 'Build - 组件文件编译',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await cleanupTestFiles();
    await createTestFiles();

    const originalCwd = Deno.cwd();
    try {
      Deno.chdir(testDir);

      const config: AppConfig = {
        build: { outDir: 'dist' },
        routes: { dir: 'routes' },
        static: { dir: 'assets' },
      };

      await build(config);

      // 等待所有异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 注意：.file-map.json 文件已不再生成（生产服务中未使用）
      // 验证组件文件已编译（检查 server 和 client 目录中的文件）
      const serverComponentFiles = [];
      const clientComponentFiles = [];
      
      try {
        for await (const entry of Deno.readDir(path.join(testDir, 'dist', 'server'))) {
          if (entry.name.startsWith('components_Button')) {
            serverComponentFiles.push(entry.name);
          }
        }
      } catch {
        // 目录不存在
      }
      
      try {
        for await (const entry of Deno.readDir(path.join(testDir, 'dist', 'client'))) {
          if (entry.name.startsWith('components_Button')) {
            clientComponentFiles.push(entry.name);
          }
        }
      } catch {
        // 目录不存在
      }
      
      assert(serverComponentFiles.length > 0, 'server 目录应该包含组件文件');
      assert(clientComponentFiles.length > 0, 'client 目录应该包含组件文件');
    } finally {
      Deno.chdir(originalCwd);
      await cleanupTestFiles();
    }
  },
});

Deno.test({
  name: 'Build - 输出目录清空',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await cleanupTestFiles();
    await createTestFiles();

    const originalCwd = Deno.cwd();
    try {
      Deno.chdir(testDir);

      // 先创建一些旧文件
      const distDir = path.join(testDir, 'dist');
      await ensureDir(distDir);
      await ensureFile(path.join(distDir, 'old-file.txt'));
      await Deno.writeTextFile(path.join(distDir, 'old-file.txt'), 'old content');

      const config: AppConfig = {
        build: { outDir: 'dist' },
        routes: { dir: 'routes' },
        static: { dir: 'assets' },
      };

      // 执行构建（应该清空旧文件）
      await build(config);

      // 等待所有异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证旧文件已被删除
      const oldFileExists = await Deno.stat(path.join(distDir, 'old-file.txt'))
        .then(() => true)
        .catch(() => false);
      assert(!oldFileExists, '旧文件应该已被删除');
    } finally {
      Deno.chdir(originalCwd);
      await cleanupTestFiles();
    }
  },
});

Deno.test({
  name: 'Build - 缺少静态资源目录',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await cleanupTestFiles();
    await createTestFiles();

    const originalCwd = Deno.cwd();
    try {
      Deno.chdir(testDir);

      // 删除静态资源目录
      await Deno.remove(testAssetsDir, { recursive: true });

      const config: AppConfig = {
        build: { outDir: 'dist' },
        routes: { dir: 'routes' },
        static: { dir: 'assets' },
      };

      // 应该不会抛出错误（缺少静态资源目录时应该忽略）
      await build(config);

      // 等待所有异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证构建仍然成功
      const outDirStat = await Deno.stat(path.join(testDir, 'dist'))
        .then(() => true)
        .catch(() => false);
      assert(outDirStat, '构建应该成功完成');
    } finally {
      Deno.chdir(originalCwd);
      await cleanupTestFiles();
    }
  },
});

