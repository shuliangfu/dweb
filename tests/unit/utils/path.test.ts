/**
 * 路径工具函数测试
 */

import { assertEquals } from '@std/assert';
import {
  filePathToHttpUrl,
  resolveFilePath,
  normalizeModulePath,
  getRelativePath,
  cleanUrl,
} from '../../../src/utils/path.ts';

Deno.test('filePathToHttpUrl - file:// 协议转换', () => {
  const cwd = Deno.cwd();
  const filePath = `file://${cwd}/routes/index.tsx`;
  const result = filePathToHttpUrl(filePath);
  assertEquals(result, '/__modules/routes%2Findex.tsx');
});

Deno.test('filePathToHttpUrl - HTTP URL 保持不变', () => {
  assertEquals(
    filePathToHttpUrl('https://example.com/file.js'),
    'https://example.com/file.js'
  );
  assertEquals(
    filePathToHttpUrl('http://example.com/file.js'),
    'http://example.com/file.js'
  );
});

Deno.test('filePathToHttpUrl - 相对路径转换', () => {
  assertEquals(
    filePathToHttpUrl('./routes/index.tsx'),
    '/__modules/routes%2Findex.tsx'
  );
  assertEquals(
    filePathToHttpUrl('./dist/app.js'),
    '/__modules/dist%2Fapp.js'
  );
});

Deno.test('filePathToHttpUrl - 普通路径转换', () => {
  assertEquals(
    filePathToHttpUrl('routes/index.tsx'),
    '/__modules/routes%2Findex.tsx'
  );
});

Deno.test('resolveFilePath - file:// 协议保持不变', () => {
  assertEquals(
    resolveFilePath('file:///app/routes/index.tsx'),
    'file:///app/routes/index.tsx'
  );
});

Deno.test('resolveFilePath - 绝对路径添加 file:// 前缀', () => {
  assertEquals(
    resolveFilePath('/app/routes/index.tsx'),
    'file:///app/routes/index.tsx'
  );
});

Deno.test('normalizeModulePath - .tsx 文件转换', () => {
  assertEquals(
    normalizeModulePath('/routes/index.tsx'),
    '/__modules/routes/index.tsx'
  );
  assertEquals(
    normalizeModulePath('routes/about.tsx'),
    '/__modules/routes/about.tsx'
  );
});

Deno.test('normalizeModulePath - .ts 文件转换', () => {
  assertEquals(
    normalizeModulePath('/routes/api.ts'),
    '/__modules/routes/api.ts'
  );
});

Deno.test('normalizeModulePath - 已有 /__modules/ 前缀保持不变', () => {
  assertEquals(
    normalizeModulePath('/__modules/routes/index.tsx'),
    '/__modules/routes/index.tsx'
  );
});

Deno.test('normalizeModulePath - 非 .ts/.tsx 文件保持不变', () => {
  assertEquals(
    normalizeModulePath('/assets/style.css'),
    '/assets/style.css'
  );
  assertEquals(
    normalizeModulePath('/images/logo.png'),
    '/images/logo.png'
  );
});

Deno.test('getRelativePath - 在基础路径内', () => {
  const basePath = '/app';
  const filePath = '/app/routes/index.tsx';
  assertEquals(getRelativePath(filePath, basePath), 'routes/index.tsx');
});

Deno.test('getRelativePath - 不在基础路径内', () => {
  const basePath = '/app';
  const filePath = '/other/routes/index.tsx';
  assertEquals(getRelativePath(filePath, basePath), '/other/routes/index.tsx');
});

Deno.test('cleanUrl - 移除空格', () => {
  assertEquals(cleanUrl('  /routes/index  '), '/routes/index');
  assertEquals(cleanUrl('/routes/index   '), '/routes/index');
  assertEquals(cleanUrl('   /routes/index'), '/routes/index');
});

Deno.test('cleanUrl - 移除多个空格', () => {
  assertEquals(cleanUrl('/routes/index  .tsx'), '/routes/index.tsx');
  assertEquals(cleanUrl('/routes/  index.tsx'), '/routes/index.tsx');
});

