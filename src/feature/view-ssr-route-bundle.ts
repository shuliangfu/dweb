/**
 * View 引擎：在已配置非空 `render.compiler` 时，服务端加载 `.tsx` 路由走与客户端一致的 esbuild + compileSource 管线。
 *
 * 解决原生 `import(.tsx)` 不经 jsx-compiler 时内置 JSX 指令与 CSR 语义不一致的问题；
 * 与 `createViewClientTsxPlugin` 共用编译逻辑，但 `stripLoadInRoutes: false` 以保留 `load` 导出。
 *
 * @module dweb/feature/view-ssr-route-bundle
 */

import { BuilderClient, type ClientConfig } from "@dreamer/esbuild";
import type { Logger } from "@dreamer/logger";
import {
  cwd,
  dirname,
  ensureDir,
  exists,
  hash,
  join,
  pathToFileUrl,
  readTextFile,
  realPath,
  remove,
  resolve,
  writeTextFile,
} from "../core/runtime-adapter.ts";
import { isPathWithinProject } from "../utils/path.ts";
import { getModuleVersion } from "./module-cache.ts";
import { createViewClientTsxPlugin } from "./view-tsx-compile-plugin.ts";

/**
 * 与 `load-route-module` 一致：仅匹配副作用 `import "*.css"` / `import '*.css'`（用于磁盘缓存指纹）
 */
const CSS_IMPORT_RE_FP = /^\s*import\s+["'][^"']*\.css["']\s*;?\s*$/gm;
/** 提取 import 路径 */
const CSS_IMPORT_PATH_RE_FP = /import\s+["']([^"']+\.css)["']/g;

/**
 * 从源码提取 `.css` 导入路径（与 load-route-module 逻辑一致）
 *
 * @param source - 路由源全文
 */
function extractCssPathsForDiskFingerprint(source: string): string[] {
  const paths: string[] = [];
  let m: RegExpExecArray | null;
  CSS_IMPORT_PATH_RE_FP.lastIndex = 0;
  while ((m = CSS_IMPORT_PATH_RE_FP.exec(source)) !== null) {
    paths.push(m[1]);
  }
  return paths;
}

/**
 * 剥离 CSS 导入行后的 tsx 源码
 *
 * @param source - 原始源码
 */
function stripCssImportsForDiskFingerprint(source: string): string {
  return source.replace(CSS_IMPORT_RE_FP, "");
}

/**
 * 是否包含 CSS 副作用导入
 *
 * @param source - 源码
 */
function hasCssImportForDiskFingerprint(source: string): boolean {
  CSS_IMPORT_RE_FP.lastIndex = 0;
  return CSS_IMPORT_RE_FP.test(source);
}

/**
 * 磁盘缓存文件名用指纹：基于**逻辑路由文件**原文（无 CSS 时整文件；有 CSS 时为「剥离后的 tsx + 各 CSS 文件内容」，与 `load-route-module` 的 contentHash 材料一致）。
 *
 * @param identityResolvedNorm - `cacheIdentityPath` 规范化后的绝对路径（正斜杠）
 */
async function computeViewSsrBundleDiskFingerprint(
  identityResolvedNorm: string,
): Promise<string> {
  const rawSource = await readTextFile(identityResolvedNorm);
  if (!hasCssImportForDiskFingerprint(rawSource)) {
    return await hash(rawSource);
  }
  const routeDir = dirname(identityResolvedNorm);
  const cssPaths = extractCssPathsForDiskFingerprint(rawSource);
  const cssEntries: Array<[string, string]> = [];
  for (const p of cssPaths.sort()) {
    try {
      const cssAbsPath = (await realPath(join(routeDir, p))).replace(
        /\\/g,
        "/",
      );
      if (isPathWithinProject(cssAbsPath, cwd())) {
        const cssContent = await readTextFile(cssAbsPath);
        cssEntries.push([p, cssContent]);
      }
    } catch {
      /* 单个 CSS 读取失败则跳过，与 load-route-module 一致 */
    }
  }
  const stripped = stripCssImportsForDiskFingerprint(rawSource);
  const parts: string[] = [stripped];
  for (const [, content] of cssEntries) {
    parts.push(content);
  }
  return await hash(parts.join("\0"));
}

/**
 * 内存缓存：规范化入口路径 + 模块版本 → 已 import 的命名空间（避免重复 esbuild 与同 URL 缓存问题）
 */
const viewSsrBundledModuleCache = new Map<string, Record<string, unknown>>();

/**
 * 判断是否为「关闭进程 / SIGINT」时 esbuild 已先退出导致的管道错误。
 *
 * 用户 Ctrl+C 后，预热或路由打包仍可能在 `await builder.build()` 中；子进程或 IPC 已关，
 * 主进程侧写入会触发 `write EPIPE`，esbuild 封装为 `The service was stopped`，属预期竞态，不应打 ERROR。
 *
 * @param err - `catch` 到的值
 */
