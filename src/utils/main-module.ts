/**
 * 跨运行时主模块检测
 *
 * 【Why 根源】`import.meta.main` 是 Deno 专有属性，Node/Bun 下为 `undefined`，
 * 直接用 `if (import.meta.main)` 会导致 Node/Bun 下 CLI 入口不自动执行。
 * 本工具统一三端检测：Deno 比较 `Deno.mainModule`，Bun/Node 比较 `process.argv[1]`。
 *
 * 【Invariant】调用方需传入自身的 `import.meta.url`，因为本函数无法访问调用方的 import.meta。
 *
 * @module
 */

import { IS_DENO } from "./runtime.ts";

/**
 * 判断当前模块是否为进程入口（主模块）。
 *
 * - **Deno**：比较 `Deno.mainModule`（入口模块 URL）与 `currentModuleUrl`
 * - **Bun/Node**：比较 `process.argv[1]`（入口脚本路径）与 `currentModuleUrl` 转换后的路径
 *
 * @param currentModuleUrl 调用方的 `import.meta.url`
 * @returns 当前模块是否为进程入口
 *
 * @example
 * ```ts
 * // src/cli.ts
 * import { isMainModule } from "./utils/main-module.ts";
 *
 * if (isMainModule(import.meta.url)) {
 *   await cli.execute();
 * }
 * ```
 */
export function isMainModule(currentModuleUrl: string): boolean {
  if (IS_DENO) {
    // Deno：mainModule 是入口模块的 file:// URL，与当前模块 URL 直接比较
    const deno = (globalThis as { Deno?: { mainModule?: string } }).Deno;
    return deno?.mainModule === currentModuleUrl;
  }

  // Bun/Node：process.argv[1] 是入口脚本路径（可能为相对/绝对路径，Windows 用反斜杠）
  const proc = (globalThis as { process?: { argv?: string[] } }).process;
  const entry = proc?.argv?.[1];
  if (!entry) return false;

  // 将 currentModuleUrl（file:///...）转为可比较的路径字符串
  let currentPath: string;
  try {
    currentPath = new URL(currentModuleUrl).pathname;
    // Windows 盘符：file:///C:/... → pathname 为 /C:/...，去掉前导 / 以匹配裸路径
    if (/^\/[A-Za-z]:/.test(currentPath)) {
      currentPath = currentPath.slice(1);
    }
  } catch {
    return false;
  }

  // 规范化入口路径（Windows 反斜杠 → 正斜杠）
  const normEntry = entry.replace(/\\/g, "/");

  // 精确匹配或后缀匹配（兼容绝对路径 vs 相对路径差异）
  return currentPath === normEntry ||
    currentPath.endsWith(normEntry) ||
    normEntry.endsWith(currentPath);
}
