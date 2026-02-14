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

import {
  cwd,
  getEnv,
  hash,
  join,
  relative,
  resolve,
} from "../core/runtime-adapter.ts";
import { DwebErrorCode, throwDwebError } from "./errors.ts";
import { $t } from "./i18n.ts";
import { isWindows } from "./runtime.ts";

/**
 * 将 file:// URL 的 pathname 转为可用的文件系统路径（Windows 兼容）
 *
 * Windows 下 pathname 可能为 /C:/Users/... 或含 URL 编码字符，
 * 需去除首斜杠、解码，以便与 cwd() 正确计算 relative。
 */
function pathnameToFsPath(pathname: string): string {
  let p = decodeURIComponent(pathname);
  // Windows: pathname 常为 /C:/Users/...，需去掉首斜杠以便与 cwd 格式一致
  if (
    isWindows() && p.length >= 3 && p.startsWith("/") && /^\/[A-Za-z]:/.test(p)
  ) {
    p = p.slice(1);
  }
  return p.replace(/\\/g, "/");
}

/**
 * 抛出入口路径格式错误
 *
 * @param path 当前路径
 * @param reason 错误原因（i18n 键或已翻译字符串）
 */
function throwEntryPathError(path: string, reason: string): never {
  throwDwebError(DwebErrorCode.ENTRY_PATH_INVALID, {
    reason,
    hint: $t("errors.entryPathInvalidHint"),
    path,
  });
}

/**
 * 从超长路径中提取符合规则的入口相对路径（1–3 段）
 *
 * 当 relative() 在 Windows 等环境下产生过多 ../ 段时，
 * 从路径末尾匹配 src/main.ts、src/<app>/main.ts、<app>/main.ts 或 main.ts。
 * 优先识别 src/main.ts（单应用），避免将项目名误判为应用名。
 */
function extractEntryFromLongPath(fullPath: string): string | null {
  const normalized = fullPath.replace(/\\/g, "/").replace(/^\.\/?/, "");
  const parts = normalized.split("/").filter(Boolean);
  const mainIdx = parts.lastIndexOf("main.ts");
  if (mainIdx < 0) {
    throwEntryPathError(fullPath, $t("errors.entryPathInvalidReasonNoMainTs"));
  }
  // src/x/y/main.ts 等 4 段以上结构不支持，不提取
  if (mainIdx >= 3 && parts[mainIdx - 3] === "src") {
    throwEntryPathError(
      fullPath,
      $t("errors.entryPathInvalidReasonMultiLevelSrc"),
    );
  }
  let start: number;
  if (mainIdx >= 2 && parts[mainIdx - 2] === "src") {
    // src/<app>/main.ts（多应用有 src）
    start = mainIdx - 2;
  } else if (mainIdx >= 1 && parts[mainIdx - 1] === "src") {
    // src/main.ts（单应用有 src），或 <项目名>/src/main.ts
    start = mainIdx - 1;
  } else if (mainIdx >= 1) {
    // <app>/main.ts（多应用无 src）
    start = mainIdx - 1;
  } else {
    start = mainIdx; // main.ts（单应用无 src）
  }
  const slice = parts.slice(start, mainIdx + 1);
  if (slice.length >= 1 && slice.length <= 3) {
    return slice.join("/");
  }
  throwEntryPathError(
    fullPath,
    $t("errors.entryPathInvalidReasonSegmentCount", {
      count: String(slice.length),
    }),
  );
}

/**
 * 获取当前执行的入口文件绝对路径（用于多应用构建时推断输出目录）
 *
 * Deno: mainModule；Bun: Bun.main（绝对路径）；Node: process.argv[1]
 *
 * 注：Bun 下 process.argv[1] 在 `bun run` 时可能为 "run" 而非脚本路径，
 * 需优先使用 Bun.main 获取入口绝对路径。
 *
 * @returns 入口文件绝对路径，无法获取时返回 null
 *
 * @example
 * ```ts
 * const path = getMainModulePath();
 * if (path) console.log("入口:", path);
 * ```
 */
