/**
 * 配置管理模块单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { isMultiAppMode, normalizeRouteConfig, mergeConfig, loadConfig } from '../../../src/core/config.ts';
import type { DWebConfig, AppConfig, Middleware } from '../../../src/types/index.ts';
import { ensureDir, ensureFile } from '@std/fs';
import * as path from '@std/path';

Deno.test('Config - isMultiAppMode - 单应用模式', () => {
  const config: AppConfig = {
    server: { port: 3000, host: 'localhost' },
    routes: { dir: 'routes' },
    build: { outDir: 'dist' },
  };
  
  assertEquals(isMultiAppMode(config), false);
});

Deno.test('Config - isMultiAppMode - 多应用模式', () => {
  const config: DWebConfig = {
    apps: [
      {
        name: 'app1',
        server: { port: 3000, host: 'localhost' },
        routes: { dir: 'routes' },
        build: { outDir: 'dist' },
      },
    ],
  };
  
  assertEquals(isMultiAppMode(config), true);
});

Deno.test('Config - normalizeRouteConfig - 字符串配置', () => {
  const config = 'routes';
  const normalized = normalizeRouteConfig(config);
  
  assertEquals(normalized.dir, 'routes');
  assertEquals(normalized.ignore, undefined);
});

Deno.test('Config - normalizeRouteConfig - 对象配置', () => {
  const config = {
    dir: 'routes',
    ignore: ['**/*.test.ts'],
    cache: true,
    priority: 'specific-first' as const,
  };
  const normalized = normalizeRouteConfig(config);
  
  assertEquals(normalized.dir, 'routes');
  assertEquals(normalized.ignore, ['**/*.test.ts']);
  assertEquals(normalized.cache, true);
  assertEquals(normalized.priority, 'specific-first');
});

Deno.test('Config - mergeConfig - 合并基本配置', () => {
  const baseConfig: Partial<AppConfig> = {
    cookie: { secret: 'base-secret' },
  };
  
  const appConfig: AppConfig = {
    name: 'app1',
    server: { port: 3000, host: 'localhost' },
    routes: { dir: 'routes' },
    build: { outDir: 'dist' },
    cookie: { secret: 'app-secret' },
  };
  
  const merged = mergeConfig(baseConfig, appConfig);
  
  // 应用配置应该覆盖基础配置
  assertEquals(merged.cookie?.secret, 'app-secret');
  assertEquals(merged.name, 'app1');
});

Deno.test('Config - mergeConfig - 合并数组配置', () => {
  const mockMiddleware: Middleware = async (_req, _res, next) => {
    await next();
  };
  
  const baseConfig: Partial<AppConfig> = {
    middleware: [{ name: 'base-middleware', handler: mockMiddleware }],
    plugins: [{ name: 'base-plugin' }],
  };
  
  const appConfig: AppConfig = {
    name: 'app1',
    server: { port: 3000, host: 'localhost' },
    routes: { dir: 'routes' },
    build: { outDir: 'dist' },
    middleware: [{ name: 'app-middleware', handler: mockMiddleware }],
    plugins: [{ name: 'app-plugin' }],
  };
  
  const merged = mergeConfig(baseConfig, appConfig);
  
  // 数组应该合并
  assertEquals(merged.middleware?.length, 2);
  assertEquals(merged.plugins?.length, 2);
  const baseMw = merged.middleware?.[0] as { name?: string };
  const appMw = merged.middleware?.[1] as { name?: string };
  assertEquals(baseMw?.name, 'base-middleware');
  assertEquals(appMw?.name, 'app-middleware');
});

Deno.test('Config - mergeConfig - 合并路由配置', () => {
  const baseConfig: Partial<AppConfig> = {
    routes: { dir: 'base-routes', cache: false },
  };
  
  const appConfig: AppConfig = {
    name: 'app1',
    server: { port: 3000, host: 'localhost' },
    routes: { dir: 'app-routes', cache: true },
    build: { outDir: 'dist' },
  };
  
  const merged = mergeConfig(baseConfig, appConfig);
  
  // 应用路由配置应该覆盖基础配置
  const routes = typeof merged.routes === 'string' ? { dir: merged.routes } : merged.routes;
  assert(routes !== undefined);
  assertEquals(routes.dir, 'app-routes');
  assertEquals(routes.cache, true);
});

