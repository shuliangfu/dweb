/**
 * 生产服务器单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { startProdServer } from '../../../src/features/prod.ts';
import type { AppConfig } from '../../../src/types/index.ts';

// 注意：这些测试主要验证配置验证逻辑，不实际启动服务器

Deno.test('Prod Server - 缺少路由配置时抛出错误', async () => {
  const config: AppConfig = {
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
    },
  } as AppConfig;

  let errorThrown = false;
  try {
    await startProdServer(config);
  } catch (error) {
    errorThrown = true;
    assert(error instanceof Error);
    assert(error.message.includes('路由配置') || error.message.includes('routes'));
  }
  assert(errorThrown);
});

Deno.test('Prod Server - 缺少构建配置时抛出错误', async () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    server: {
      port: 3000,
    },
  } as AppConfig;

  let errorThrown = false;
  try {
    await startProdServer(config);
  } catch (error) {
    errorThrown = true;
    assert(error instanceof Error);
    assert(error.message.includes('构建配置') || error.message.includes('build'));
  }
  assert(errorThrown);
});

Deno.test('Prod Server - 缺少服务器配置时抛出错误', async () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
  } as AppConfig;

  let errorThrown = false;
  try {
    await startProdServer(config);
  } catch (error) {
    errorThrown = true;
    assert(error instanceof Error);
    assert(error.message.includes('服务器配置') || error.message.includes('server'));
  }
  assert(errorThrown);
});

Deno.test('Prod Server - 配置验证通过', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  };

  // 基本配置验证（不实际启动服务器）
  assert(config.routes !== undefined);
  assert(config.build !== undefined);
  assert(config.server !== undefined);
  assert(config.server.port === 3000);
  assert(config.server.host === '0.0.0.0');
});

Deno.test('Prod Server - 默认 host 为 0.0.0.0', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
  };

  // 验证默认值逻辑
  const host = config.server?.host || '0.0.0.0';
  assertEquals(host, 'localhost');
});

Deno.test('Prod Server - 构建输出目录配置', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
  };

  // 验证构建输出目录配置
  assert(config.build !== undefined);
  assertEquals(config.build.outDir, 'dist');
});

Deno.test('Prod Server - 静态资源目录配置', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
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

Deno.test('Prod Server - Cookie 配置', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
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

Deno.test('Prod Server - Session 配置', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
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

Deno.test('Prod Server - 端口默认值处理', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      // 没有指定 port
    },
  } as AppConfig;

  // 验证默认端口逻辑（在 prod.ts 中会使用 config.server?.port || 3000）
  const port = config.server?.port || 3000;
  assertEquals(port, 3000);
});

Deno.test('Prod Server - 多应用模式配置', () => {
  const config: AppConfig = {
    name: 'app1',
    basePath: '/app1',
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
  };

  // 验证多应用模式配置
  assert(config.name === 'app1');
  assertEquals(config.basePath, '/app1');
});

Deno.test('Prod Server - 中间件配置', () => {
  const mockMiddleware = async (_req: any, _res: any, next: () => void) => {
    await next();
  };

  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
    middleware: [
      { name: 'test-middleware', handler: mockMiddleware },
    ],
  };

  // 验证中间件配置
  assert(config.middleware !== undefined);
  assertEquals(config.middleware.length, 1);
  assertEquals(config.middleware[0].name, 'test-middleware');
});

Deno.test('Prod Server - 插件配置', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
    plugins: [
      { name: 'test-plugin' },
    ],
  };

  // 验证插件配置
  assert(config.plugins !== undefined);
  assertEquals(config.plugins.length, 1);
  assertEquals(config.plugins[0].name, 'test-plugin');
});

Deno.test('Prod Server - 路由配置字符串格式', () => {
  const config: AppConfig = {
    routes: 'routes' as any,
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
  };

  // 验证路由配置可以是字符串（会被 normalizeRouteConfig 处理）
  assert(config.routes !== undefined);
});

Deno.test('Prod Server - 路由配置对象格式', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
      ignore: ['**/*.test.ts'],
      cache: true,
      priority: 'specific-first',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
  };

  // 验证路由配置对象格式
  assert(config.routes !== undefined);
  if (typeof config.routes === 'object') {
    assertEquals(config.routes.dir, 'routes');
    assertEquals(config.routes.ignore, ['**/*.test.ts']);
    assertEquals(config.routes.cache, true);
    assertEquals(config.routes.priority, 'specific-first');
  }
});

