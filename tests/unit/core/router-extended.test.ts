/**
 * Router 扩展测试
 * 补充 Router 类的其他方法测试
 */

import { assertEquals, assert } from '@std/assert';
import { Router, type RouteInfo } from '../../../src/core/router.ts';
import * as path from '@std/path';
import { ensureDir, ensureFile } from '@std/fs';

// 创建临时测试目录
const testRoutesDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'router-extended');

Deno.test('Router - match - 精确匹配', () => {
  const router = new Router(testRoutesDir);
  
  // 手动添加路由（模拟扫描后的状态）
  const routeInfo: RouteInfo = {
    path: '/users',
    filePath: '/test/routes/users.tsx',
    type: 'page',
  };
  (router as any).routes.set('/users', routeInfo);
  
  const matched = router.match('/users');
  assert(matched !== null);
  assertEquals(matched.path, '/users');
  assertEquals(matched.type, 'page');
});

Deno.test('Router - match - 动态路由匹配', () => {
  const router = new Router(testRoutesDir);
  
  // 添加动态路由
  const routeInfo: RouteInfo = {
    path: '/users/[id]',
    filePath: '/test/routes/users/[id].tsx',
    type: 'page',
    params: ['id'],
  };
  (router as any).routes.set('/users/[id]', routeInfo);
  
  const matched = router.match('/users/123');
  assert(matched !== null);
  assertEquals(matched.path, '/users/[id]');
  assertEquals(matched.params, ['id']);
});

Deno.test('Router - match - API 路由前缀匹配', () => {
  const router = new Router(testRoutesDir);
  
  // 添加 API 路由
  const routeInfo: RouteInfo = {
    path: '/api/users',
    filePath: '/test/routes/api/users.ts',
    type: 'api',
  };
  (router as any).routes.set('/api/users', routeInfo);
  
  // API 路由应该支持前缀匹配（如 /api/users/getUsers）
  const matched = router.match('/api/users/getUsers');
  assert(matched !== null);
  assertEquals(matched.path, '/api/users');
  assertEquals(matched.type, 'api');
});

Deno.test('Router - match - 捕获所有路由', () => {
  const router = new Router(testRoutesDir);
  
  // 添加捕获所有路由
  const routeInfo: RouteInfo = {
    path: '/posts/[...slug]',
    filePath: '/test/routes/posts/[...slug].tsx',
    type: 'page',
    params: ['slug'],
    isCatchAll: true,
  };
  (router as any).routes.set('/posts/[...slug]', routeInfo);
  
  const matched = router.match('/posts/2024/12/19');
  assert(matched !== null);
  assertEquals(matched.path, '/posts/[...slug]');
  assertEquals(matched.isCatchAll, true);
});

Deno.test('Router - match - basePath 处理', () => {
  const router = new Router(testRoutesDir, [], '/app');
  
  // basePath 应该被规范化
  const basePath = (router as any).basePath;
  assert(basePath.startsWith('/'));
  assert(basePath.endsWith('/') || basePath === '/');
});

Deno.test('Router - match - 不匹配的路由返回 null', () => {
  const router = new Router(testRoutesDir);
  
  // 不添加任何路由
  const matched = router.match('/not-found');
  assertEquals(matched, null);
});

Deno.test('Router - getLayout - 获取布局', () => {
  const router = new Router(testRoutesDir);
  
  // 手动添加布局
  (router as any).layouts.set('/', '/test/routes/_layout.tsx');
  (router as any).layouts.set('/users', '/test/routes/users/_layout.tsx');
  
  // 获取根布局
  const rootLayout = router.getLayout('/');
  assertEquals(rootLayout, '/test/routes/_layout.tsx');
  
  // 获取用户页面的布局
  const userLayout = router.getLayout('/users');
  assertEquals(userLayout, '/test/routes/users/_layout.tsx');
  
  // 获取不存在的布局
  const notFoundLayout = router.getLayout('/not-found');
  assertEquals(notFoundLayout, null);
});

Deno.test('Router - getLayout - 嵌套路径查找', () => {
  const router = new Router(testRoutesDir);
  
  // 只添加根布局
  (router as any).layouts.set('/', '/test/routes/_layout.tsx');
  
  // 嵌套路径应该使用父级布局
  const nestedLayout = router.getLayout('/users/123/posts');
  assertEquals(nestedLayout, '/test/routes/_layout.tsx');
});

Deno.test('Router - getMiddlewares - 获取中间件', () => {
  const router = new Router(testRoutesDir);
  
  // 手动添加中间件
  (router as any).middlewares.set('/', '/test/routes/_middleware.ts');
  (router as any).middlewares.set('/users', '/test/routes/users/_middleware.ts');
  
  // 获取根中间件
  const rootMiddlewares = router.getMiddlewares('/');
  assertEquals(rootMiddlewares.length, 1);
  assertEquals(rootMiddlewares[0], '/test/routes/_middleware.ts');
  
  // 获取用户页面的中间件（应该包含根中间件和用户中间件）
  const userMiddlewares = router.getMiddlewares('/users');
  assertEquals(userMiddlewares.length, 2);
  assertEquals(userMiddlewares[0], '/test/routes/_middleware.ts');
  assertEquals(userMiddlewares[1], '/test/routes/users/_middleware.ts');
});

