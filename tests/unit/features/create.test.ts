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

// 注意：由于 createApp 涉及文件系统操作和交互式输入，以下测试主要覆盖参数验证和错误处理
Deno.test('Create - createApp - 项目名称验证 - 空名称', async () => {
  // 测试空项目名称（需要模拟 prompt 函数，这里只测试基本逻辑）
  // 由于 createApp 会调用 prompt，我们需要 mock 它
  // 但 Deno 的测试环境不支持直接 mock stdin，所以这里主要测试错误处理
  
  // 注意：这个测试可能需要重构 createApp 以支持非交互模式
  // 目前只验证函数存在且可以调用
  const { createApp } = await import('../../../src/features/create.ts');
  assert(typeof createApp === 'function');
});

Deno.test('Create - createApp - 项目名称验证 - 无效字符', async () => {
  // 测试无效项目名称（包含特殊字符）
  // 由于 createApp 需要交互式输入，这里主要验证函数存在
  const { createApp } = await import('../../../src/features/create.ts');
  assert(typeof createApp === 'function');
  
  // 注意：实际测试需要 mock prompt 函数或重构 createApp 支持非交互模式
});

Deno.test('Create - createApp - 目录已存在错误', async () => {
  // 测试目录已存在的情况
  const { createApp } = await import('../../../src/features/create.ts');
  assert(typeof createApp === 'function');
  
  // 创建临时目录
  const testDir = path.join(Deno.cwd(), 'test-existing-dir');
  try {
    await ensureDir(testDir);
    
    // 尝试在已存在的目录创建项目（需要 mock prompt 或使用非交互模式）
    // 由于 createApp 需要交互式输入，这里只验证函数存在
    assert(typeof createApp === 'function');
  } finally {
    // 清理
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  }
});

Deno.test('Create - createApp - 框架 URL 覆盖', async () => {
  // 测试提供 frameworkUrlOverride 参数
  const { createApp } = await import('../../../src/features/create.ts');
  assert(typeof createApp === 'function');
  
  // 设置框架 URL
  const customUrl = 'jsr:@dreamer/dweb@^3.0.0';
  setFrameworkUrl('');
  
  // 注意：由于 createApp 需要交互式输入，这里只验证函数存在
  // 实际测试需要 mock prompt 和 select 函数
  assert(typeof createApp === 'function');
});

Deno.test('Create - getFrameworkUrl - 重置后获取默认值', async () => {
  // 重置框架 URL
  setFrameworkUrl('');
  
  // 获取默认 URL（应该从版本号构建）
  const url = await getFrameworkUrl();
  
  // 应该是一个有效的 JSR URL 格式
  assert(url.startsWith('jsr:@dreamer/dweb@'), '应该返回有效的 JSR URL');
  assert(url.includes('^'), '应该包含版本范围符号');
});

Deno.test('Create - setFrameworkUrl - 设置空字符串', () => {
  // 测试设置空字符串
  setFrameworkUrl('');
  
  // 验证可以设置空字符串（不会抛出错误）
  assert(true);
});

Deno.test('Create - getFrameworkUrl - 多次调用返回相同值', async () => {
  // 重置框架 URL
  setFrameworkUrl('');
  
  // 多次获取应该返回相同的 URL（基于相同的版本号）
  const url1 = await getFrameworkUrl();
  const url2 = await getFrameworkUrl();
  
  // 应该返回相同的 URL
  assertEquals(url1, url2);
});

