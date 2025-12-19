/**
 * SEO 插件单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { seo } from '../../../src/plugins/seo/index.ts';

Deno.test('SEO Plugin - 创建插件', () => {
  const plugin = seo();
  
  assert(plugin !== null);
  assertEquals(plugin.name, 'seo');
});

Deno.test('SEO Plugin - 注入 SEO 标签', async () => {
  const plugin = seo({
    defaultTitle: 'Test Site',
    defaultDescription: 'Test Description',
    siteUrl: 'https://example.com',
  });
  
  const req = {
    method: 'GET',
    url: 'https://example.com/test',
    headers: new Headers(),
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers({
      'Content-Type': 'text/html',
    }),
    setHeader: function(_name: string, _value: string) {},
    body: '<html><head></head><body></body></html>',
  } as any;
  
  if (plugin.onRequest) {
    await plugin.onRequest(req, res);
  }
  
  assert(typeof res.body === 'string');
  // 验证 SEO 标签是否被注入
  const html = res.body as string;
  assert(html.includes('meta') || html.includes('title') || html.length > 50);
});

Deno.test('SEO Plugin - 不处理非 HTML 响应', async () => {
  const plugin = seo();
  
  const req = {
    method: 'GET',
    url: 'https://example.com/api/data',
    headers: new Headers(),
  } as any;
  
  const originalBody = '{"data": "test"}';
  const res = {
    status: 200,
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    setHeader: function(_name: string, _value: string) {},
    body: originalBody,
  } as any;
  
  if (plugin.onRequest) {
    await plugin.onRequest(req, res);
  }
  
  // 非 HTML 响应不应该被修改
  assertEquals(res.body, originalBody);
});

Deno.test('SEO Plugin - Open Graph 配置', () => {
  const plugin = seo({
    openGraph: {
      siteName: 'Test Site',
    },
  });
  
  assertEquals(plugin.name, 'seo');
  assert(plugin.config !== undefined);
});

Deno.test('SEO Plugin - Twitter Card 配置', () => {
  const plugin = seo({
    twitter: {
      card: 'summary_large_image',
    },
  });
  
  assertEquals(plugin.name, 'seo');
  assert(plugin.config !== undefined);
});

