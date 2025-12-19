/**
 * 缓存插件单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { cache, CacheManager } from '../../../src/plugins/cache/index.ts';
import * as path from '@std/path';
import { ensureDir } from '@std/fs/ensure-dir';

Deno.test('Cache Plugin - 创建插件', () => {
  const plugin = cache({
    config: {
      store: 'memory',
    },
  });
  
  assert(plugin !== null);
  assertEquals(plugin.name, 'cache');
});

Deno.test('Cache Plugin - 内存缓存 - 基本操作', async () => {
  const plugin = cache({
    config: {
      store: 'memory',
    },
  });
  
  const mockApp = {
    cache: null as any,
    server: {},
    middleware: {},
    plugins: {},
  };
  
  if (plugin.onInit) {
    await plugin.onInit(mockApp as any);
  }
  
  const cacheManager = mockApp.cache;
  assert(cacheManager !== null);
  
  // 测试 set 和 get
  await cacheManager.set('test-key', 'test-value');
  const value = await cacheManager.get('test-key');
  assertEquals(value, 'test-value');
  
  // 测试 has
  const hasValue = await cacheManager.has('test-key');
  assertEquals(hasValue, true);
  
  // 测试 delete
  await cacheManager.delete('test-key');
  const deletedValue = await cacheManager.get('test-key');
  assertEquals(deletedValue, null);
});

Deno.test('Cache Plugin - 内存缓存 - TTL 过期', async () => {
  const plugin = cache({
    config: {
      store: 'memory',
      defaultTTL: 1, // 1 秒
    },
  });
  
  const mockApp = {
    cache: null as any,
    server: {},
    middleware: {},
    plugins: {},
  };
  
  if (plugin.onInit) {
    await plugin.onInit(mockApp as any);
  }
  
  const cacheManager = mockApp.cache;
  
  await cacheManager.set('test-key', 'test-value', { ttl: 1 });
  const value1 = await cacheManager.get('test-key');
  assertEquals(value1, 'test-value');
  
  // 等待过期
  await new Promise(resolve => setTimeout(resolve, 1100));
  
  const value2 = await cacheManager.get('test-key');
  assertEquals(value2, null);
});

Deno.test('Cache Plugin - 内存缓存 - getOrSet', async () => {
  const plugin = cache({
    config: {
      store: 'memory',
    },
  });
  
  const mockApp = {
    cache: null as any,
    server: {},
    middleware: {},
    plugins: {},
  };
  
  if (plugin.onInit) {
    await plugin.onInit(mockApp as any);
  }
  
  const cacheManager = mockApp.cache;
  
  let callCount = 0;
  const getValue = async () => {
    callCount++;
    return 'computed-value';
  };
  
  // 第一次调用应该执行函数
  const value1 = await cacheManager.getOrSet('test-key', getValue);
  assertEquals(value1, 'computed-value');
  assertEquals(callCount, 1);
  
  // 第二次调用应该从缓存获取
  const value2 = await cacheManager.getOrSet('test-key', getValue);
  assertEquals(value2, 'computed-value');
  assertEquals(callCount, 1); // 不应该再次调用
});

Deno.test('Cache Plugin - 文件缓存 - 基本操作', async () => {
  const testCacheDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'cache-test');
  await ensureDir(testCacheDir);
  
  try {
    const plugin = cache({
      config: {
        store: 'file',
        cacheDir: testCacheDir,
      },
    });
    
    const mockApp = {
      cache: null as any,
      server: {},
      middleware: {},
      plugins: {},
    };
    
    if (plugin.onInit) {
      await plugin.onInit(mockApp as any);
    }
    
    const cacheManager = mockApp.cache;
    assert(cacheManager !== null);
    
    // 测试 set 和 get
    await cacheManager.set('test-key', 'test-value');
    const value = await cacheManager.get('test-key');
    assertEquals(value, 'test-value');
    
    // 测试 has
    const hasValue = await cacheManager.has('test-key');
    assertEquals(hasValue, true);
    
    // 测试 delete
    await cacheManager.delete('test-key');
    const deletedValue = await cacheManager.get('test-key');
    assertEquals(deletedValue, null);
    
    // 测试 clear（文件缓存可能需要时间）
    await cacheManager.set('key1', 'value1');
    await cacheManager.set('key2', 'value2');
    await cacheManager.clear();
    
    // 等待文件操作完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const clearedValue = await cacheManager.get('key1');
    assertEquals(clearedValue, null);
  } finally {
    // 清理测试目录
    try {
      await Deno.remove(testCacheDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  }
});

Deno.test('Cache Plugin - CacheManager - 直接使用', async () => {
  const manager = new CacheManager({
    store: 'memory',
    defaultTTL: 3600,
  });
  
  await manager.set('key', 'value');
  const value = await manager.get('key');
  assertEquals(value, 'value');
  
  const hasValue = await manager.has('key');
  assertEquals(hasValue, true);
  
  await manager.delete('key');
  const deletedValue = await manager.get('key');
  assertEquals(deletedValue, null);
});

Deno.test('Cache Plugin - CacheManager - getOrSet', async () => {
  const manager = new CacheManager({
    store: 'memory',
  });
  
  let callCount = 0;
  const getValue = async () => {
    callCount++;
    return `value-${callCount}`;
  };
  
  // 第一次调用
  const value1 = await manager.getOrSet('key', getValue);
  assertEquals(value1, 'value-1');
  assertEquals(callCount, 1);
  
  // 第二次调用（从缓存）
  const value2 = await manager.getOrSet('key', getValue);
  assertEquals(value2, 'value-1');
  assertEquals(callCount, 1);
  
  // 删除后再次调用
  await manager.delete('key');
  const value3 = await manager.getOrSet('key', getValue);
  assertEquals(value3, 'value-2');
  assertEquals(callCount, 2);
});

