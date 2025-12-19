/**
 * 字符串工具函数测试
 */

import { assertEquals } from '@std/assert';
import { kebabToCamel } from '../../../src/utils/string.ts';

Deno.test('kebabToCamel - 基本转换', () => {
  assertEquals(kebabToCamel('get-users'), 'getUsers');
  assertEquals(kebabToCamel('create-user'), 'createUser');
  assertEquals(kebabToCamel('update-user-profile'), 'updateUserProfile');
});

Deno.test('kebabToCamel - 单个单词', () => {
  assertEquals(kebabToCamel('users'), 'users');
  assertEquals(kebabToCamel('user'), 'user');
});

Deno.test('kebabToCamel - 空字符串', () => {
  assertEquals(kebabToCamel(''), '');
});

Deno.test('kebabToCamel - 无短横线', () => {
  assertEquals(kebabToCamel('getUsers'), 'getUsers');
  assertEquals(kebabToCamel('camelCase'), 'camelCase');
});

Deno.test('kebabToCamel - 多个连续短横线', () => {
  // 注意：实际实现会保留第一个短横线后的字符
  assertEquals(kebabToCamel('get--users'), 'get-Users');
  assertEquals(kebabToCamel('create---user'), 'create--User');
});

Deno.test('kebabToCamel - 以短横线开头或结尾', () => {
  // 注意：实际实现会处理边界情况
  assertEquals(kebabToCamel('-users'), 'Users');
  assertEquals(kebabToCamel('users-'), 'users-'); // 结尾的短横线不会被处理
  assertEquals(kebabToCamel('-user-'), 'User-'); // 结尾的短横线不会被处理
});

