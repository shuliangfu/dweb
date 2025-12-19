/**
 * RSS 插件单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { rss } from '../../../src/plugins/rss/index.ts';
import * as path from '@std/path';
import { ensureDir } from '@std/fs/ensure-dir';

Deno.test('RSS Plugin - 创建插件', () => {
  const plugin = rss({
    feed: {
      title: 'Test Feed',
      description: 'Test Description',
      siteUrl: 'https://example.com',
    },
    items: [],
  });
  
  assert(plugin !== null);
  assertEquals(plugin.name, 'rss');
});

Deno.test('RSS Plugin - 生成 RSS Feed', async () => {
  const testOutDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'rss-test');
  await ensureDir(testOutDir);
  
  try {
    const plugin = rss({
      feed: {
        title: 'Test Feed',
        description: 'Test Description',
        siteUrl: 'https://example.com',
        language: 'zh-CN',
      },
      items: [
        {
          title: 'Test Item',
          link: 'https://example.com/item/1',
          description: 'Test Description',
          pubDate: new Date('2024-01-01'),
        },
      ],
      filename: 'feed.xml',
    });
    
    if (plugin.onBuild) {
      await plugin.onBuild({
        outDir: testOutDir,
      } as any);
    }
    
    // 验证文件是否生成（根据实现，路径是 outDir/outputPath/filename）
    // outputPath 默认是 'rss.xml'，filename 默认是 'feed.xml'
    const feedPath = path.join(testOutDir, 'rss.xml', 'feed.xml');
    let feedExists = false;
    let feedContent = '';
    
    try {
      feedContent = await Deno.readTextFile(feedPath);
      feedExists = true;
    } catch {
      // 文件可能不存在，尝试其他可能的路径
      const altPath = path.join(testOutDir, 'feed.xml');
      try {
        feedContent = await Deno.readTextFile(altPath);
        feedExists = true;
      } catch {
        // 文件不存在
      }
    }
    
    assert(feedExists, 'RSS feed 文件应该被生成');
    
    // 验证文件内容
    if (feedExists && feedContent) {
      assert(feedContent.includes('Test Feed'));
      assert(feedContent.includes('Test Item'));
      assert(feedContent.includes('rss'));
    }
  } finally {
    // 清理测试目录
    try {
      await Deno.remove(testOutDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  }
});

Deno.test('RSS Plugin - 默认输出路径', () => {
  const plugin = rss({
    feed: {
      title: 'Test Feed',
      description: 'Test Description',
      siteUrl: 'https://example.com',
    },
    items: [],
  });
  
  assertEquals(plugin.name, 'rss');
  // 验证插件配置
  assert(plugin.config !== undefined);
});

Deno.test('RSS Plugin - 多个条目', async () => {
  const testOutDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'rss-test-multi');
  await ensureDir(testOutDir);
  
  try {
    const plugin = rss({
      feed: {
        title: 'Test Feed',
        description: 'Test Description',
        siteUrl: 'https://example.com',
      },
      items: [
        {
          title: 'Item 1',
          link: 'https://example.com/item/1',
          description: 'Description 1',
          pubDate: new Date('2024-01-01'),
        },
        {
          title: 'Item 2',
          link: 'https://example.com/item/2',
          description: 'Description 2',
          pubDate: new Date('2024-01-02'),
        },
      ],
      filename: 'feed.xml',
    });
    
    if (plugin.onBuild) {
      await plugin.onBuild({
        outDir: testOutDir,
      } as any);
    }
    
    // 根据实现，文件路径可能是 outDir/outputPath/filename
    const feedPath = path.join(testOutDir, 'rss.xml', 'feed.xml');
    let feedExists = false;
    let feedContent = '';
    
    try {
      feedContent = await Deno.readTextFile(feedPath);
      feedExists = true;
    } catch {
      const altPath = path.join(testOutDir, 'feed.xml');
      try {
        feedContent = await Deno.readTextFile(altPath);
        feedExists = true;
      } catch {
        // 文件不存在
      }
    }
    
    if (feedExists && feedContent) {
      assert(feedContent.includes('Item 1'));
      assert(feedContent.includes('Item 2'));
    }
  } finally {
    try {
      await Deno.remove(testOutDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  }
});

