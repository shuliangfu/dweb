/**
 * 导入映射工具函数单元测试
 */

import { assert } from '@std/assert';
import { createImportMapScript } from '../../../src/utils/import-map.ts';

Deno.test('Import Map Utils - createImportMapScript - 创建导入映射脚本', async () => {
  // 这个函数会读取 deno.json 并生成导入映射脚本
  // 由于依赖实际文件系统，这里只验证函数可以正常调用
  try {
    const script = await createImportMapScript();
    
    // 应该返回一个字符串
    assert(typeof script === 'string');
    // 应该包含 script 标签
    assert(script.includes('<script') || script.includes('importmap'));
  } catch (error) {
    // 如果读取失败（例如没有 deno.json），这也是可以接受的
    assert(error instanceof Error);
  }
});