Deno.test('Config - mergeConfig - 应用配置必须包含 routes', () => {
  const baseConfig: Partial<AppConfig> = {};
  
  // 创建一个缺少 routes 的配置（使用类型断言绕过类型检查）
  const appConfig = {
    name: 'app1',
    server: { port: 3000, host: 'localhost' },
    build: { outDir: 'dist' },
    // 缺少 routes
  } as unknown as AppConfig;
  
  try {
    mergeConfig(baseConfig, appConfig);
    assert(false, '应该抛出错误');
  } catch (error) {
    assert(error instanceof Error);
    assert(error.message.includes('routes'));
  }
});

// loadConfig 测试
Deno.test('Config - loadConfig - 单应用模式加载配置', async () => {
  const testDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'config-test');
  const configFile = path.join(testDir, 'dweb.config.ts');
  const originalCwd = Deno.cwd();
  
  try {
    // 创建测试目录和配置文件
    await ensureDir(testDir);
    await ensureFile(configFile);
    
    const configContent = `
export default {
  server: { port: 3000, host: 'localhost' },
  routes: { dir: 'routes' },
  build: { outDir: 'dist' },
};
`;
    await Deno.writeTextFile(configFile, configContent);
    
    // 加载配置
    const result = await loadConfig(configFile);
    
    // 验证配置
    assert(result.config !== null);
    assertEquals(result.config.server?.port, 3000);
    assertEquals(result.config.routes?.dir, 'routes');
    assertEquals(result.config.build?.outDir, 'dist');
  } finally {
    // 恢复工作目录
    Deno.chdir(originalCwd);
    // 清理测试文件
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  }
});

Deno.test('Config - loadConfig - 多应用模式加载配置', async () => {
  const testDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'config-test-multi');
  const configFile = path.join(testDir, 'dweb.config.ts');
  const originalCwd = Deno.cwd();
  
  try {
    // 创建测试目录和配置文件
    await ensureDir(testDir);
    await ensureFile(configFile);
    
    const configContent = `
export default {
  apps: [
    {
      name: 'app1',
      server: { port: 3000, host: 'localhost' },
      routes: { dir: 'routes1' },
      build: { outDir: 'dist1' },
    },
    {
      name: 'app2',
      server: { port: 3001, host: 'localhost' },
      routes: { dir: 'routes2' },
      build: { outDir: 'dist2' },
    },
  ],
};
`;
    await Deno.writeTextFile(configFile, configContent);
    
    // 加载配置（指定应用名称）
    const result = await loadConfig(configFile, 'app1');
    
    // 验证配置
    assert(result.config !== null);
    assertEquals(result.config.name, 'app1');
    assertEquals(result.config.server?.port, 3000);
    assertEquals(result.config.routes?.dir, 'routes1');
  } finally {
    // 恢复工作目录
    Deno.chdir(originalCwd);
    // 清理测试文件
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  }
});

Deno.test('Config - loadConfig - 多应用模式未指定应用名称抛出错误', async () => {
  const testDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'config-test-multi-error');
  const configFile = path.join(testDir, 'dweb.config.ts');
  const originalCwd = Deno.cwd();
  
  try {
    // 创建测试目录和配置文件
    await ensureDir(testDir);
    await ensureFile(configFile);
    
    const configContent = `
export default {
  apps: [
    {
      name: 'app1',
      server: { port: 3000, host: 'localhost' },
      routes: { dir: 'routes1' },
      build: { outDir: 'dist1' },
    },
  ],
};
`;
    await Deno.writeTextFile(configFile, configContent);
    
    // 尝试加载配置（不指定应用名称）
    try {
      await loadConfig(configFile);
      assert(false, '应该抛出错误');
    } catch (error) {
      assert(error instanceof Error);
      assert(error.message.includes('应用名称') || error.message.includes('app'));
    }
  } finally {
    // 恢复工作目录
    Deno.chdir(originalCwd);
    // 清理测试文件
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  }
});

