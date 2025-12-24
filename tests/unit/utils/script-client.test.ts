/**
 * 客户端脚本工具函数单元测试
 */

import { assert } from '@std/assert';
import { createClientScript } from '../../../src/utils/script-client.ts';

Deno.test({
  name: 'Script Client Utils - createClientScript - 创建客户端脚本',
  sanitizeResources: false, // 禁用资源清理检查，因为 esbuild 可能启动子进程
  sanitizeOps: false, // 禁用操作清理检查
  async fn() {
    const script = await createClientScript(
      '/routes/index.tsx',
      'hybrid',
      {},
      true
    );
    
    // 应该返回一个字符串
    assert(typeof script === 'string');
    // 应该包含 script 标签
    assert(script.includes('<script') || script.includes('type="module"'));
  }
});

Deno.test('Script Client Utils - createClientScript - 脚本包含必要内容', async () => {
  const script = await createClientScript(
    '/routes/index.tsx',
    'csr',
    { title: 'Test' },
    false
  );
  
  // 脚本应该包含一些关键内容（根据实际实现调整）
  assert(script.length > 0);
});

Deno.test('Script Client Utils - createClientScript - 不同渲染模式', async () => {
  const ssrScript = await createClientScript('/routes/index.tsx', 'ssr', {}, false);
  const csrScript = await createClientScript('/routes/index.tsx', 'csr', {}, false);
  const hybridScript = await createClientScript('/routes/index.tsx', 'hybrid', {}, false);
  
  // 所有模式都应该生成脚本
  assert(ssrScript.length > 0);
  assert(csrScript.length > 0);
  assert(hybridScript.length > 0);
});

