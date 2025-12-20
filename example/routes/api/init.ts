import type { Request, Response } from '@dreamer/dweb';
import * as path from "@std/path";

/**
 * 创建应用初始化脚本
 * 返回 init.ts 文件内容，供 deno run 通过 HTTP URL 直接运行
 * 
 * @param _req 请求对象
 * @param res 响应对象
 */
export async function createApp(_req: Request, res: Response) {
  const initFile = path.join(Deno.cwd(), 'init.ts');
  try {
    const stat = await Deno.stat(initFile);
    if (!stat.isFile) {
      // 如果文件不存在，返回注释
      res.text('// init.ts 文件不存在', { type: 'javascript' });
      return;
    }
    const initContent = await Deno.readTextFile(initFile);
    res.text(initContent, { type: 'javascript' });
  } catch {
    // 如果读取失败，返回注释
    res.text('// init.ts 文件不存在', { type: 'javascript' });
  }
}