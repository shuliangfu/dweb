/**
 * 路由模块加载（统一入口）
 *
 * 支持 .ts、.tsx（以及 .js/.jsx），走原生 import。
 * 开发模式下通过 cache-busting 参数绕过模块缓存，确保文件变更后刷新能拿到最新内容。
 */

import { cwd, getEnv, join } from "../core/runtime-adapter.ts";
import { getModuleVersion } from "./module-cache.ts";

/**
 * 加载路由模块（页面/布局/App/Error 等）
 *
 * 开发模式下，文件变更后 invalidateModule 会更新版本，
 * 下次加载时通过 ?t=version 绕过 Deno/Bun 的 import 缓存，拿到最新内容。
 *
 * @param filePath 文件路径（可为 file://、绝对或相对）
 * @returns 模块对象，失败返回 null
 */
export async function loadRouteModule(
  filePath: string,
): Promise<Record<string, unknown> | null> {
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

    // 开发模式：通过 ?t=version 绕过 import 缓存，确保文件变更后刷新能拿到最新内容
    const env = getEnv("DENO_ENV") || getEnv("BUN_ENV") || getEnv("NODE_ENV");
    if (env === "dev") {
      const version = getModuleVersion(moduleUrl);
      moduleUrl = `${moduleUrl}?t=${version}`;
    }

    const mod = await import(moduleUrl);
    return mod as Record<string, unknown>;
  } catch (error) {
    console.error(`${$t("log.loadModuleFailed")}: ${filePath}`, error);
    return null;
  }
}
