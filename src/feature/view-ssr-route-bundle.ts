/**
 * View 引擎：服务端加载路由模块时走与客户端一致的 esbuild + compileSource 管线。
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
  ensureDir,
  hash,
  join,
  pathToFileUrl,
  resolve,
  writeTextFile,
} from "../core/runtime-adapter.ts";
import { getModuleVersion } from "./module-cache.ts";
import { createViewClientTsxPlugin } from "./view-tsx-compile-plugin.ts";

/**
 * 内存缓存：规范化入口路径 + 模块版本 → 已 import 的命名空间（避免重复 esbuild 与同 URL 缓存问题）
 */
const viewSsrBundledModuleCache = new Map<string, Record<string, unknown>>();

/**
 * View SSR 单包在磁盘上的缓存根：当前项目根下 `runtime/cache/`（与进程 `cwd()` 一致）。
 * 子目录 **`bundle-out`**（esbuild `output`）、**`bundle-cache`**（写入 `entry-*.mjs` 再动态 `import`）。
 * 将 `.mjs` 放在项目树内，便于 Bun 从项目 `node_modules` 解析 bundle 内 **external** 的 `@dreamer/view` 等；
 * init 模板已忽略整个 `runtime/` 目录。
 *
 * @returns `outDir`（bundle-out）、`cacheDir`（bundle-cache）
 */
function getViewSsrBundleDiskCacheDirs(): { outDir: string; cacheDir: string } {
  const root = join(cwd(), "runtime", "cache");
  return {
    outDir: join(root, "bundle-out"),
    cacheDir: join(root, "bundle-cache"),
  };
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
 * @param routesDirPath - 应用 routes 目录绝对路径（用于推导 `appSrcRoot` 与路由判定）
 * @param options.logger - 可选，构建失败时记录
 * @param options.cacheIdentityPath - 可选；含 CSS 时入口为临时文件，应传**真实路由文件**绝对路径，使缓存键与 `getModuleVersion` 与源文件一致
 * @returns 模块命名空间对象（与 `import()` 一致），失败返回 null
 */
export async function loadViewRouteModuleViaSsrBundle(
  entryAbsPath: string,
  routesDirPath: string,
  options?: { logger?: Logger; cacheIdentityPath?: string },
): Promise<Record<string, unknown> | null> {
  const entryResolved = (resolve(entryAbsPath)).replace(/\\/g, "/");
  const routesResolved = (resolve(routesDirPath)).replace(/\\/g, "/");
  const appSrcRoot = resolve(join(routesResolved, ".."));

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

  const diskName = `entry-${await hash(cacheKey)}.mjs`;
  const diskPath = join(cacheDir, diskName);

  try {
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
          appSrcRoot,
          routesDirAbs: routesResolved,
          stripLoadInRoutes: false,
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
    const msg = "view-ssr-route-bundle: bundle or import failed";
    if (options?.logger) {
      options.logger.error(msg, e);
    } else {
      console.error(msg, e);
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
