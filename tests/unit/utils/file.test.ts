/**
 * 文件工具函数单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { findConfigFile, shouldIgnoreFile } from '../../../src/utils/file.ts';
import { ensureDir, ensureFile } from '@std/fs';
import * as path from '@std/path';

const testDir = path.join(Deno.cwd(), 'tests', 'fixtures', 'file');

Deno.test('File Utils - findConfigFile - 查找配置文件', async () => {
  await ensureDir(testDir);
  const configFile = path.join(testDir, 'dweb.config.ts');
  await ensureFile(configFile);
  await Deno.writeTextFile(configFile, 'export default {};');
  
  // 切换到测试目录
  const originalCwd = Deno.cwd();
  try {
    Deno.chdir(testDir);
    
    const found = await findConfigFile();
    
    // 应该找到配置文件
    assert(found !== null);
    assert(found.includes('dweb.config.ts'));
  } finally {
    Deno.chdir(originalCwd);
    try {
      await Deno.remove(configFile);
    } catch {
      // 忽略清理错误
    }
  }
});

Deno.test('File Utils - findConfigFile - 找不到文件返回 null', async () => {
  const originalCwd = Deno.cwd();
  try {
    // 切换到不包含配置文件的目录
    Deno.chdir('/tmp');
    
    const found = await findConfigFile();
    
    // 应该返回 null
    assertEquals(found, null);
  } finally {
    Deno.chdir(originalCwd);
  }
});

Deno.test('File Utils - shouldIgnoreFile - 忽略匹配的文件', () => {
  const ignoredPatterns = [
    (name: string) => name.startsWith('.'),
    (name: string) => name.endsWith('.test.ts'),
  ];
  
  // 应该忽略以 . 开头的文件
  assert(shouldIgnoreFile('.env', ignoredPatterns));
  assert(shouldIgnoreFile('.gitignore', ignoredPatterns));
  
  // 应该忽略 .test.ts 文件
  assert(shouldIgnoreFile('test.test.ts', ignoredPatterns));
  
  // 不应该忽略普通文件
  assert(!shouldIgnoreFile('normal.ts', ignoredPatterns));
  assert(!shouldIgnoreFile('component.tsx', ignoredPatterns));
});

Deno.test('File Utils - shouldIgnoreFile - 空模式列表不忽略任何文件', () => {
  const ignoredPatterns: Array<(name: string) => boolean> = [];
  
  assert(!shouldIgnoreFile('.env', ignoredPatterns));
  assert(!shouldIgnoreFile('test.ts', ignoredPatterns));
});

Deno.test('File Utils - shouldIgnoreFile - 路径匹配', () => {
  const ignoredPatterns = [
    (name: string) => name.includes('node_modules'),
  ];
  
  // 应该忽略包含 node_modules 的路径
  assert(shouldIgnoreFile('node_modules/package/index.js', ignoredPatterns));
  assert(shouldIgnoreFile('src/node_modules/test.ts', ignoredPatterns));
  
  // 不应该忽略普通路径
  assert(!shouldIgnoreFile('src/components/Button.tsx', ignoredPatterns));
});