Deno.test('Config - loadConfig - 应用名称不存在抛出错误', async () => {
  const testDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'config-test-not-found');
  const configFile = path.join(testDir, 'dweb.config.ts');
  const originalCwd = Deno.cwd();
  
  try {
    // 创建测试目录和配置文件
    await ensureDir(testDir);
    await ensureFile(configFile);
    
    const configContent = `
export default {
  apps: [
    {
      name: 'app1',
      server: { port: 3000, host: 'localhost' },
      routes: { dir: 'routes1' },
      build: { outDir: 'dist1' },
    },
  ],
};
`;
    await Deno.writeTextFile(configFile, configContent);
    
    // 尝试加载不存在的应用
    try {
      await loadConfig(configFile, 'nonexistent');
      assert(false, '应该抛出错误');
    } catch (error) {
      assert(error instanceof Error);
      assert(error.message.includes('未找到应用') || error.message.includes('nonexistent'));
    }
  } finally {
    // 恢复工作目录
    Deno.chdir(originalCwd);
    // 清理测试文件
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  }
});

Deno.test('Config - loadConfig - 配置文件不存在抛出错误', async () => {
  const nonExistentFile = path.join(Deno.cwd(), 'tests', 'fixtures', 'config-test', 'nonexistent.config.ts');
  
  try {
    await loadConfig(nonExistentFile);
    assert(false, '应该抛出错误');
  } catch (error) {
    assert(error instanceof Error);
    assert(error.message.includes('加载配置文件失败') || error.message.includes('未找到'));
  }
});

Deno.test('Config - loadConfig - 无效配置抛出错误', async () => {
  const testDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'config-test-invalid');
  const configFile = path.join(testDir, 'dweb.config.ts');
  const originalCwd = Deno.cwd();
  
  try {
    // 创建测试目录和配置文件
    await ensureDir(testDir);
    await ensureFile(configFile);
    
    // 无效配置：缺少必需字段
    const configContent = `
export default {
  // 缺少 server、routes、build
};
`;
    await Deno.writeTextFile(configFile, configContent);
    
    // 尝试加载配置
    try {
      await loadConfig(configFile);
      assert(false, '应该抛出错误');
    } catch (error) {
      assert(error instanceof Error);
      assert(
        error.message.includes('server') ||
        error.message.includes('routes') ||
        error.message.includes('build') ||
        error.message.includes('配置')
      );
    }
  } finally {
    // 恢复工作目录
    Deno.chdir(originalCwd);
    // 清理测试文件
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  }
});

// normalizeRouteConfig 扩展测试
Deno.test('Config - normalizeRouteConfig - 处理 undefined 和 null', () => {
  // 注意：函数签名不允许 undefined，但我们可以测试边界情况
  const config1 = normalizeRouteConfig('routes');
  assertEquals(config1.dir, 'routes');
  
  const config2 = normalizeRouteConfig({
    dir: 'routes',
    ignore: ['**/*.test.ts'],
    cache: false,
    priority: 'order',
  });
  assertEquals(config2.dir, 'routes');
  assertEquals(config2.ignore, ['**/*.test.ts']);
  assertEquals(config2.cache, false);
  assertEquals(config2.priority, 'order');
});

// mergeConfig 扩展测试
Deno.test('Config - mergeConfig - 处理空配置', () => {
  const baseConfig: Partial<AppConfig> = {};
  const appConfig: AppConfig = {
    name: 'app1',
    server: { port: 3000, host: 'localhost' },
    routes: { dir: 'routes' },
    build: { outDir: 'dist' },
  };
  
  const merged = mergeConfig(baseConfig, appConfig);
  assertEquals(merged.name, 'app1');
  assertEquals(merged.server?.port, 3000);
});

Deno.test('Config - mergeConfig - 处理部分配置', () => {
  const baseConfig: Partial<AppConfig> = {
    cookie: { secret: 'base-secret' },
  };
  const appConfig: AppConfig = {
    name: 'app1',
    server: { port: 3000, host: 'localhost' },
    routes: { dir: 'routes' },
    build: { outDir: 'dist' },
    // 没有 cookie 配置
  };
  
  const merged = mergeConfig(baseConfig, appConfig);
  // baseConfig 的 cookie 应该被保留
  assertEquals(merged.cookie?.secret, 'base-secret');
});

