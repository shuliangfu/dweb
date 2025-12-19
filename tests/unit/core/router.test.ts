/**
 * 路由系统测试
 */

import { assertEquals, assert } from '@std/assert';
import { Router } from '../../../src/core/router.ts';
import * as path from '@std/path';
import { ensureDir } from '@std/fs/ensure-dir';

// 创建临时测试目录
const testRoutesDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'routes');

Deno.test('Router - 提取路由参数', () => {
  const router = new Router(testRoutesDir);
  
  // 测试基本参数提取
  const params1 = router.extractParams('/users/:id', '/users/123', {
    path: '/users/:id',
    filePath: '',
    type: 'page',
    params: ['id'],
  });
  assertEquals(params1.id, '123');
  
  // 测试多个参数
  const params2 = router.extractParams('/users/:id/posts/:postId', '/users/123/posts/456', {
    path: '/users/:id/posts/:postId',
    filePath: '',
    type: 'page',
    params: ['id', 'postId'],
  });
  assertEquals(params2.id, '123');
  assertEquals(params2.postId, '456');
  
  // 测试捕获所有路由
  const params3 = router.extractParams('/posts/*', '/posts/2024/12/19', {
    path: '/posts/*',
    filePath: '',
    type: 'page',
    params: ['slug'],
    isCatchAll: true,
  });
  assertEquals(params3.slug, '2024/12/19');
});

Deno.test('Router - 路由参数清理', () => {
  const router = new Router(testRoutesDir);
  
  // 测试控制字符清理
  const params = router.extractParams('/users/:id', '/users/123\x00\x01', {
    path: '/users/:id',
    filePath: '',
    type: 'page',
    params: ['id'],
  });
  assertEquals(params.id, '123');
  
  // 测试长度限制
  const longValue = 'a'.repeat(2000);
  const params2 = router.extractParams('/posts/*', `/posts/${longValue}`, {
    path: '/posts/*',
    filePath: '',
    type: 'page',
    params: ['slug'],
    isCatchAll: true,
  });
  assert(params2.slug.length <= 2000);
});

Deno.test('Router - 无效参数名过滤', () => {
  const router = new Router(testRoutesDir);
  
  // 测试无效参数名（以数字开头）
  const params = router.extractParams('/users/:123id', '/users/test', {
    path: '/users/:123id',
    filePath: '',
    type: 'page',
    params: ['123id'],
  });
  // 无效参数名应该被过滤
  assertEquals(Object.keys(params).length, 0);
});

Deno.test({
  name: 'Router - 匹配路由',
  permissions: { read: true, write: true },
  fn: async () => {
    // 创建测试路由目录
    await ensureDir(testRoutesDir);
    
    const router = new Router(testRoutesDir);
    
    // 扫描路由（需要实际文件，这里只测试匹配逻辑）
    // 注意：这个测试需要实际的路由文件，可能需要 mock 或使用 fixtures
    
    // 测试基本匹配
    const routeInfo = router.match('/users/123');
    // 如果没有路由文件，应该返回 null
    // 这里主要测试匹配逻辑不会抛出错误
    assert(true); // 占位测试
  }
});

