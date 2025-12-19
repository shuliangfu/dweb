/**
 * 配置管理模块单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { isMultiAppMode, normalizeRouteConfig, mergeConfig } from '../../../src/core/config.ts';
import type { DWebConfig, AppConfig } from '../../../src/types/index.ts';

Deno.test('Config - isMultiAppMode - 单应用模式', () => {
  const config: AppConfig = {
    server: { port: 3000 },
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
        server: { port: 3000 },
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
    server: { port: 3000 },
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
  const baseConfig: Partial<AppConfig> = {
    middleware: [{ name: 'base-middleware' }],
    plugins: [{ name: 'base-plugin' }],
  };
  
  const appConfig: AppConfig = {
    name: 'app1',
    server: { port: 3000 },
    routes: { dir: 'routes' },
    build: { outDir: 'dist' },
    middleware: [{ name: 'app-middleware' }],
    plugins: [{ name: 'app-plugin' }],
  };
  
  const merged = mergeConfig(baseConfig, appConfig);
  
  // 数组应该合并
  assertEquals(merged.middleware?.length, 2);
  assertEquals(merged.plugins?.length, 2);
  assertEquals(merged.middleware?.[0].name, 'base-middleware');
  assertEquals(merged.middleware?.[1].name, 'app-middleware');
});

Deno.test('Config - mergeConfig - 合并路由配置', () => {
  const baseConfig: Partial<AppConfig> = {
    routes: { dir: 'base-routes', cache: false },
  };
  
  const appConfig: AppConfig = {
    name: 'app1',
    server: { port: 3000 },
    routes: { dir: 'app-routes', cache: true },
    build: { outDir: 'dist' },
  };
  
  const merged = mergeConfig(baseConfig, appConfig);
  
  // 应用路由配置应该覆盖基础配置
  assertEquals(merged.routes.dir, 'app-routes');
  assertEquals(merged.routes.cache, true);
});

Deno.test('Config - mergeConfig - 应用配置必须包含 routes', () => {
  const baseConfig: Partial<AppConfig> = {};
  
  // 创建一个缺少 routes 的配置（使用类型断言绕过类型检查）
  const appConfig = {
    name: 'app1',
    server: { port: 3000 },
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

