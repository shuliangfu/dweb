/**
 * 路由模块加载（统一入口）
 *
 * 支持 .ts、.tsx（以及 .js/.jsx），走原生 import。
 */

import { join } from "../core/runtime-adapter.ts";

/**
 * 加载路由模块（页面/布局/App/Error 等）
 *
 * @param filePath 文件路径（可为 file://、绝对或相对）
 * @returns 模块对象，失败返回 null
 */
export async function loadRouteModule(
  filePath: string,
): Promise<Record<string, unknown> | null> {
  const { cwd } = await import("../core/runtime-adapter.ts");
  const cwdPath = cwd();

  try {
    let moduleUrl: string;
    if (filePath.startsWith("file://")) {
      moduleUrl = filePath;
    } else if (filePath.startsWith("/") || filePath.match(/^[A-Za-z]:/)) {
      moduleUrl = `file://${filePath}`;
    } else {
      moduleUrl = `file://${join(cwdPath, filePath)}`;
    }
    const mod = await import(moduleUrl);
    return mod as Record<string, unknown>;
  } catch (error) {
    console.error(`加载模块失败: ${filePath}`, error);
    return null;
  }
}
