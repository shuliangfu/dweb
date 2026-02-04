/**
 * 构建输出目录推断工具
 *
 * 职责：
 * - 根据当前执行入口（main module）推断多应用下的 server/client 输出目录
 * - 与 app.ts 中 _buildServer 的推断规则一致，供 csr-client-builder 与 app 共用
 *
 * 规则：入口路径按 "/" 分割后的段数（不支持多级目录，仅支持一层应用目录）
 * - 段数 1：main.ts（无 src 目录）→ 单应用 → dist、dist/client
 * - 段数 2：src/main.ts、dist/server.js → 单应用 → dist、dist/client
 * - 段数 3：src/backend/main.ts、dist/backend/server.js → 多应用，应用名=第 2 段 → dist/<appDir>/client
 * - 段数 ≥4：抛出错误（不支持多级目录）
 */

import { cwd, relative, resolve } from "../core/runtime-adapter.ts";

/**
 * 获取当前执行的入口文件绝对路径（用于多应用构建时推断输出目录）
 *
 * Deno: mainModule；Bun/Node: process.argv[1]
 *
 * @returns 入口文件绝对路径，无法获取时返回 null
 */
export function getMainModulePath(): string | null {
  const g = globalThis as Record<string, unknown>;
  const deno = g.Deno as { mainModule?: string } | undefined;
  if (deno?.mainModule) {
    try {
      const url = new URL(deno.mainModule);
      if (url.protocol === "file:") {
        return url.pathname || null;
      }
    } catch {
      return null;
    }
  }
  const proc = g.process as { argv?: string[] } | undefined;
  const scriptPath = proc?.argv?.[1];
  if (scriptPath) {
    return resolve(cwd(), scriptPath);
  }
  return null;
}

/**
 * 根据当前入口文件推断 server 与 client 的构建输出目录（多应用时按应用目录区分）
 *
 * 支持入口路径段数 1（main.ts 无 src）、2（src/main.ts 单应用）、3（src/<app>/main.ts 多应用）。
 */
export function getInferredBuildOutputDirs(): {
  server: string;
  client: string;
} {
  const mainPath = getMainModulePath();
  let entry = "src/main.ts";
  if (mainPath) {
    const cwdPath = cwd();
    entry = relative(cwdPath, mainPath);
    if (entry.startsWith("..")) {
      entry = "./" + entry;
    } else if (!entry.startsWith(".")) {
      entry = "./" + entry;
    }
  }
  const parts = entry.replace(/^\.\/?/, "").split("/").filter(Boolean);
  if (parts.length < 1 || parts.length > 3) {
    throw new Error(
      `[dweb] 入口路径段数必须为 1–3，当前为 ${parts.length} 段: ${entry}。` +
        " 支持 main.ts（无 src）、src/main.ts（单应用）或 src/<应用名>/main.ts（多应用）。",
    );
  }
  const isSingleApp = parts.length === 1 || parts.length === 2;
  const appDirName = parts.length === 3 ? parts[1]! : "";
  const server = isSingleApp ? "./dist" : `./dist/${appDirName}`;
  const client = isSingleApp ? "dist/client" : `dist/${appDirName}/client`;
  return { server, client };
}
