import type { Request, Response } from '@dreamer/dweb';
import * as path from "@std/path";

export async function createApp(_req: Request, res: Response) {
  const initFile = path.join(Deno.cwd(), 'init.ts');
  try {
    const stat = await Deno.stat(initFile);
    if (!stat.isFile) {
      res.text('// init.ts 文件不存在', { type: 'text/javascript' });
      return;
    }
    const initContent = await Deno.readTextFile(initFile);
    res.text(initContent, { type: 'text/javascript' });
  } catch {
    res.text('// init.ts 文件不存在', { type: 'text/javascript' });
  }
}