function isLikelyEsbuildShutdownInterruption(err: unknown): boolean {
  if (err instanceof Error) {
    const m = `${err.message}\n${
      err.cause instanceof Error ? err.cause.message : ""
    }`;
    return /EPIPE|service was stopped/i.test(m);
  }
  return /EPIPE|service was stopped/i.test(String(err));
}

/**
 * 最近一次 `loadViewRouteModuleViaSsrBundle` 是否因关闭进程导致 esbuild 中断（供预热循环决定是否停止扫文件）
 */
let viewSsrBundleShutdownInterruptPending = false;

/**
 * 每次开始加载路由模块时应调用，避免沿用上一条路由的「关闭中」标记
 */
export function resetViewSsrBundleShutdownInterruptFlag(): void {
  viewSsrBundleShutdownInterruptPending = false;
}

/**
 * 取出并清除「因 SIGINT/关闭导致 bundle 失败」标记（仅在为 true 时表示刚发生过）
 */
export function consumeViewSsrBundleShutdownInterruptFlag(): boolean {
  const v = viewSsrBundleShutdownInterruptPending;
  viewSsrBundleShutdownInterruptPending = false;
  return v;
}

/**
 * View SSR 单包在磁盘上的缓存根：当前项目根下 `runtime/cache/`（与进程 `cwd()` 一致）。
 * 子目录 **`bundle-out`**（esbuild `output`）、**`bundle-cache`**（写入 **`entry-{原始路由源指纹}.mjs`**：无 CSS 时为 `.tsx` 全文哈希；有 `import '*.css'` 时为剥离后的 tsx + 各 CSS 原文拼接后哈希，与 `load-route-module` 一致；命中磁盘时可跳过 esbuild）。
 * 将 `.mjs` 放在项目树内，便于 Bun 从项目 `node_modules` 解析 bundle 内 **external** 的 `@dreamer/view` 等；
 * init 模板已忽略整个 `runtime/` 目录。
 *
 * @returns `outDir`（bundle-out）、`cacheDir`（bundle-cache）
 */
export function getViewSsrBundleDiskCacheDirs(): {
  outDir: string;
  cacheDir: string;
} {
  const root = join(cwd(), "runtime", "cache");
  return {
    outDir: join(root, "bundle-out"),
    cacheDir: join(root, "bundle-cache"),
  };
}

/**
 * 清空 View SSR bundle 内存 Map（`loadViewRouteModuleViaSsrBundle` 缓存）。
 */
export function clearViewSsrBundledModuleMemoryCache(): void {
  viewSsrBundledModuleCache.clear();
}

/**
 * 递归删除 `runtime/cache/bundle-cache` 与 `bundle-out`（不存在则跳过）。
 */
export async function removeViewSsrBundleDiskCacheDirs(): Promise<void> {
  const { outDir, cacheDir } = getViewSsrBundleDiskCacheDirs();
  for (const dir of [cacheDir, outDir]) {
    try {
      if (await exists(dir)) {
        await remove(dir, { recursive: true });
      }
    } catch {
      /* 占用或权限：不阻断停止 */
    }
  }
}

/**
 * 从 esbuild 内存产出中选取主入口 JS（单 chunk、无代码分割时通常仅一条 .js）
 *
 * @param outputs - BuilderClient build(write:false) 的 outputContents
 * @returns 主 bundle 文本，未找到则 null
 */
function pickMainJsFromOutputContents(
  outputs: Array<{ path: string; text: string }> | undefined,
): string | null {
  if (!outputs?.length) return null;
  const jsFiles = outputs.filter(
    (f) =>
      f.path.endsWith(".js") &&
      !f.path.endsWith(".map") &&
      !f.path.includes(".css"),
  );
  if (jsFiles.length === 0) return null;
  if (jsFiles.length === 1) return jsFiles[0]!.text;
  // 多文件时优先不含 chunk 命名的主入口，否则取最长文本（通常为主包）
  const nonChunk = jsFiles.find((f) => !/chunk|split/i.test(f.path));
  if (nonChunk) return nonChunk.text;
  return jsFiles.sort((a, b) => b.text.length - a.text.length)[0]!.text;
}

/**
 * 使用 esbuild（与客户端相同的 View 编译插件）将单入口打成单文件 ESM，再动态 import 加载。
 *
 * @param entryAbsPath - 路由 / 布局 / _app 的绝对路径（.tsx）；可为剥离 CSS 后的临时文件
 * @param routesDirPath - 应用 routes 目录绝对路径（与 `loadRouteModule` 调用约定一致；SSR bundle 内不再用于插件）
 * @param options.logger - 可选，构建失败时记录
 * @param options.cacheIdentityPath - 可选；含 CSS 时入口为临时文件，应传**真实路由文件**绝对路径，使缓存键与 `getModuleVersion` 与源文件一致
 * @param options.compileRoots - 非空；与 `normalizeRenderCompiler(render.compiler)` 一致，仅这些根下 `.tsx` 走 `compileSource`
 * @returns 模块命名空间对象（与 `import()` 一致），失败返回 null
 *
 * **磁盘缓存**：`bundle-cache/entry-{hash(原始输入指纹)}.mjs`（SHA-256 十六进制）；指纹来自逻辑路由 `.tsx`（及关联 CSS 原文），非编译产物。
 */
