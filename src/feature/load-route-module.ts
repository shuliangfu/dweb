/**
 * 路由模块加载（统一入口）
 *
 * 支持 .ts、.tsx（以及 .js/.jsx）。各引擎均走原生动态 `import`（含 View `.tsx`，依赖运行时/TS 配置）。
 * 开发模式下通过 cache-busting 参数绕过模块缓存，确保文件变更后刷新能拿到最新内容。
 *
 * SSR 时：若路由含 `import "*.css"`，Deno/Bun 原生不支持加载 CSS 模块，
 * 会剥离 CSS 导入、提取 CSS 内容（可选注入页面）、写入临时文件再加载。
 *
 * 优化：对含 CSS 导入的路由，按「剥离后源码 + CSS 内容」做内容哈希缓存，
 * 相同内容复用已加载模块，避免重复的读文件、写临时、import、删临时等磁盘 I/O。
 */

import type { Logger } from "@dreamer/logger";
import { pathToFileURL } from "node:url";
import {
  cwd,
  dirname,
  getEnv,
  hash,
  join,
  readTextFile,
  realPath,
  remove,
  resolve,
  writeTextFile,
} from "../core/runtime-adapter.ts";
import { getCacheOptions } from "../utils/constants.ts";
import { $tr } from "../utils/i18n.ts";
import { isPathWithinProject } from "../utils/path.ts";
import { getModuleVersion } from "./module-cache.ts";
import { resetViewSsrBundleShutdownInterruptFlag } from "./view-ssr-route-bundle.ts";

/** 仅匹配 import "xxx.css" 或 import 'xxx.css' 形式的副作用导入（支持单双引号） */
const CSS_IMPORT_RE = /^\s*import\s+["'][^"']*\.css["']\s*;?\s*$/gm;

/** 提取 import 路径（用于读取 CSS 内容） */
const CSS_IMPORT_PATH_RE = /import\s+["']([^"']+\.css)["']/g;

/** CSS 路由模块缓存：key = "path:contentHash", value = { module, cssContent } */
interface CssRouteCacheEntry {
  module: Record<string, unknown>;
  cssContent: string[];
}

const cssRouteCache = new Map<string, CssRouteCacheEntry>();

/**
 * 淘汰最早缓存条目，防止长期运行无界增长。
 * 容量由 getCacheOptions().maxCssRouteCacheSize 决定（默认 500，可由 config.build.devCache 覆盖）。
 */
function evictOldestCacheEntry(): void {
  const maxSize = getCacheOptions().maxCssRouteCacheSize;
  if (cssRouteCache.size <= maxSize) return;
  const firstKey = cssRouteCache.keys().next().value;
  if (firstKey !== undefined) {
    cssRouteCache.delete(firstKey);
  }
}

/**
 * 将路径规范化为绝对路径（与 module-cache 的 key 格式一致）
 */
function normalizePathForCache(pathOrUrl: string): string {
  let path = pathOrUrl;
  if (path.startsWith("file://")) {
    path = path.slice(7);
  }
  if (!path.startsWith("/") && !path.match(/^[A-Za-z]:/)) {
    path = resolve(cwd(), path);
  }
  return path.replace(/\\/g, "/");
}

/**
 * 文件变更时清除该路径相关的 CSS 路由缓存
 *
 * 当用户注释/取消注释 CSS 导入时，确保下次加载拿到最新内容，
 * 避免缓存返回旧的「有 CSS」或「无 CSS」的模块。
 *
 * @param changedPath 变更的文件路径（相对或绝对）
 */
export function clearCssRouteCacheForPath(changedPath: string): void {
  const normalized = normalizePathForCache(changedPath);
  for (const key of cssRouteCache.keys()) {
    if (key.startsWith(normalized + ":")) {
      cssRouteCache.delete(key);
    }
  }
}

/**
 * 转发至 View SSR bundle 缓存清理（与 `clearCssRouteCacheForPath` 一起在 HMR 时调用）
 */
export { clearViewSsrBundleCacheForPath } from "./view-ssr-route-bundle.ts";

/**
 * 从源码中提取 CSS 导入路径
 *
 * @param source 原始源码
 * @returns 导入路径数组（如 ["../assets/index.css"]）
 */
function extractCssImportPaths(source: string): string[] {
  const paths: string[] = [];
  let m: RegExpExecArray | null;
  CSS_IMPORT_PATH_RE.lastIndex = 0;
  while ((m = CSS_IMPORT_PATH_RE.exec(source)) !== null) {
    paths.push(m[1]);
  }
  return paths;
}