export function getMainModulePath(): string | null {
  const g = globalThis as Record<string, unknown>;
  const deno = g.Deno as { mainModule?: string } | undefined;
  if (deno?.mainModule) {
    try {
      const url = new URL(deno.mainModule);
      if (url.protocol === "file:") {
        const pathname = url.pathname || "";
        if (!pathname) return null;
        return pathnameToFsPath(pathname);
      }
    } catch {
      return null;
    }
  }
  const bun = g.Bun as { main?: string } | undefined;
  if (bun?.main) {
    return pathnameToFsPath(
      bun.main.startsWith("file://") ? new URL(bun.main).pathname : bun.main,
    );
  }
  const proc = g.process as { argv?: string[] } | undefined;
  const scriptPath = proc?.argv?.[1];
  if (scriptPath && !scriptPath.startsWith("-") && scriptPath !== "run") {
    return resolve(cwd(), scriptPath);
  }
  return null;
}

/**
 * 根据入口路径推断 server 与 client 的构建输出目录（多应用时按应用目录区分）
 *
 * @param overrideEntry 可选，用于测试或显式指定入口路径；未提供时从 getMainModulePath() 获取
 * @returns 包含 server、client 输出目录的对象
 * @throws {Error} 入口路径段数不在 1–3 范围内时抛出
 *
 * @example
 * ```ts
 * const { server, client } = getInferredBuildOutputDirs();
 * // 单应用: server="./dist", client="dist/client"
 * // 多应用 src/backend/main.ts: server="./dist/backend", client="dist/backend/client"
 * ```
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
  // Windows 兼容：先将反斜杠转为正斜杠，避免 split("/") 在 Windows 路径下分段错误
  let parts = entry.replace(/\\/g, "/").replace(/^\.\/?/, "").split("/")
    .filter(Boolean);

  // Windows 等环境下 relative() 可能产生过多 ../ 段，尝试从路径中提取有效入口
  if (parts.length > 3) {
    const extracted = extractEntryFromLongPath(entry);
    if (extracted) {
      parts = extracted.split("/").filter(Boolean);
    }
  }

  if (parts.length < 1 || parts.length > 3) {
    throwEntryPathError(
      entry,
      $t("errors.entryPathInvalidReasonSegmentCount", {
        count: String(parts.length),
      }),
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

/**
 * 获取 dweb 框架的客户端构建缓存目录
 *
 * 路径：~/.dreamer/{projectHash}/{appDir}/client-out
 * - projectHash：项目目录绝对路径的 SHA-256 前 16 位，避免不同项目冲突
 * - appDir：多应用时应用名（如 backend），单应用为 "default"
 *
 * @returns 缓存目录绝对路径
 *
 * @example
 * ```ts
 * const cacheDir = await getDreamerClientCacheDir();
 * // => "/home/user/.dreamer/a1b2c3d4e5f6g7h8/default/client-out"
 * ```
 */
export async function getDreamerClientCacheDir(): Promise<string> {
  const home = getEnv("HOME") ?? getEnv("USERPROFILE");
  if (!home) {
    throwDwebError(DwebErrorCode.DREAMER_CACHE_HOME_UNAVAILABLE);
  }
  const projectAbs = resolve(cwd());
  const projectHash = (await hash(projectAbs, "SHA-256")).slice(0, 16);
  const { client } = getInferredBuildOutputDirs();
  const parts = client.replace(/\\/g, "/").split("/");
  const appDir = parts.length === 2 ? "default" : (parts[1] ?? "default");
  return join(home, ".dreamer", projectHash, appDir, "client-out");
}

/**
 * 获取 dweb 框架缓存目录（~/.dreamer/dweb）
 *
 * 用于存放框架级缓存。
 * 无法获取 HOME/USERPROFILE 时返回空字符串，调用方需做判空。
 *
 * @returns 绝对路径或 ""
 */
export function getDreamerDwebCacheDir(): string {
  const home = getEnv("HOME") ?? getEnv("USERPROFILE") ??
    getEnv("LOCALAPPDATA");
  if (!home) return "";
  return join(home, ".dreamer", "dweb");
}
