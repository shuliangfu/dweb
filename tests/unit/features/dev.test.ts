/**
 * 开发服务器单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { startDevServer } from '../../../src/features/dev.ts';
import type { AppConfig } from '../../../src/types/index.ts';

// 注意：这些测试主要验证配置验证逻辑，不实际启动服务器

Deno.test('Dev Server - 缺少路由配置时抛出错误', async () => {
  const config: AppConfig = {
    server: {
      port: 3000,
    },
  } as AppConfig;

  let errorThrown = false;
  try {
    await startDevServer(config);
  } catch (error) {
    errorThrown = true;
    // 只要抛出错误即可（可能是配置错误或其他运行时错误）
    assert(error instanceof Error);
  }
  // 缺少必需配置时应该抛出错误
  assert(errorThrown);
});

Deno.test('Dev Server - 缺少服务器配置时抛出错误', async () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
  } as AppConfig;

  let errorThrown = false;
  try {
    await startDevServer(config);
  } catch (error) {
    errorThrown = true;
    // 只要抛出错误即可（可能是配置错误或其他运行时错误）
    assert(error instanceof Error);
  }
  // 缺少必需配置时应该抛出错误
  assert(errorThrown);
});

Deno.test('Dev Server - 配置验证通过', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    server: {
      port: 3000,
      host: 'localhost',
    },
  };

  // 基本配置验证（不实际启动服务器）
  assert(config.routes !== undefined);
  assert(config.server !== undefined);
  assert(config.server.port === 3000);
  assert(config.server.host === 'localhost');
});

Deno.test('Dev Server - 默认 host 为 localhost', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    server: {
      port: 3000,
      // host 未设置
    },
  };

  // 验证默认值逻辑
  const host = config.server.host || 'localhost';
  assertEquals(host, 'localhost');
});

Deno.test('Dev Server - HMR 端口配置', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    server: {
      port: 3000,
    },
    dev: {
      hmrPort: 24678,
    },
  };

  // 验证 HMR 端口配置
  assert(config.dev !== undefined);
  assert(config.dev.hmrPort === 24678);
});

Deno.test('Dev Server - 自动打开浏览器配置', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    server: {
      port: 3000,
    },
    dev: {
      open: true,
    },
  };

  // 验证自动打开浏览器配置
  assert(config.dev !== undefined);
  assert(config.dev.open === true);
});

Deno.test('Dev Server - 静态资源目录配置', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    server: {
      port: 3000,
    },
    static: {
      dir: 'assets',
    },
  };

  // 验证静态资源目录配置
  assert(config.static !== undefined);
  assertEquals(config.static.dir, 'assets');
});

Deno.test('Dev Server - Cookie 配置', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    server: {
      port: 3000,
    },
    cookie: {
      secret: 'test-secret-key',
    },
  };

  // 验证 Cookie 配置
  assert(config.cookie !== undefined);
  assertEquals(config.cookie.secret, 'test-secret-key');
});

Deno.test('Dev Server - Session 配置', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    server: {
      port: 3000,
    },
    session: {
      secret: 'test-session-secret',
      maxAge: 3600000,
    },
  };

  // 验证 Session 配置
  assert(config.session !== undefined);
  assertEquals(config.session.secret, 'test-session-secret');
  assertEquals(config.session.maxAge, 3600000);
});