/**
 * 从源码中移除 CSS 导入行
 *
 * Deno/Bun 不支持将 CSS 作为模块导入，SSR 加载路由时需先剥离这些导入。
 * 客户端构建由 esbuild 的 css-import-handler 处理。
 *
 * @param source 原始源码
 * @returns 剥离 CSS 导入后的源码
 */
function stripCssImports(source: string): string {
  return source.replace(CSS_IMPORT_RE, "");
}

/**
 * 检查源码是否包含 CSS 导入
 *
 * @param source 源码
 * @returns 是否包含 CSS 导入
 */
function hasCssImport(source: string): boolean {
  CSS_IMPORT_RE.lastIndex = 0;
  return CSS_IMPORT_RE.test(source);
}

/**
 * 计算路由模块的内容哈希（用于缓存 key）
 *
 * 包含：剥离 CSS 后的源码 + 各 CSS 文件内容（按路径排序保证确定性）
 *
 * @param strippedSource 剥离 CSS 导入后的源码
 * @param cssEntries 按路径排序的 [path, content] 数组
 * @returns 内容哈希字符串
 */
async function computeContentHash(
  strippedSource: string,
  cssEntries: Array<[string, string]>,
): Promise<string> {
  const parts: string[] = [strippedSource];
  for (const [_path, content] of cssEntries) {
    parts.push(content);
  }
  return await hash(parts.join("\0"));
}

/**
 * 加载路由模块（页面/布局/App/Error 等）
 *
 * 开发模式下，文件变更后 invalidateModule 会更新版本，
 * 下次加载时通过 ?t=version 绕过 Deno/Bun 的 import 缓存，拿到最新内容。
 *
 * 路径校验：禁止 ../ 等路径穿越，仅加载项目目录内的模块。
 *
 * 若路由含 CSS 导入：SSR 时剥离导入、可选通过 cssCollector 提取内容注入页面、
 * 写入临时文件再 import，避免 Deno/Bun 尝试加载 CSS 模块导致报错。
 *
 * 优化：相同内容（源码 + CSS）复用缓存，避免重复的临时文件读写与 import。
 *
 * @param filePath 文件路径（可为 file://、绝对或相对）
 * @param options.cssCollector 可选，收到每段 CSS 内容时调用，用于 SSR 注入到页面 head
 * @param options.logger 可选，失败时用 logger.error 输出，便于日志聚合；未传则用 console.error
 * @param options.routesDirPath 可选；若传入绝对路径，则以其**父目录**作为「允许加载」的路径安全边界
 * （与仅 `cwd()` 相比，在测试并发 `chdir` 时更稳）；**不**改变相对路径解析基准（仍为 `cwd()`）。
 * @returns 模块对象，失败返回 null
 *
 * 错误边界约定：失败时不抛错，仅返回 null 并记录日志（logger 或 console）。
 * 由调用方决定返回 404、降级渲染或其它处理，避免静默吞错导致排查困难。
 */