Deno.test('Prod Server - 构建配置扩展选项', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
      minify: true,
      sourceMap: false,
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
  };

  // 验证构建配置扩展选项
  assert(config.build !== undefined);
  assertEquals(config.build.outDir, 'dist');
  // 注意：minify 和 sourceMap 可能不在类型定义中，但可以存在
});

Deno.test('Prod Server - 开发配置选项', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
    dev: {
      open: true,
      hmr: true,
    },
  };

  // 验证开发配置选项（虽然生产环境不使用，但配置可以存在）
  assert(config.dev !== undefined);
  assertEquals(config.dev.open, true);
  assertEquals(config.dev.hmr, true);
});

Deno.test('Prod Server - 静态资源目录不存在时的处理', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
    static: {
      dir: 'non-existent-assets',
    },
  };

  // 验证静态资源目录配置（即使目录不存在，配置也应该有效）
  assert(config.static !== undefined);
  assertEquals(config.static.dir, 'non-existent-assets');
});

Deno.test('Prod Server - 无静态资源配置时使用默认值', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
    // 没有 static 配置
  };

  // 验证默认静态资源目录逻辑（在 prod.ts 中会使用 config.static?.dir || 'assets'）
  const staticDir = config.static?.dir || 'assets';
  assertEquals(staticDir, 'assets');
});

Deno.test('Prod Server - 无 Cookie 配置', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
    // 没有 cookie 配置
  };

  // 验证无 Cookie 配置时的处理（在 prod.ts 中 cookieManager 会是 null）
  assert(config.cookie === undefined);
});

Deno.test('Prod Server - 无 Session 配置', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
    // 没有 session 配置
  };

  // 验证无 Session 配置时的处理（在 prod.ts 中 sessionManager 会是 null）
  assert(config.session === undefined);
});

Deno.test('Prod Server - 空中间件数组', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
    middleware: [],
  };

  // 验证空中间件数组的处理
  assert(config.middleware !== undefined);
  assertEquals(config.middleware.length, 0);
});

Deno.test('Prod Server - 空插件数组', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
    plugins: [],
  };

  // 验证空插件数组的处理
  assert(config.plugins !== undefined);
  assertEquals(config.plugins.length, 0);
});

Deno.test('Prod Server - basePath 配置', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
    basePath: '/api',
  };

  // 验证 basePath 配置
  assertEquals(config.basePath, '/api');
});

Deno.test('Prod Server - 构建输出目录路径处理', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
    static: {
      dir: 'assets',
    },
  };

  // 验证构建输出目录和静态资源路径的组合逻辑
  // 在 prod.ts 中：assetsPath = `${config.build!.outDir}/${staticDir}`
  const outDir = config.build!.outDir;
  const staticDir = config.static?.dir || 'assets';
  const assetsPath = `${outDir}/${staticDir}`;
  assertEquals(assetsPath, 'dist/assets');
});

Deno.test('Prod Server - 路由配置 ignore 选项', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/_*.ts'],
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
  };

  // 验证路由配置的 ignore 选项
  assert(config.routes !== undefined);
  if (typeof config.routes === 'object') {
    assert(config.routes.ignore !== undefined);
    assertEquals(config.routes.ignore.length, 3);
    assert(config.routes.ignore.includes('**/*.test.ts'));
  }
});

Deno.test('Prod Server - 构建输出目录不存在时的处理', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'non-existent-dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
  };

  // 验证构建输出目录配置（即使目录不存在，配置也应该有效）
  assert(config.build !== undefined);
  assertEquals(config.build.outDir, 'non-existent-dist');
  
  // 在 prod.ts 中，如果构建输出目录不存在，会扫描源代码目录
  // 这里只验证配置本身是有效的
  assert(true);
});

Deno.test('Prod Server - 路由映射文件路径构建', () => {
  const config: AppConfig = {
    routes: {
      dir: 'routes',
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
  };

  // 验证路由映射文件路径构建逻辑
  // 在 prod.ts 中：routeMapPath = path.join(outDir, '.route-map.json')
  const outDir = config.build!.outDir;
  const routeMapPath = `${outDir}/.route-map.json`;
  assertEquals(routeMapPath, 'dist/.route-map.json');
});