export async function loadViewRouteModuleViaSsrBundle(
  entryAbsPath: string,
  _routesDirPath: string,
  options: {
    logger?: Logger;
    cacheIdentityPath?: string;
    /** 非空绝对路径根列表（与 `normalizeRenderCompiler(render.compiler)` 一致） */
    compileRoots: string[];
  },
): Promise<Record<string, unknown> | null> {
  const entryResolved = (resolve(entryAbsPath)).replace(/\\/g, "/");

  /** 与 module-cache、HMR 版本号对齐的「逻辑」路径（非临时入口） */
  const identityResolved = (resolve(options?.cacheIdentityPath ?? entryAbsPath))
    .replace(
      /\\/g,
      "/",
    );

  const fileUrlForVersion = pathToFileUrl(identityResolved);
  const ver = getModuleVersion(fileUrlForVersion);
  const cacheKey = `${identityResolved}@@${ver}`;

  const cached = viewSsrBundledModuleCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { outDir, cacheDir } = getViewSsrBundleDiskCacheDirs();
  try {
    await ensureDir(outDir);
    await ensureDir(cacheDir);
  } catch {
    /* 目录已存在等可忽略 */
  }

  /** 供 catch 日志；算出源指纹后赋值 */
  let diskPath: string | undefined;

  try {
    const sourceFingerprint = await computeViewSsrBundleDiskFingerprint(
      identityResolved,
    );
    const diskName = `entry-${sourceFingerprint}.mjs`;
    diskPath = join(cacheDir, diskName);

    /** 磁盘已有与当前源指纹一致的产物则直接 import，跳过 esbuild */
    if (await exists(diskPath)) {
      const importUrl = `${pathToFileUrl(diskPath)}?v=${ver}`;
      const mod = (await import(importUrl)) as Record<string, unknown>;
      viewSsrBundledModuleCache.set(cacheKey, mod);
      return mod;
    }

    const builder = new BuilderClient({
      entry: entryResolved,
      output: outDir,
      engine: "view",
      /** 服务端动态 import 的 ESM：jsr/npm external + node 平台，避免按浏览器包解析 runtime-adapter 的 node:* 与 JSON */
      serverSideRouteBundle: true,
      sourcemap: false,
      bundle: {
        splitting: false,
        minify: false,
        sourcemap: false,
        format: "esm",
      },
      cssImport: {
        enabled: true,
        extract: false,
        cssOnly: true,
      },
      plugins: [
        createViewClientTsxPlugin({
          stripLoadInRoutes: false,
          compileRoots: options.compileRoots,
        }),
      ],
      /** 1.1.5+ BuilderClient 字段；待发版后 JSR 类型含 `serverSideRouteBundle` 时可去掉断言 */
    } as ClientConfig);

    const result = await builder.build({ mode: "prod", write: false });
    const code = pickMainJsFromOutputContents(result.outputContents);
    if (!code) {
      const msg = "view-ssr-route-bundle: esbuild produced no JS output";
      if (options?.logger) {
        options.logger.error(msg, { entry: entryResolved });
      } else {
        console.error(msg, entryResolved);
      }
      return null;
    }

    await writeTextFile(diskPath, code);

    const importUrl = `${pathToFileUrl(diskPath)}?v=${ver}`;
    const mod = (await import(importUrl)) as Record<string, unknown>;
    viewSsrBundledModuleCache.set(cacheKey, mod);
    return mod;
  } catch (e) {
    /** 关闭过程中 esbuild 已停：降级日志，避免用户误以为业务故障 */
    if (isLikelyEsbuildShutdownInterruption(e)) {
      viewSsrBundleShutdownInterruptPending = true;
      /** 不打任何日志：logger 传入 Error 会附加 stack，易被误认为未处理异常 */
      return null;
    }
    /** Logger.error 签名为 (message, data?, error?)，异常必须传第三参，否则会被当作 data 序列化成 `{}` */
    const msg = "view-ssr-route-bundle: bundle or import failed";
    if (options?.logger) {
      options.logger.error(msg, { entry: entryResolved, diskPath }, e);
    } else {
      console.error(msg, { entry: entryResolved, diskPath }, e);
    }
    return null;
  }
}

/**
 * 与 `clearCssRouteCacheForPath` 类似：文件变更后使 View SSR bundle 内存缓存失效（版本号由 module-cache 递增）
 *
 * @param changedPath - 变更文件路径
 */
export function clearViewSsrBundleCacheForPath(changedPath: string): void {
  const norm = changedPath.replace(/\\/g, "/");
  for (const k of viewSsrBundledModuleCache.keys()) {
    const entryPart = k.split("@@")[0] ?? k;
    if (
      entryPart === norm || entryPart.includes(norm) || norm.includes(entryPart)
    ) {
      viewSsrBundledModuleCache.delete(k);
    }
  }
}