export async function loadRouteModule(
  filePath: string,
  options?: {
    cssCollector?: (css: string) => void;
    logger?: Logger;
    /** 渲染引擎（react / preact / view） */
    engine?: "react" | "preact" | "view";
    /** View SSR bundle 用：routes 目录绝对路径（未传时默认 `cwd()/src/routes`） */
    routesDirPath?: string;
  },
): Promise<Record<string, unknown> | null> {
  const cwdPath = cwd();
  /**
   * 模块文件安全边界：
   * - 未传 `routesDirPath` 时回退 `cwd()`；
   * - 传入时使用 `routesDirPath` 本身（通常为 `.../src/routes` 或其子目录）。
   *
   * 说明：此前统一用 `routesDirPath/..` 作为根，在 Windows + Bun 的短路径/长路径混用下，
   * 反而更容易把本应合法的 `routes/*.tsx` 误判为项目外。
   */
  const pathSecurityRoot = (() => {
    const routesDir = options?.routesDirPath;
    if (!routesDir || typeof routesDir !== "string" || !routesDir.trim()) {
      return cwdPath;
    }
    return resolve(routesDir.replace(/\\/g, "/"));
  })();
  /**
   * CSS 依赖允许范围：相对模块可访问到 routes 同级（如 `../assets/*.css`），
   * 因此较模块边界放宽一级目录。
   */
  const cssSecurityRoot = resolve(pathSecurityRoot, "..");
  // 统一为正向斜杠，避免 Windows 下 realPath/pathToFileURL 因反斜杠导致解析差异
  const pathInput = filePath.replace(/\\/g, "/");

  try {
    /** 避免上一条路由在关闭中设置的标记污染本次结果 */
    resetViewSsrBundleShutdownInterruptFlag();
    // 解析为绝对路径并校验在项目内，防止路径穿越
    let absPath: string;
    if (pathInput.startsWith("file://")) {
      absPath = decodeURIComponent(new URL(pathInput).pathname);
      if (absPath.match(/^\/[A-Za-z]:/)) absPath = absPath.slice(1);
    } else if (pathInput.startsWith("/") || pathInput.match(/^[A-Za-z]:/)) {
      absPath = await realPath(pathInput);
    } else {
      absPath = await realPath(join(cwdPath, pathInput));
    }

    if (!isPathWithinProject(absPath, pathSecurityRoot)) {
      console.warn(`${$tr("log.pathMustBeInProject")}: ${filePath}`);
      return null;
    }

    const normalizedPath = absPath.replace(/\\/g, "/");
    let moduleUrl: string;
    let tempPath: string | null = null;

    const rawSource = await readTextFile(absPath);
    if (hasCssImport(rawSource)) {
      // 提取 CSS 路径并读取内容（按路径排序保证哈希确定性）
      const cssPaths = extractCssImportPaths(rawSource);
      const routeDir = dirname(absPath);
      const cssEntries: Array<[string, string]> = [];
      for (const p of cssPaths.sort()) {
        try {
          const cssAbsPath = await realPath(join(routeDir, p));
          if (isPathWithinProject(cssAbsPath, cssSecurityRoot)) {
            const cssContent = await readTextFile(cssAbsPath);
            cssEntries.push([p, cssContent]);
          }
        } catch {
          // 忽略单个 CSS 读取失败
        }
      }

      const stripped = stripCssImports(rawSource);
      const contentHash = await computeContentHash(stripped, cssEntries);
      const cacheKey = `${normalizedPath}:${contentHash}`;

      // 检查缓存：相同内容直接返回，避免写临时文件、import、删除
      const cached = cssRouteCache.get(cacheKey);
      if (cached) {
        if (options?.cssCollector) {
          for (const css of cached.cssContent) {
            options.cssCollector(css);
          }
        }
        return cached.module;
      }

      // 缓存未命中：写入临时文件、import、缓存结果
      const dir = dirname(absPath);
      const tempFile = `.dweb-ssr-${Date.now()}-${
        Math.random().toString(36).slice(2)
      }.tsx`;

      tempPath = join(dir, tempFile);

      try {
        await writeTextFile(tempPath, stripped);
        // Windows：用正向斜杠生成 file URL，避免动态 import 解析差异
        moduleUrl = pathToFileURL(tempPath.replace(/\\/g, "/")).href;
        const mod = (await import(moduleUrl)) as Record<string, unknown>;
        if (!mod) {
          return null;
        }

        // 收集 CSS 内容（与 cssEntries 顺序一致）
        const cssContent = cssEntries.map(([, c]) => c);

        // 写入缓存并淘汰旧条目
        cssRouteCache.set(cacheKey, { module: mod, cssContent });
        evictOldestCacheEntry();

        if (options?.cssCollector) {
          for (const css of cssContent) {
            options.cssCollector(css);
          }
        }
        return mod;
      } finally {
        // 确保临时文件被清理，避免异常时残留
        if (tempPath) {
          try {
            await remove(tempPath);
          } catch {
            // 忽略清理失败，模块已缓存
          }
        }
      }
    }

    moduleUrl = pathToFileURL(normalizedPath).href;

    // 开发模式：通过 ?v=version 绕过 import 缓存，确保文件变更后能拿到最新模块
    // 仅 RUNTIME_ENV=dev 禁用 import 缓存（与其它「开发态」判断一致）
    if (getEnv("RUNTIME_ENV") === "dev") {
      const version = getModuleVersion(moduleUrl);
      moduleUrl = `${moduleUrl}?v=${version}`;
    }
    const mod = await import(moduleUrl);
    return mod as Record<string, unknown>;
  } catch (error) {
    console.error(error);
    const msg = `${$tr("log.loadModuleFailed")}: ${filePath}`;
    if (options?.logger) {
      options.logger.error(msg, error);
    } else {
      console.error(msg, error);
    }
    return null;
  }
}
