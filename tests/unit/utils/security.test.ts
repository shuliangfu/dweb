/**
 * 安全工具函数测试
 */

import { assertEquals, assert } from '@std/assert';
import {
  isPathSafe,
  isValidIdentifier,
  isSafeFileName,
  sanitizeRouteParams,
  isSafeMethodName,
  isSafeQueryValue,
} from '../../../src/utils/security.ts';

Deno.test('isPathSafe - 正常路径应该返回 true', () => {
  const allowedDir = '/app/public';
  const safePath = '/app/public/images/logo.png';
  assertEquals(isPathSafe(safePath, allowedDir), true);
});

Deno.test('isPathSafe - 路径遍历攻击应该返回 false', () => {
  const allowedDir = '/app/public';
  const unsafePath = '/app/public/../../etc/passwd';
  assertEquals(isPathSafe(unsafePath, allowedDir), false);
});

Deno.test('isPathSafe - 绝对路径不在允许目录内应该返回 false', () => {
  const allowedDir = '/app/public';
  const unsafePath = '/etc/passwd';
  assertEquals(isPathSafe(unsafePath, allowedDir), false);
});

Deno.test('isValidIdentifier - 有效标识符应该返回 true', () => {
  assertEquals(isValidIdentifier('userId'), true);
  assertEquals(isValidIdentifier('_private'), true);
  assertEquals(isValidIdentifier('user123'), true);
});

Deno.test('isValidIdentifier - 无效标识符应该返回 false', () => {
  assertEquals(isValidIdentifier('123user'), false); // 不能以数字开头
  assertEquals(isValidIdentifier('user-id'), false); // 不能包含短横线
  assertEquals(isValidIdentifier('user.id'), false); // 不能包含点
  assertEquals(isValidIdentifier(''), false); // 不能为空
});

Deno.test('isSafeFileName - 安全文件名应该返回 true', () => {
  assertEquals(isSafeFileName('logo.png'), true);
  assertEquals(isSafeFileName('my-file_123.txt'), true);
  assertEquals(isSafeFileName('README.md'), true);
});

Deno.test('isSafeFileName - 不安全文件名应该返回 false', () => {
  assertEquals(isSafeFileName('../etc/passwd'), false);
  assertEquals(isSafeFileName('/etc/passwd'), false);
  assertEquals(isSafeFileName('file\x00name'), false); // 包含控制字符
});

Deno.test('sanitizeRouteParams - 应该清理控制字符并限制长度', () => {
  const params = {
    id: '123\x00\x01\x02',
    name: 'a'.repeat(2000), // 超长字符串
  };
  const sanitized = sanitizeRouteParams(params);
  
  // 控制字符应该被移除
  assertEquals(sanitized.id, '123');
  // 长度应该被限制为 1000
  assertEquals(sanitized.name.length, 1000);
});

Deno.test('sanitizeRouteParams - 无效键名应该被过滤', () => {
  const params = {
    'validKey': 'value',
    '123invalid': 'value', // 无效键名
    'invalid-key': 'value', // 无效键名
  };
  const sanitized = sanitizeRouteParams(params);
  
  assertEquals(sanitized.validKey, 'value');
  assertEquals(sanitized['123invalid'], undefined);
  assertEquals(sanitized['invalid-key'], undefined);
});

Deno.test('isSafeMethodName - 安全方法名应该返回 true', () => {
  assertEquals(isSafeMethodName('getUsers'), true);
  assertEquals(isSafeMethodName('createUser'), true);
  assertEquals(isSafeMethodName('get-user'), true);
  assertEquals(isSafeMethodName('get_user'), true);
  // 注意：isSafeMethodName 要求以字母开头，下划线开头的方法名不被允许
});

Deno.test('isSafeMethodName - 不安全方法名应该返回 false', () => {
  assertEquals(isSafeMethodName('123method'), false); // 不能以数字开头
  assertEquals(isSafeMethodName('method.name'), false); // 不能包含点
  assertEquals(isSafeMethodName('a'.repeat(101)), false); // 超过长度限制
  assertEquals(isSafeMethodName(''), false); // 不能为空
});

Deno.test('isSafeQueryValue - 安全查询参数值应该返回 true', () => {
  assertEquals(isSafeQueryValue('hello'), true);
  assertEquals(isSafeQueryValue('123'), true);
  assertEquals(isSafeQueryValue('user@example.com'), true);
});

Deno.test('isSafeQueryValue - 不安全查询参数值应该返回 false', () => {
  assertEquals(isSafeQueryValue('<script>alert(1)</script>'), false); // XSS 尝试
  assertEquals(isSafeQueryValue('javascript:alert(1)'), false); // JavaScript 协议
  assertEquals(isSafeQueryValue('a'.repeat(2001)), false); // 超过长度限制
});

