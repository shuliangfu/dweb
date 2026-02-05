/**
 * 构建输出目录推断工具
 *
 * 职责：
 * - 根据当前执行入口（main module）推断多应用下的 server/client 输出目录
 * - 与 app.ts 中 _buildServer 的推断规则一致，供 csr-client-builder 与 app 共用
 *
 * 规则：入口路径按 "/" 分割后的段数（不支持多级目录，仅支持一层应用目录）
 * - 段数 1：main.ts（无 src 目录）→ 单应用 → dist、dist/client
 * - 段数 2：
 *   - src/main.ts → 单应用 → dist、dist/client
 *   - <app>/main.ts（无 src，如 backend/main.ts）→ 多应用 → dist/<app>、dist/<app>/client
 * - 段数 3：src/<app>/main.ts → 多应用 → dist/<app>、dist/<app>/client
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
 * 根据入口路径推断 server 与 client 的构建输出目录（多应用时按应用目录区分）
 *
 * @param overrideEntry 可选，用于测试或显式指定入口路径；未提供时从 getMainModulePath() 获取
 *
 * 支持入口路径段数 1（main.ts 无 src）、2（src/main.ts 单应用 或 <app>/main.ts 多应用）、3（src/<app>/main.ts 多应用）。
 */
export function getInferredBuildOutputDirs(overrideEntry?: string): {
  server: string;
  client: string;
} {
  let entry: string;
  if (overrideEntry != null) {
    entry = overrideEntry.startsWith(".")
      ? overrideEntry
      : "./" + overrideEntry;
  } else {
    entry = "src/main.ts";
    const mainPath = getMainModulePath();
    if (mainPath) {
      const cwdPath = cwd();
      entry = relative(cwdPath, mainPath);
      if (entry.startsWith("..")) {
        entry = "./" + entry;
      } else if (!entry.startsWith(".")) {
        entry = "./" + entry;
      }
    }
  }
  const parts = entry.replace(/^\.\/?/, "").split("/").filter(Boolean);
  if (parts.length < 1 || parts.length > 3) {
    throw new Error(
      `[dweb] 入口路径段数必须为 1–3，当前为 ${parts.length} 段: ${entry}。` +
        " 支持 main.ts（无 src）、src/main.ts（单应用）、<app>/main.ts（多应用无 src）或 src/<应用名>/main.ts（多应用）。",
    );
  }
  // 特殊：运行构建产物时（<outputDir>/server.js 或 <outputDir>/<app>/server.js）
  // outputDir 为用户配置的 build.server.output 根目录（如 dist、build、output 等）
  // 否则 Tailwind 等插件的 clientAssetsDir 会指向错误路径，导致 findCssFile 找不到文件
  const lastPart = parts[parts.length - 1] ?? "";
  const isBuiltServer = lastPart === "server.js" || lastPart === "server";
  if (isBuiltServer) {
    const outputDir = parts[0]!; // 用户配置的输出根目录
    const isSingleAppBuilt = parts.length === 2; // <outputDir>/server.js
    const appDirNameBuilt = parts.length === 3 ? parts[1]! : "";
    return {
      server: isSingleAppBuilt
        ? `./${outputDir}`
        : `./${outputDir}/${appDirNameBuilt}`,
      client: isSingleAppBuilt
        ? `${outputDir}/client`
        : `${outputDir}/${appDirNameBuilt}/client`,
    };
  }
  // 段数 1：main.ts → 单应用
  // 段数 2：src/main.ts → 单应用；<app>/main.ts（如 backend/main.ts）→ 多应用
  // 段数 3：src/<app>/main.ts → 多应用
  const isSingleApp = parts.length === 1 ||
    (parts.length === 2 && parts[0] === "src");
  const appDirName = parts.length === 3
    ? parts[1]!
    : (parts.length === 2 && parts[0] !== "src")
    ? parts[0]!
    : "";
  const server = isSingleApp ? "./dist" : `./dist/${appDirName}`;
  const client = isSingleApp ? "dist/client" : `dist/${appDirName}/client`;
  return { server, client };
}
