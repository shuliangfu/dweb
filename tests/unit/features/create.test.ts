/**
 * 项目创建功能测试
 * 测试 create.ts 中的项目创建功能
 */

import { assertEquals, assert } from '@std/assert';
import { setFrameworkUrl, getFrameworkUrl } from '../../../src/features/create.ts';
import * as path from '@std/path';
import { ensureDir, ensureFile } from '@std/fs';

Deno.test('Create - setFrameworkUrl 和 getFrameworkUrl', async () => {
  // 测试设置和获取框架 URL
  const testUrl = 'jsr:@dreamer/dweb@^1.0.0';
  setFrameworkUrl(testUrl);
  
  const url = await getFrameworkUrl();
  assertEquals(url, testUrl);
});

Deno.test('Create - getFrameworkUrl 默认值', async () => {
  // 重置框架 URL
  setFrameworkUrl('');
  
  // 获取默认 URL（应该从版本号构建）
  const url = await getFrameworkUrl();
  
  // 应该是一个有效的 JSR URL 格式
  assert(url.startsWith('jsr:@dreamer/dweb@'), '应该返回有效的 JSR URL');
  assert(url.includes('^'), '应该包含版本范围符号');
});

Deno.test('Create - 框架 URL 格式验证', async () => {
  // 测试不同的 URL 格式
  const testUrls = [
    'jsr:@dreamer/dweb@^1.0.0',
    'jsr:@dreamer/dweb@1.0.0',
    'https://deno.land/x/dreamer_dweb@1.0.0',
  ];

  for (const testUrl of testUrls) {
    setFrameworkUrl(testUrl);
    const url = await getFrameworkUrl();
    assertEquals(url, testUrl);
  }
});

Deno.test('Create - 框架 URL 持久性', async () => {
  // 设置框架 URL
  const testUrl = 'jsr:@dreamer/dweb@^2.0.0';
  setFrameworkUrl(testUrl);
  
  // 多次获取应该返回相同的 URL
  const url1 = await getFrameworkUrl();
  const url2 = await getFrameworkUrl();
  const url3 = await getFrameworkUrl();
  
  assertEquals(url1, testUrl);
  assertEquals(url2, testUrl);
  assertEquals(url3, testUrl);
});

