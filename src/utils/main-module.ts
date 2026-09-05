/**
 * 跨运行时主模块检测
 *
 * 【Why 根源】统一 Deno、Bun 和 Node.js 三端的主模块入口判定：
 * - Deno / Bun 原生支持 `import.meta.main`
 * - Node.js 下通过比较 `process.argv[1]` 与当前模块路径
 * - 兼顾直接传入 `import.meta` 对象或 `import.meta.url` 字符串
 *
 * @module
 */

import { IS_DENO } from "./runtime.ts";

/**
 * 判断当前模块是否为进程入口（主模块）。
 *
 * - **Deno / Bun**：若传入 import.meta，优先使用内置的 `import.meta.main`
 * - **Deno (回退)**：比较 `Deno.mainModule` 与模块 URL（支持本地文件与 JSR 远程说明符）
 * - **Bun / Node**：比较 `process.argv[1]`（入口脚本路径）与模块路径
 *
 * @param metaOrUrl 调用方的 `import.meta` 对象或 `import.meta.url` 字符串
 * @returns 当前模块是否为进程入口
 *
 * @example
 * ```ts
 * // src/cli.ts
 * import { isMainModule } from "./utils/main-module.ts";
 *
 * if (isMainModule(import.meta)) {
 *   await cli.execute();
 * }
 * ```
 */
export function isMainModule(metaOrUrl: ImportMeta | string): boolean {
  // 1. 若传入 import.meta 对象且包含 main 属性（Deno / Bun 原生支持）
  if (
    typeof metaOrUrl === "object" && metaOrUrl !== null && "main" in metaOrUrl
  ) {
    const mainProp = (metaOrUrl as { main?: unknown }).main;
    if (typeof mainProp === "boolean") {
      return mainProp;
    }
  }

  const currentModuleUrl = typeof metaOrUrl === "string"
    ? metaOrUrl
    : (metaOrUrl && typeof metaOrUrl.url === "string" ? metaOrUrl.url : "");

  if (IS_DENO) {
    // Deno 回退方案：当仅传入 URL 字符串时，比较 Deno.mainModule
    const deno = (globalThis as { Deno?: { mainModule?: string } }).Deno;
    if (!deno?.mainModule) return false;
    if (deno.mainModule === currentModuleUrl) return true;
    // JSR 远程入口兼容：Deno.mainModule 可能形如 "jsr:@dreamer/dweb@3.7.1/cli" 或 "jsr:@dreamer/dweb/cli"
    if (
      deno.mainModule.startsWith("jsr:") &&
      (currentModuleUrl.includes("/src/cli.ts") ||
        currentModuleUrl.includes("/cli")) &&
      deno.mainModule.includes("/cli")
    ) {
      return true;
    }
    return false;
  }

  // Bun/Node：process.argv[1] 是入口脚本路径（可能为相对/绝对路径，Windows 用反斜杠）
  const proc = (globalThis as { process?: { argv?: string[] } }).process;
  const entry = proc?.argv?.[1];
  if (!entry || !currentModuleUrl) return false;

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
