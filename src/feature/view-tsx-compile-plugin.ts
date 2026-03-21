/**
 * View 引擎客户端：对应用 `src` 树内 `.tsx` 走 `compileSource`（与 @dreamer/view 官方 dev 构建一致），
 * 使内置 JSX 指令与 jsx-compiler 产物对齐；esbuild 仅作打包而非 automatic JSX→VNode。
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

/** 插件选项 */
export interface ViewClientTsxCompilePluginOptions {
  /**
   * 应用客户端源码根目录的绝对路径（通常为包含 `_client.tsx`、`routes`、`components` 的 `src`）
   */
  appSrcRoot: string;
  /**
   * 路由目录绝对路径；该路径下的 `.tsx` 会先剔除 `load` 导出再编译
   */
  routesDirAbs: string;
  /**
   * compileSource 注入的 insert 等 API 的导入源，与 view 官方构建默认一致
   * @default "@dreamer/view"
   */
  insertImportPath?: string;
  /**
   * 是否在「路由目录」下的 `.tsx` 中先剔除 `load` 导出。
   * - `true`（默认）：与客户端 bundle 一致，不把服务端 `load` 打进浏览器。
   * - `false`：供 SSR/CSR 服务端加载路由模块时使用，需保留 `load` 供 `render-ssr` 等调用。
   */
  stripLoadInRoutes?: boolean;
}

/**
 * 创建 dweb View 客户端 TSX 编译插件：仅处理 `appSrcRoot` 下的 `.tsx`，依赖包内 `.tsx` 不处理。
 *
 * @param options - 根目录与路由目录
 * @returns 供 BuilderClient `plugins` 使用的插件
 */
export function createViewClientTsxPlugin(
  options: ViewClientTsxCompilePluginOptions,
): BuildPlugin {
  const appRoot = resolve(options.appSrcRoot).replace(/\\/g, "/");
  const routesNorm = resolve(options.routesDirAbs).replace(/\\/g, "/");
  const insertPath = options.insertImportPath ?? "@dreamer/view";
  /** 是否剔除路由模块中的 load（客户端 true；服务端加载路由时 false） */
  const stripLoadInRoutes = options.stripLoadInRoutes !== false;

  return {
    name: "dweb-view-tsx-compile",
    setup(build) {
      /**
       * 与 @dreamer/view `createRootCompilePlugin` 一致：默认 namespace + `namespace: "file"`；
       * 仅处理应用 `src` 树内 `.tsx`，并在路由目录下先 strip `load` 再 `compileSource`。
       */
      const handleLoad = async (args: { path: string }) => {
        const pathToRead =
          typeof args.path === "string" && args.path.startsWith("file://")
            ? fromFileUrl(args.path)
            : args.path;
        const pathNorm = pathToRead.replace(/\\/g, "/");
        const underApp = pathNorm === appRoot ||
          pathNorm.startsWith(appRoot + "/");
        if (!underApp) {
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
        if (stripLoadInRoutes && pathNorm.includes(routesNorm)) {
          source = stripLoadExport(source);
        }

        const pathAbs = resolve(pathToRead);
        const out = compileSource(source, pathAbs, {
          insertImportPath: insertPath,
        });
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
