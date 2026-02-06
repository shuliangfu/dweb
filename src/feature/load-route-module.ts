/**
 * 路由模块加载（统一入口）
 *
 * 支持 .ts、.tsx（以及 .js/.jsx），走原生 import。
 * 开发模式下通过 cache-busting 参数绕过模块缓存，确保文件变更后刷新能拿到最新内容。
 *
 * SSR 时：若路由含 `import "*.css"`，Deno/Bun 原生不支持加载 CSS 模块，
 * 会剥离 CSS 导入、提取 CSS 内容（可选注入页面）、写入临时文件再加载。
 */

import { pathToFileURL } from "node:url";
import {
  cwd,
  dirname,
  getEnv,
  join,
  readTextFile,
  realPath,
  remove,
  writeTextFile,
} from "../core/runtime-adapter.ts";
import { $t } from "../utils/i18n.ts";
import { isPathWithinProject } from "../utils/path.ts";
import { getModuleVersion } from "./module-cache.ts";

/** 仅匹配 import "xxx.css" 或 import 'xxx.css' 形式的副作用导入（支持单双引号） */
const CSS_IMPORT_RE = /^\s*import\s+["'][^"']*\.css["']\s*;?\s*$/gm;

/** 提取 import 路径（用于读取 CSS 内容） */
const CSS_IMPORT_PATH_RE = /import\s+["']([^"']+\.css)["']/g;

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
 * @param filePath 文件路径（可为 file://、绝对或相对）
 * @param options.cssCollector 可选，收到每段 CSS 内容时调用，用于 SSR 注入到页面 head
 * @returns 模块对象，失败返回 null
 */
export async function loadRouteModule(
  filePath: string,
  options?: { cssCollector?: (css: string) => void },
): Promise<Record<string, unknown> | null> {
  const cwdPath = cwd();

  try {
    // 解析为绝对路径并校验在项目内，防止路径穿越
    let absPath: string;
    if (filePath.startsWith("file://")) {
      absPath = decodeURIComponent(new URL(filePath).pathname);
      if (absPath.match(/^\/[A-Za-z]:/)) absPath = absPath.slice(1);
    } else if (filePath.startsWith("/") || filePath.match(/^[A-Za-z]:/)) {
      absPath = await realPath(filePath);
    } else {
      absPath = await realPath(join(cwdPath, filePath));
    }
    if (!isPathWithinProject(absPath, cwdPath)) {
      console.warn(`${$t("log.pathMustBeInProject")}: ${filePath}`);
      return null;
    }

    let moduleUrl: string;
    let tempPath: string | null = null;

    const rawSource = await readTextFile(absPath);
    if (hasCssImport(rawSource)) {
      // 提取 CSS 路径并读取内容，供 SSR 注入到页面 head
      if (options?.cssCollector) {
        const cssPaths = extractCssImportPaths(rawSource);
        const routeDir = dirname(absPath);
        for (const p of cssPaths) {
          try {
            const cssAbsPath = await realPath(join(routeDir, p));
            if (isPathWithinProject(cssAbsPath, cwdPath)) {
              const cssContent = await readTextFile(cssAbsPath);
              options.cssCollector(cssContent);
            }
          } catch {
            // 忽略单个 CSS 读取失败
          }
        }
      }
      // 剥离 CSS 导入，写入同目录临时文件，保证相对导入解析正确
      const stripped = stripCssImports(rawSource);
      const dir = dirname(absPath);
      tempPath = join(dir, `.dweb-ssr-${Date.now()}-${Math.random().toString(36).slice(2)}.tsx`);
      await writeTextFile(tempPath, stripped);
      moduleUrl = pathToFileURL(tempPath).href;
    } else {
      moduleUrl = pathToFileURL(absPath).href;
    }

    // 开发模式：通过 ?t=version 绕过 import 缓存，确保文件变更后刷新能拿到最新内容
    const env = getEnv("DENO_ENV") || getEnv("BUN_ENV") || getEnv("NODE_ENV");
    if (env === "dev" && !tempPath) {
      const version = getModuleVersion(moduleUrl);
      moduleUrl = `${moduleUrl}?t=${version}`;
    }

    const mod = await import(moduleUrl);
    if (tempPath) {
      try {
        await remove(tempPath);
      } catch {
        // 忽略清理失败，模块已缓存
      }
    }
    return mod as Record<string, unknown>;
  } catch (error) {
    console.error(`${$t("log.loadModuleFailed")}: ${filePath}`, error);
    return null;
  }
}
