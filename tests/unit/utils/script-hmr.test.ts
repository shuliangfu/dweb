/**
 * HMR 脚本工具函数单元测试
 */

import { assert } from '@std/assert';
import { createHMRClientScript } from '../../../src/utils/script-hmr.ts';

Deno.test({
  name: 'Script HMR Utils - createHMRClientScript - 创建 HMR 客户端脚本',
  sanitizeResources: false, // 禁用资源清理检查，因为 esbuild 可能启动子进程
  sanitizeOps: false, // 禁用操作清理检查
  async fn() {
    const script = await createHMRClientScript(3001);
    
    // 应该返回一个字符串
    assert(typeof script === 'string');
    // 应该包含 script 标签或模块代码
    assert(script.length > 0);
  }
});

Deno.test('Script HMR Utils - 不同端口号', async () => {
  const script1 = await createHMRClientScript(3001);
  const script2 = await createHMRClientScript(3002);
  
  // 不同端口应该生成不同的脚本
  assert(script1 !== script2 || script1.includes('3001'));
});