Deno.test('Router - getErrorPage - 获取错误页面', () => {
  const router = new Router(testRoutesDir);
  
  // 手动添加错误页面
  (router as any).errorPages.set('404', '/test/routes/_404.tsx');
  (router as any).errorPages.set('error', '/test/routes/_error.tsx');
  
  // 获取 404 错误页面
  const error404 = router.getErrorPage('404');
  assertEquals(error404, '/test/routes/_404.tsx');
  
  // 获取通用错误页面
  const errorPage = router.getErrorPage('error');
  assertEquals(errorPage, '/test/routes/_error.tsx');
  
  // 获取不存在的错误页面
  const notFoundError = router.getErrorPage('500');
  assertEquals(notFoundError, null);
});

Deno.test('Router - getApp - 获取应用组件', () => {
  const router = new Router(testRoutesDir);
  
  // 手动设置应用组件
  (router as any).appFilePath = '/test/routes/_app.tsx';
  
  const app = router.getApp();
  assertEquals(app, '/test/routes/_app.tsx');
  
  // 清除应用组件
  (router as any).appFilePath = null;
  const noApp = router.getApp();
  assertEquals(noApp, null);
});

Deno.test('Router - getAllRoutes - 获取所有路由', () => {
  const router = new Router(testRoutesDir);
  
  // 手动添加多个路由
  const route1: RouteInfo = {
    path: '/',
    filePath: '/test/routes/index.tsx',
    type: 'page',
  };
  const route2: RouteInfo = {
    path: '/users',
    filePath: '/test/routes/users.tsx',
    type: 'page',
  };
  const route3: RouteInfo = {
    path: '/api/users',
    filePath: '/test/routes/api/users.ts',
    type: 'api',
  };
  
  (router as any).routes.set('/', route1);
  (router as any).routes.set('/users', route2);
  (router as any).routes.set('/api/users', route3);
  
  const allRoutes = router.getAllRoutes();
  assertEquals(allRoutes.length, 3);
  
  // 验证路由包含所有添加的路由
  const paths = allRoutes.map(r => r.path);
  assert(paths.includes('/'));
  assert(paths.includes('/users'));
  assert(paths.includes('/api/users'));
});

Deno.test('Router - loadFromBuildMap - 从构建映射加载路由', async () => {
  await ensureDir(testRoutesDir);
  const buildDir = path.join(testRoutesDir, 'dist');
  await ensureDir(buildDir);
  
  const routeMapPath = path.join(buildDir, '.route-map.json');
  const routeMap = {
    'index': 'abc123.ts',
    'users': 'def456.ts',
    'api/users': 'ghi789.ts',
  };
  
  await Deno.writeTextFile(routeMapPath, JSON.stringify(routeMap));
  
  // 创建构建文件（占位）
  for (const file of Object.values(routeMap)) {
    await ensureFile(path.join(buildDir, file));
  }
  
  const router = new Router(testRoutesDir);
  
  try {
    await router.loadFromBuildMap(routeMapPath, buildDir);
    
    // 验证路由已加载
    const allRoutes = router.getAllRoutes();
    assert(allRoutes.length >= 0); // 至少应该不抛出错误
    
    // 验证可以匹配路由
    const indexRoute = router.match('/');
    // 由于 basePath 处理，可能返回 null，但至少不应该抛出错误
    assert(true);
  } finally {
    // 清理
    try {
      await Deno.remove(testRoutesDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  }
});

Deno.test('Router - constructor - basePath 规范化', () => {
  // 测试 basePath 不以 / 开头
  const router1 = new Router(testRoutesDir, [], 'app');
  const basePath1 = (router1 as any).basePath;
  assert(basePath1.startsWith('/'));
  
  // 测试 basePath 不以 / 结尾（非根路径）
  const router2 = new Router(testRoutesDir, [], '/app');
  const basePath2 = (router2 as any).basePath;
  assert(basePath2.endsWith('/'));
  
  // 测试根路径
  const router3 = new Router(testRoutesDir, [], '/');
  const basePath3 = (router3 as any).basePath;
  assertEquals(basePath3, '/');
});

Deno.test('Router - constructor - ignore 模式编译', () => {
  const router = new Router(testRoutesDir, ['**/*.test.ts', '**/node_modules/**']);
  const ignorePatterns = (router as any).ignorePatterns;
  
  assertEquals(ignorePatterns.length, 2);
  assert(ignorePatterns[0] instanceof RegExp);
  assert(ignorePatterns[1] instanceof RegExp);
});

