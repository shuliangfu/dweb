/**
 * View 引擎：仅当配置了 `render.compiler` 时，对**所列根目录**下 `.tsx` 走 `compileSource`（与 @dreamer/view 官方 dev 构建一致），
 * 使内置 JSX 指令与 jsx-compiler 产物对齐；esbuild 仅作打包而非 automatic JSX→VNode。
 *
 * 单次 esbuild `setup` 内对「路径 + insert 源 + strip 后源码」做 SHA-256 键的内存缓存，避免同内容在同一次构建中被重复编译。
 *
 * 须在 strip-load 语义**之前**于同一管道内处理路由模块：先 `stripLoadExport` 再 `compileSource`，
 * 避免「strip 已返回内容后后续插件不再执行」导致 load 仍进 bundle 或 compile 未执行。
 *
 * @module dweb/feature/view-tsx-compile-plugin
 */

import { compileSource } from "@dreamer/view/jsx-compiler";
import type { BuildPlugin } from "@dreamer/esbuild";
import {
  dirname,
  fromFileUrl,
  readTextFile,
  resolve,
} from "../core/runtime-adapter.ts";
import { stripLoadExport } from "./strip-load-plugin.ts";

/**
 * 为单次 esbuild `setup` 生成 compile 缓存键（SHA-256 十六进制）。
 * 含路径、insert 源与**即将传入** `compileSource` 的源码，避免同内容不同路径或不同 insert 配置串缓存。
 */
async function viewCompileCacheKey(
  pathNorm: string,
  insertImportPath: string,
  sourceForCompile: string,
): Promise<string> {
  const payload = `${pathNorm}\0${insertImportPath}\0${sourceForCompile}`;
  const data = new TextEncoder().encode(payload);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

/** 插件选项 */
export interface ViewClientTsxCompilePluginOptions {
  /**
   * 路由目录绝对路径，与 `router.routesDir` 解析结果一致。
   * 仅在 `stripLoadInRoutes !== false`（默认客户端）时需要：用于判断「是否路由模块」以剔除 `load`；
   * 不能从 `compileRoots` 推导（例如 `routesDir` 可为 `./src/pages`，且多根下只有应用根含路由目录）。
   */
  routesDirAbs?: string;
  /**
   * compileSource 注入的 insert 等 API 的导入源，与 view 官方构建默认一致
   * @default "@dreamer/view"
   */
  insertImportPath?: string;
  /**
   * 是否在「路由目录」下的 `.tsx` 中先剔除 `load` 导出。
   * - `true`（默认）：与客户端 bundle 一致，须同时传入 `routesDirAbs`。
   * - `false`：SSR 加载路由模块时保留 `load`，无需 `routesDirAbs`。
   */
  stripLoadInRoutes?: boolean;
  /**
   * `render.compiler` 规范化后的**绝对路径**根列表（须非空）。
   * 仅这些根下的 `.tsx` 走 `compileSource`；须含应用源码根及 workspace 依赖包根等。
   */
  compileRoots: string[];
}

/**
 * 创建 dweb View 客户端 TSX 编译插件：
 * - **仅** `compileRoots` 所列根下的 `.tsx` 走 `compileSource`（与必须配置 `render.compiler` 的语义一致）。
 *
 * @param options - `compileRoots` 必填；客户端 strip-load 时须传 `routesDirAbs`
 * @returns 供 BuilderClient `plugins` 使用的插件
 */
export function createViewClientTsxPlugin(
  options: ViewClientTsxCompilePluginOptions,
): BuildPlugin {
  const insertPath = options.insertImportPath ?? "@dreamer/view";
  /** 是否剔除路由模块中的 load（客户端 true；服务端加载路由时 false） */
  const stripLoadInRoutes = options.stripLoadInRoutes !== false;
  if (stripLoadInRoutes && options.routesDirAbs == null) {
    throw new Error(
      "createViewClientTsxPlugin: routesDirAbs is required when stripLoadInRoutes is true (client bundle)",
    );
  }
  const routesNorm = options.routesDirAbs != null
    ? resolve(options.routesDirAbs).replace(/\\/g, "/")
    : "";
  /** `render.compiler` 白名单根（绝对路径、正斜杠），由调用方保证非空 */
  const compileRootsNorm: string[] = options.compileRoots.map((p) =>
    resolve(p).replace(/\\/g, "/")
  );

  return {
    name: "dweb-view-tsx-compile",
    setup(build) {
      /** 同一次构建内：strip 后源码一致则复用 `compileSource` 产物，减轻 watch/重复解析开销 */
      const compileCache = new Map<string, string>();

      /**
       * 与 @dreamer/view `createRootCompilePlugin` 一致：默认 namespace + `namespace: "file"`；
       * 在路由目录下先 strip `load` 再 `compileSource`（客户端 strip、SSR 保留）。
       */
      const handleLoad = async (args: { path: string }) => {
        const pathToRead =
          typeof args.path === "string" && args.path.startsWith("file://")
            ? fromFileUrl(args.path)
            : args.path;
        const pathNorm = pathToRead.replace(/\\/g, "/");

        /** 仅 `render.compiler` 配置的根下文件走 jsx-compiler，无默认整棵 appSrcRoot */
        const shouldCompile = compileRootsNorm.some(
          (root) => pathNorm.startsWith(root),
        );

        if (!shouldCompile) {
          return undefined;
        }

        let source = await readTextFile(pathToRead).catch(() => "");
        if (!source && pathToRead !== args.path) {
          source = await readTextFile(args.path).catch(() => "");
        }
        if (!source) {
          return undefined;
        }

        // 与 strip-load-plugin 一致：路径落在路由目录下的模块先剔除 load（SSR 需保留 load 时跳过）
        if (
          stripLoadInRoutes && routesNorm !== "" &&
          pathNorm.includes(routesNorm)
        ) {
          source = stripLoadExport(source);
        }

        const pathAbs = resolve(pathToRead);
        const cacheKey = await viewCompileCacheKey(
          pathNorm,
          insertPath,
          source,
        );

        const cached = compileCache.get(cacheKey);
        if (cached !== undefined) {
          return {
            contents: cached,
            loader: "tsx" as const,
            resolveDir: dirname(pathAbs),
          };
        }

        const out = compileSource(source, pathAbs, {
          insertImportPath: insertPath,
        });
        compileCache.set(cacheKey, out);

        return {
          contents: out,
          loader: "tsx" as const,
          resolveDir: dirname(pathAbs),
        };
      };

      build.onLoad({ filter: /\.tsx$/ }, handleLoad);
      build.onLoad({ filter: /\.tsx$/, namespace: "file" }, handleLoad);
    },
  };
}
