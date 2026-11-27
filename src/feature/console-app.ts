/**
 * Console 应用入口加载（console/main.ts）
 *
 * `dweb-cli run` 在构造/启动 App 之前加载该文件：
 * - 若导出 App 实例（default 或 `app`），则使用它（可在入口配置中间件和插件）
 * - 若 default 是工厂函数，则调用后取返回的 App
 * - 否则回退为由 CLI 按 config 目录自行 `new App({ kind: "console" })`
 *
 * 加载前须调用 {@link setConsoleConfigDirectoryOverride}，这样入口里
 * `new App({ kind: "console" })` 会自动合并 `<consoleRoot>/config`。
 */

import { pathToFileURL } from "node:url";
import { exists, join, readTextFile } from "@dreamer/runtime-adapter";
import type { App } from "../core/app.ts";
import { perfMark } from "../utils/perf-trace.ts";

/** 鸭子类型判断，避免静态导入 App 拖入 HTTP/渲染依赖 */
export function isConsoleAppInstance(value: unknown): value is App {
  if (value == null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.start === "function" &&
    typeof v.shutdown === "function" &&
    typeof v.container === "object" &&
    v.container != null;
}

/**
 * 粗扫描源码，判断是否像可加载的 Console 入口。
 * 仅有 `console.log` 的历史占位文件不会被 import，避免副作用输出。
 */
export function looksLikeConsoleAppEntry(source: string): boolean {
  const hasExport = /\bexport\s+default\b/.test(source) ||
    /\bexport\s+\{[^}]*\bapp\b/.test(source);
  if (!hasExport) return false;
  return /\bApp\b/.test(source) ||
    /\bexport\s+default\s+app\b/.test(source) ||
    /\bregisterPlugin\b/.test(source) ||
    /\.use\s*\(/.test(source);
}

async function resolveExportedApp(
  mod: Record<string, unknown>,
): Promise<App | null> {
  const candidates = [mod.default, mod.app];
  for (const raw of candidates) {
    if (isConsoleAppInstance(raw)) return raw;
    if (typeof raw === "function") {
      const produced = await (raw as () => unknown | Promise<unknown>)();
      if (isConsoleAppInstance(produced)) return produced;
    }
  }
  return null;
}

/**
 * 若 `consoleRoot/main.ts`（或 main.js）是真正的 App 入口则加载并返回实例，否则返回 null。
 */
export async function loadConsoleAppEntry(
  consoleRoot: string,
): Promise<App | null> {
  for (const name of ["main.ts", "main.js"]) {
    const full = join(consoleRoot, name);
    if (!(await exists(full))) continue;
    let source = "";
    try {
      source = await readTextFile(full);
    } catch {
      continue;
    }
    if (!looksLikeConsoleAppEntry(source)) {
      return null;
    }
    perfMark("console_entry_import");
    const mod = await import(pathToFileURL(full).href) as Record<
      string,
      unknown
    >;
    perfMark("console_entry_imported");
    return await resolveExportedApp(mod);
  }
  return null;
}
