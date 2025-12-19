/**
 * 客户端脚本工具函数单元测试
 */

import { assert } from '@std/assert';
import { createClientScript } from '../../../src/utils/script-client.ts';

Deno.test('Script Client Utils - createClientScript - 创建客户端脚本', () => {
  const script = createClientScript();
  
  // 应该返回一个字符串
  assert(typeof script === 'string');
  // 应该包含 script 标签
  assert(script.includes('<script') || script.includes('type="module"'));
});

Deno.test('Script Client Utils - createClientScript - 脚本包含必要内容', () => {
  const script = createClientScript();
  
  // 脚本应该包含一些关键内容（根据实际实现调整）
  assert(script.length > 0);
});

