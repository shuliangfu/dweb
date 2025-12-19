/**
 * Cookie 管理测试
 */

import { assertEquals, assert } from '@std/assert';
import { CookieManager } from '../../../src/features/cookie.ts';

Deno.test('CookieManager - 设置基本 Cookie', async () => {
  const manager = new CookieManager();
  const cookie = await manager.setAsync('test', 'value');
  
  assert(cookie.includes('test=value'));
  assert(cookie.includes('Path=/'));
});

Deno.test('CookieManager - 设置带选项的 Cookie', async () => {
  const manager = new CookieManager();
  const cookie = await manager.setAsync('test', 'value', {
    path: '/api',
    domain: 'example.com',
    maxAge: 3600,
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
  });
  
  assert(cookie.includes('test=value'));
  assert(cookie.includes('Path=/api'));
  assert(cookie.includes('Domain=example.com'));
  assert(cookie.includes('Max-Age=3600'));
  assert(cookie.includes('Secure'));
  assert(cookie.includes('HttpOnly'));
  assert(cookie.includes('SameSite=strict')); // 实际输出是小写
});

Deno.test('CookieManager - Cookie 签名', async () => {
  const manager = new CookieManager('secret-key');
  const cookie = await manager.setAsync('test', 'value');
  
  // 签名的 Cookie 应该包含签名部分（用 . 分隔）
  const parts = cookie.split(';')[0].split('=');
  assertEquals(parts.length, 2);
  const valueWithSignature = parts[1];
  assert(valueWithSignature.includes('.'));
});

Deno.test('CookieManager - 解析 Cookie', () => {
  const manager = new CookieManager();
  const cookieHeader = 'test=value; other=otherValue';
  const cookies = manager.parse(cookieHeader);
  
  assertEquals(cookies.test, 'value');
  assertEquals(cookies.other, 'otherValue');
});

Deno.test('CookieManager - 解析空 Cookie 头', () => {
  const manager = new CookieManager();
  const cookies = manager.parse(null);
  
  assertEquals(Object.keys(cookies).length, 0);
});

Deno.test('CookieManager - 删除 Cookie', () => {
  const manager = new CookieManager();
  const cookie = manager.delete('test');
  
  assert(cookie.includes('test='));
  assert(cookie.includes('Max-Age=0'));
  // Expires 可能使用不同的日期格式
  assert(cookie.includes('Expires=') || cookie.includes('expires='));
});

Deno.test('CookieManager - URL 编码 Cookie 值', async () => {
  const manager = new CookieManager();
  const cookie = await manager.setAsync('test', 'value with spaces');
  
  assert(cookie.includes('test=value%20with%20spaces'));
});

