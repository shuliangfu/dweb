/**
 * 路由请求处理模块
 * 处理路由匹配、页面渲染、API 路由调用
 */

import type {
  ApiContext,
  AppConfig,
  ComponentChildren,
  LayoutProps,
  Middleware,
  RenderMode,
  Request,
  Response,
} from "../common/types/index.ts";
import type { RouteInfo, Router } from "./router.ts";
import { handleApiRoute, loadApiRoute } from "./api-route.ts";
import type { GraphQLServer } from "../features/graphql/server.ts";
import type { RenderAdapter, VNode } from "./render/adapter.ts";
import type { CacheAdapter } from "./cache/adapter.ts";

import type { CookieManager } from "../features/cookie.ts";
import type { SessionManager } from "../features/session.ts";
import { removeLoadOnlyImports } from "../server/utils/module.ts";
import { buildFromStdin } from "../server/utils/esbuild.ts";
import {
  filePathToHttpUrl,
  findProjectRoot,
  normalizeModulePath,
  replaceImportAliasesInContent,
  resolveFilePath,
} from "../common/utils/path.ts";
import { createImportMapScript } from "../server/utils/import-map.ts";
import { createClientScript } from "../client/utils/script-client.ts";
import { minifyJavaScript } from "../server/utils/minify.ts";
import * as path from "@std/path";
import { logger } from "../server/utils/logger.ts";
import { isMultiAppMode } from "./config.ts";
import { LRUCache } from "../common/utils/lru-cache.ts";

/**
 * HMR 客户端脚本注入函数
 */
let hmrClientScript: string | null = null;

/**
 * 设置 HMR 客户端脚本
 *
 * 用于在开发环境中注入热更新客户端脚本。
 *
 * @param script - HMR 客户端脚本内容
 *
 * @example
 * ```ts
 * import { setHMRClientScript } from "@dreamer/dweb";
 *
 * setHMRClientScript("<script>/* HMR client code *\/</script>");
 * ```
 */
export function setHMRClientScript(script: string): void {
  hmrClientScript = script;
}

/**
 * 预先加载的 import map 脚本（在服务器启动时加载）
 */
let preloadedImportMapScript: string | null = null;

/**
 * 预先加载 import map 脚本（在服务器启动时调用）
 */
export async function preloadImportMapScript(): Promise<void> {
  try {
    preloadedImportMapScript = await createImportMapScript();
  } catch (error) {
    // 预加载失败时输出错误信息
    console.error("Failed to preload import map script:", error);
  }
}

/**
 * 路由处理器
 *
 * 负责处理路由请求，包括页面渲染（SSR/CSR/Hybrid）和 API 路由调用。
 *
 * @example
 * ```ts
 * import { RouteHandler, Router } from "@dreamer/dweb";
 *
 * const router = new Router("routes");
 * await router.scan();
 *
 * const handler = new RouteHandler(router);
 * await handler.handle(req, res);
 * ```
 */
export class RouteHandler {
  private router: Router;
  private cookieManager?: CookieManager;
  private sessionManager?: SessionManager;
  private config?: AppConfig;
  private graphqlServer?: GraphQLServer;
  private renderAdapter: RenderAdapter;
  private application?: any; // Application 实例（可选，避免循环依赖）
  private cacheAdapter?: CacheAdapter;

  /**
   * 模块编译缓存
   * Key: 文件绝对路径
   * Value: 修改时间和编译后的代码
   * 使用 LRU 缓存，最大 1000 个条目
   */
  private moduleCache = new LRUCache<string, { mtime: number; code: string }>(
    1000,
  );

  constructor(
    router: Router,
    renderAdapter: RenderAdapter,
    cookieManager?: CookieManager,
    sessionManager?: SessionManager,
    config?: AppConfig,
    graphqlServer?: GraphQLServer,
    application?: any, // Application 实例（可选，避免循环依赖）
    cacheAdapter?: CacheAdapter,
  ) {
    this.router = router;
    this.renderAdapter = renderAdapter;
    this.cookieManager = cookieManager;
    this.sessionManager = sessionManager;
    this.config = config;
    this.graphqlServer = graphqlServer;
    this.application = application;
    this.cacheAdapter = cacheAdapter;
  }

  /**
   * 处理模块请求（/__modules/ 路径）
   *
   * 该函数处理客户端模块请求，将 TypeScript/TSX 文件编译为浏览器可用的 JavaScript。
   * 这是框架实现客户端代码分割和按需加载的核心机制。
   *
   * 处理流程：
   * 1. 解析请求路径，提取文件路径
   * 2. 根据环境（开发/生产）确定文件位置：
   *    - 开发环境：从项目根目录加载源文件
   *    - 生产环境：从 `dist` 目录加载构建后的文件
   * 3. 检查文件是否存在
   * 4. 如果是 TypeScript/TSX 文件：
   *    - 移除只在 `load` 函数中使用的导入
   *    - 使用 esbuild 打包文件（包含所有依赖）
   *    - 外部依赖保持 `import` 语句（不打包）
   * 5. 设置响应头和内容类型
   * 6. 返回编译后的 JavaScript 代码
   *
   * 路径处理规则：
   * - 开发环境：`/__modules/routes/index.tsx` → `routes/index.tsx`
   * - 生产环境：`/__modules/./routes_index.abc123.js` → `dist/routes_index.abc123.js`
   *
   * @param req - HTTP 请求对象
   * @param res - HTTP 响应对象
   * @returns Promise，在模块处理完成后解析
   *
   * @throws {Error} 如果文件不存在或编译失败，会设置响应状态码并返回错误信息
   *
   * @remarks
   * - 使用 `Promise.resolve().then()` 确保所有操作都在异步上下文中执行
   * - 生产环境会从 `dist` 目录加载已构建的文件，提高性能
   * - 开发环境会实时编译 TypeScript/TSX 文件，支持热更新
   */
  private async handleModuleRequest(
    req: Request,
    res: Response,
  ): Promise<void> {
    // 立即进入异步操作，确保函数不会在同步代码后提前返回
    // 使用 Promise.resolve().then() 确保所有操作都在异步上下文中执行
    return await Promise.resolve().then(async () => {
      // 确保函数是同步开始的，所有异步操作都在 try 块内
      const url = new URL(req.url);
      // 当请求携带 t 时间戳参数时，强制跳过编译缓存，确保依赖更新能被打包到页面
      const skipCache = url.searchParams.has("t");
      const encodedPath = url.pathname.replace(/^\/__modules\//, "");

      // 立即进入 try 块，确保所有操作都在 try 块内
      try {
        // 确保这是一个异步函数，立即开始执行
        // 解码路径（同步操作）
        const filePath = decodeURIComponent(encodedPath);
        const cwd = Deno.cwd();

        // 生产环境：检查是否是构建后的文件（在 dist 目录下）
        // 客户端请求应该从 client 目录加载，服务端从 server 目录加载
        // 如果文件路径不包含目录分隔符，说明是构建后的文件名，需要从 dist/client 目录加载
        // 或者如果路径以 ./ 开头，也是构建后的相对路径
        let fullPath: string;
        const outDir = this.config?.build?.outDir || "dist";
        if (outDir) {
          // 客户端请求：从 client 目录加载（不包含 load 函数）
          let clientOutDir;
          if (await isMultiAppMode()) {
            clientOutDir = path.join(outDir, this.config!.name!, "client");
          } else {
            clientOutDir = path.join(outDir, "client");
          }

          if (filePath.startsWith("./")) {
            // 生产环境：相对路径（如 ./components_Hero.4fce6e4f85.js），从 dist/client 目录加载
            const relativePath = filePath.substring(2); // 移除 ./ 前缀
            fullPath = path.resolve(cwd, clientOutDir, relativePath);
          } else if (!filePath.includes("/") && !filePath.includes("\\")) {
            // 生产环境：只有文件名（如 components_Hero.4fce6e4f85.js），从 dist/client 目录加载
            fullPath = path.resolve(cwd, clientOutDir, filePath);
          } else {
            // 开发环境：从项目根目录加载
            fullPath = path.resolve(cwd, filePath);
          }
        } else {
          // 开发环境：从项目根目录加载
          fullPath = path.resolve(cwd, filePath);
        }

        // 检查文件是否存在（确保正确等待，使用 await 等待完成）
        let stat: Deno.FileInfo;
        try {
          // 直接等待 stat 操作完成，确保异步操作完成
          stat = await Deno.stat(fullPath);
        } catch (_statError) {
          res.status = 404;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          const errorMsg =
            `Module not found: ${filePath}\nFull path: ${fullPath}\nOutDir: ${
              this.config?.build?.outDir || "undefined"
            }\nCWD: ${cwd}`;
          res.text(errorMsg);
          // 确保在返回前响应体已设置
          if (!res.body) {
            res.text(errorMsg);
          }
          return;
        }

        // 检查缓存
        // Key: 文件完整路径
        // Value: { mtime, code }
        // 如果文件未修改，直接使用缓存的编译结果
        const mtime = stat.mtime?.getTime() || 0;
        const cacheKey = fullPath;

        let cachedEntry: { mtime: number; code: string } | null | undefined;
        if (this.cacheAdapter) {
          cachedEntry = await this.cacheAdapter.get<
            { mtime: number; code: string }
          >(cacheKey);
        } else {
          cachedEntry = this.moduleCache.get(cacheKey);
        }

        // 仅当未显式跳过缓存时才命中
        if (!skipCache && cachedEntry && cachedEntry.mtime === mtime) {
          // 缓存命中，直接返回
          const jsCode = cachedEntry.code;

          res.status = 200;
          res.setHeader(
            "Content-Type",
            "application/javascript; charset=utf-8",
          );
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.text(jsCode);

          if (
            !res.body ||
            (typeof res.body === "string" && res.body.trim() === "")
          ) {
            res.text(jsCode);
          }
          return;
        }

        // 读取文件内容（确保正确等待，使用 await 等待完成）
        // 直接等待 readTextFile 操作完成，确保异步操作完成
        const fileContent = await Deno.readTextFile(fullPath);
        // 检查文件类型
        const isTsx = fullPath.endsWith(".tsx") || fullPath.endsWith(".ts");
        let jsCode: string;

        if (isTsx) {
          // 移除只在 load 函数中使用的静态导入和 load 函数本身
          const processedContent = removeLoadOnlyImports(fileContent);

          // 使用 esbuild.build 打包文件（包含所有依赖）
          // 先定义变量，确保在 catch 块中也能访问
          const cwd = Deno.cwd();
          const absoluteFilePath = path.isAbsolute(fullPath)
            ? fullPath
            : path.resolve(cwd, fullPath);
          const originalDir = path.dirname(absoluteFilePath);
          const originalBasename = path.basename(absoluteFilePath);
          const loader = fullPath.endsWith(".tsx") ? "tsx" : "ts";

          // 读取 deno.json 或 deno.jsonc 获取 import map（用于解析外部依赖）
          // 优先使用页面所在项目的 deno.json（支持示例项目与多应用场景）
          let importMap: Record<string, string> = {};
          let projectRoot = cwd;
          try {
            // 根据原始文件目录查找项目根目录
            projectRoot = findProjectRoot(originalDir);
            const { readDenoJson } = await import("../server/utils/file.ts");
            const denoJson = await readDenoJson(projectRoot);
            if (denoJson && denoJson.imports) {
              importMap = denoJson.imports;
            }
          } catch {
            // deno.json 或 deno.jsonc 不存在或解析失败，使用空 import map
          }

          // 使用统一的构建函数
          try {
            jsCode = await buildFromStdin(
              processedContent,
              originalBasename,
              originalDir,
              loader,
              {
                importMap,
                cwd: projectRoot,
                bundleClient: true,
                minify: false, // 开发环境不压缩，便于调试
              },
            );
          } catch (esbuildError) {
            // 如果 esbuild 失败，尝试处理路径别名后再使用原始内容
            // 这样可以确保即使编译失败，路径别名也能被正确处理
            try {
              // 如果 importMap 不为空，尝试替换路径别名
              if (Object.keys(importMap).length > 0) {
                const processedWithAliases = replaceImportAliasesInContent(
                  fileContent,
                  importMap,
                  originalDir,
                );
                // 再次尝试编译（使用处理后的内容）
                try {
                  jsCode = await buildFromStdin(
                    processedWithAliases,
                    originalBasename,
                    originalDir,
                    loader,
                    {
                      importMap,
                      cwd: projectRoot,
                      bundleClient: true,
                      minify: false,
                    },
                  );
                } catch {
                  // 如果还是失败，使用处理后的内容（即使包含路径别名，esbuild 插件会处理）
                  jsCode = processedWithAliases;
                }
              } else {
                // 如果 importMap 为空，直接使用原始内容
                jsCode = fileContent;
              }
            } catch {
              // 如果处理路径别名也失败，使用原始内容
              jsCode = fileContent;
            }
            // 记录警告，但不影响继续处理
            if (esbuildError instanceof Error) {
              logger.warn(
                `[handleModuleRequest] esbuild 编译失败，已尝试处理路径别名: ${esbuildError.message}`,
              );
            }
          }
        } else {
          // 非 TS/TSX 文件（可能是已编译的 JS 文件）
          // 直接使用原始内容
          jsCode = fileContent;
        }

        // 更新缓存（带 t 参数跳过读取缓存，但仍写入最新编译结果）
        try {
          if (this.cacheAdapter) {
            await this.cacheAdapter.set(cacheKey, {
              mtime,
              code: jsCode,
            });
          } else {
            this.moduleCache.set(cacheKey, {
              mtime,
              code: jsCode,
            });
          }
        } catch {
          // 忽略缓存写入失败，继续返回编译结果
        }

        // 设置响应头和状态码（在所有异步操作完成后）
        const contentType = "application/javascript; charset=utf-8";

        // 先设置状态码为 200，确保在设置响应体之前状态码是正确的
        res.status = 200;
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.text(jsCode);

        // 确保响应体已设置
        if (
          !res.body || (typeof res.body === "string" && res.body.trim() === "")
        ) {
          res.text(jsCode);
        }

        // 再次确保状态码为 200
        if (res.status !== 200) {
          res.status = 200;
        }
      } catch (error) {
        res.status = 500;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        const errorText = `Failed to process module: ${errorMsg}${
          errorStack ? "\n\n" + errorStack : ""
        }`;
        res.text(errorText);
      }
    });
  }

  /**
   * 处理 JSR 依赖代理请求（开发环境使用，避免 CORS 问题）
   * JSR.io 不支持直接通过 HTTP URL 访问 .ts 文件并返回编译后的 JavaScript
   * 所以需要通过开发服务器代理，从 JSR.io 获取文件内容，编译后返回给浏览器
   * @param req HTTP 请求对象
   * @param res HTTP 响应对象
   * @param pathname 请求路径（如 /__jsr/@dreamer/dweb/1.8.2-beta.10/src/client.ts）
   */
  private async handleJSRProxyRequest(
    _req: Request,
    res: Response,
    pathname: string,
  ): Promise<void> {
    try {
      // 移除 /__jsr/ 前缀，获取 JSR 路径
      const jsrPath = pathname.replace(/^\/__jsr\//, "");

      // 构建 JSR.io 的 URL
      // 路径格式：@dreamer/dweb/1.8.2-beta.10/src/client.ts
      const jsrUrl = `https://jsr.io/${jsrPath}`;

      // 尝试使用 .js 扩展名（JSR.io 可能会自动编译 TypeScript 为 JavaScript）
      // 如果 .ts 路径返回 HTML，尝试使用 .js 扩展名
      let actualUrl = jsrUrl;
      if (jsrPath.endsWith(".ts") || jsrPath.endsWith(".tsx")) {
        // 尝试使用 .js 扩展名
        const jsUrl = jsrUrl.replace(/\.tsx?$/, ".js");

        // 先尝试使用 .js 扩展名，并设置 Accept 头为 application/javascript
        const jsResponse = await fetch(jsUrl, {
          headers: {
            "Accept": "application/javascript, text/javascript, */*",
          },
        });

        if (jsResponse.ok) {
          const jsContentType = jsResponse.headers.get("content-type") || "";
          // 如果返回的是 JavaScript，使用它
          if (
            jsContentType.includes("javascript") ||
            jsContentType.includes("application/javascript")
          ) {
            actualUrl = jsUrl;
            const jsCode = await jsResponse.text();
            res.status = 200;
            res.setHeader(
              "Content-Type",
              "application/javascript; charset=utf-8",
            );
            res.setHeader(
              "Cache-Control",
              "no-cache, no-store, must-revalidate",
            );
            res.text(jsCode);
            return;
          }
        }
      }

      // 如果 .js 扩展名不可用，尝试使用 .ts 扩展名，并设置 Accept 头
      // 从 JSR.io 获取文件内容，设置 Accept 头为 application/javascript
      // 某些 JSR.io 实现可能会根据 Accept 头返回编译后的 JavaScript
      const response = await fetch(actualUrl, {
        headers: {
          "Accept":
            "application/javascript, text/javascript, application/typescript, text/typescript, */*",
        },
      });

      if (!response.ok) {
        res.status = response.status;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.text(`Failed to fetch from JSR.io: ${jsrUrl} (${response.status})`);
        return;
      }

      // 检查响应类型
      const contentType = response.headers.get("content-type") || "";

      // 如果返回的是 HTML（JSR.io 的文件查看页面），说明路径不正确
      if (contentType.includes("text/html")) {
        res.status = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.text(
          `JSR.io returned HTML instead of TypeScript file. This usually means the path is incorrect: ${jsrUrl}`,
        );
        return;
      }

      // 读取文件内容
      const fileContent = await response.text();

      // 检查文件类型
      const isTsx = jsrPath.endsWith(".tsx") || jsrPath.endsWith(".ts");

      let jsCode: string;

      if (isTsx) {
        // 使用 esbuild 编译 TypeScript/TSX 文件
        try {
          const cwd = Deno.cwd();

          // 读取 deno.json 获取 import map
          let importMap: Record<string, string> = {};
          try {
            const { readDenoJson } = await import("../server/utils/file.ts");
            const denoJson = await readDenoJson(cwd);
            if (denoJson && denoJson.imports) {
              importMap = denoJson.imports;
            }
          } catch {
            // deno.json 不存在或解析失败，使用空 import map
          }

          // 使用统一的构建函数编译
          const fileName = pathname.split("/").pop() || "module.ts";
          jsCode = await buildFromStdin(
            fileContent,
            fileName,
            cwd,
            jsrPath.endsWith(".tsx") ? "tsx" : "ts",
            {
              importMap,
              cwd,
              bundleClient: true,
              minify: false, // 开发环境不压缩，便于调试
            },
          );
        } catch (esbuildError) {
          // 如果 esbuild 失败，返回错误信息
          res.status = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          const errorMsg = esbuildError instanceof Error
            ? esbuildError.message
            : String(esbuildError);
          res.text(`Failed to compile JSR module: ${errorMsg}`);
          return;
        }
      } else {
        // 非 TS/TSX 文件，直接使用原始内容
        jsCode = fileContent;
      }

      // 设置响应头和状态码
      res.status = 200;
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.text(jsCode);
    } catch (error) {
      res.status = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorText = `Failed to proxy JSR request: ${errorMsg}${
        errorStack ? "\n\n" + errorStack : ""
      }`;
      res.text(errorText);
      console.error("JSR Proxy Error:", error);
    }
  }

  /**
   * 处理 Chrome DevTools 配置请求
   */
  private handleDevToolsConfig(res: Response): void {
    res.status = 200;
    res.setHeader("Content-Type", "application/json");
    res.json({});
  }

  // 注意：handleJSRModuleRequest 方法已删除
  // 因为 @dreamer/dweb/client 已经被打包进代码，不再需要在运行时通过 /__jsr/ 代理加载
  // 如果将来有其他 JSR 模块需要在运行时加载，可以从 git 历史中恢复此方法

  /**
   * 创建扩展的请求对象（用于模块请求）
   */
  private createExtendedRequest(
    originalReq: Request,
    moduleReq: globalThis.Request,
  ): Request {
    return Object.assign(moduleReq, {
      params: originalReq.params,
      query: originalReq.query,
      cookies: originalReq.cookies,
      getCookie: originalReq.getCookie,
      getHeader: originalReq.getHeader,
      createSession: originalReq.createSession,
      getSession: originalReq.getSession,
    }) as Request;
  }

  /**
   * 处理模块请求
   */
  private async handleModuleRequestRoute(
    req: Request,
    res: Response,
    pathname: string,
    url: URL,
  ): Promise<void> {
    // 创建模块请求对象
    const moduleReqUrl = pathname.startsWith("http")
      ? pathname
      : `${url.origin}${pathname}${url.search || ""}`;
    const moduleReq = new Request(moduleReqUrl, {
      method: req.method,
      headers: req.headers,
    });

    // 转换为扩展的请求对象
    const extendedModuleReq = this.createExtendedRequest(req, moduleReq);

    // 处理模块请求
    await this.handleModuleRequest(extendedModuleReq, res);

    // 验证响应体已设置
    if (!res.body && res.status === 200) {
      res.status = 500;
      res.text(
        "Internal Server Error: Module request handler did not set response body",
      );
    }
  }

  /**
   * 加载路由中间件
   * @param middlewarePath 中间件文件路径
   * @returns 中间件函数数组（支持单个中间件或中间件数组）
   */
  private async loadRouteMiddleware(
    middlewarePath: string,
  ): Promise<Middleware[]> {
    try {
      const filePath = resolveFilePath(middlewarePath);
      const module = await this.importModuleWithAlias(filePath);

      // 支持默认导出中间件函数或中间件配置对象
      if (module.default) {
        // 如果是数组，处理数组中的中间件（支持函数和配置对象）
        if (Array.isArray(module.default)) {
          return module.default.map((m: unknown): Middleware => {
            // 如果是函数，直接返回
            if (typeof m === "function") {
              return m as Middleware;
            }
            // 如果是配置对象，提取 handler
            if (
              m && typeof m === "object" && "handler" in m &&
              typeof (m as any).handler === "function"
            ) {
              return (m as any).handler as Middleware;
            }
            // 其他情况，返回一个空函数（避免错误）
            return async () => {};
          }).filter((m) => typeof m === "function");
        }
        // 如果是单个函数，返回包含该函数的数组
        if (typeof module.default === "function") {
          return [module.default as Middleware];
        }
        // 如果是配置对象，提取 handler
        if (
          module.default && typeof module.default === "object" &&
          "handler" in module.default &&
          typeof (module.default as any).handler === "function"
        ) {
          return [(module.default as any).handler as Middleware];
        }
      }

      // 如果没有默认导出，返回空数组
      return [];
    } catch (error) {
      logger.error(
        "加载路由中间件失败",
        error instanceof Error ? error : undefined,
        {
          middlewarePath,
        },
      );
      return [];
    }
  }

  /**
   * 执行路由中间件链
   * @param middlewares 中间件函数数组
   * @param req 请求对象
   * @param res 响应对象
   * @param handler 路由处理函数
   */
  private async executeRouteMiddlewares(
    middlewares: Middleware[],
    req: Request,
    res: Response,
    handler: () => Promise<void>,
  ): Promise<void> {
    let index = 0;
    // 创建 app 对象（如果 application 存在，使用它创建 AppLike 接口）
    const app = this.application
      ? (this.application.context as any)
      : ({} as any);
    const next = async (): Promise<void> => {
      if (index < middlewares.length) {
        const middleware = middlewares[index++];
        await middleware(req, res, next, app);
      } else {
        // 所有中间件执行完毕，执行路由处理
        await handler();
      }
    };
    await next();
  }

  /**
   * 处理路由请求
   */
  private async handleMatchedRoute(
    routeInfo: RouteInfo,
    req: Request,
    res: Response,
    pathname: string,
  ): Promise<void> {
    // 提取路由参数
    if (routeInfo.params) {
      const extractedParams = this.router.extractParams(
        routeInfo.path,
        pathname,
        routeInfo,
      );
      // 参数已经在上层进行了基本清理，但这里可以进一步验证
      req.params = extractedParams;
    }

    // 加载路由中间件
    const middlewarePaths = this.router.getMiddlewares(pathname);
    const routeMiddlewares: Middleware[] = [];

    for (const middlewarePath of middlewarePaths) {
      const middlewares = await this.loadRouteMiddleware(middlewarePath);
      // loadRouteMiddleware 现在返回数组，支持单个中间件或中间件数组
      routeMiddlewares.push(...middlewares);
    }

    // 定义路由处理函数
    const routeHandler = async (): Promise<void> => {
      // 根据路由类型处理
      if (routeInfo.type === "api") {
        await this.handleApiRoute(routeInfo, req, res);
      } else if (routeInfo.type === "page") {
        await this.handlePageRoute(routeInfo, req, res);

        // 验证响应体已设置
        if (!res.body && res.status === 200) {
          const errorMsg = "响应体在路由处理后丢失";
          logger.error("响应体在路由处理后丢失", undefined, {
            url: req.url,
            method: req.method,
            routeType: routeInfo.type,
            routeFile: routeInfo.filePath,
          });
          res.status = 500;
          res.html(`<h1>500 - Internal Server Error</h1><p>${errorMsg}</p>`);
        }
      } else {
        res.status = 404;
        res.text("Not Found");
      }

      // 最终验证响应体已设置
      if (!res.body && res.status === 200) {
        const errorMsg = "Route handler did not set response body";
        logger.error("路由处理器未设置响应体", undefined, {
          url: req.url,
          method: req.method,
          routeType: routeInfo.type,
          routeFile: routeInfo.filePath,
        });
        res.status = 500;
        res.text(`Internal Server Error: ${errorMsg}`);
      }
    };

    // 如果有路由中间件，先执行中间件链，再执行路由处理
    if (routeMiddlewares.length > 0) {
      await this.executeRouteMiddlewares(
        routeMiddlewares,
        req,
        res,
        routeHandler,
      );
    } else {
      // 没有中间件，直接执行路由处理
      await routeHandler();
    }
  }

  /**
   * 处理请求
   * @param req 请求对象
   * @param res 响应对象
   */
  async handle(req: Request, res: Response): Promise<void> {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // 处理 Chrome DevTools 配置请求
    if (pathname.endsWith("/com.chrome.devtools.json")) {
      this.handleDevToolsConfig(res);
      return;
    }

    // 忽略 Vite 客户端请求（开发环境可能会有浏览器插件或遗留代码发起此请求）
    if (pathname === "/@vite/client") {
      res.status = 200;
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      res.text("export default {}");
      return;
    }

    // 处理 GraphQL 请求
    if (this.graphqlServer && this.config) {
      const graphqlPath = this.config.graphql?.config?.path || "/graphql";
      const graphiqlPath = this.config.graphql?.config?.graphiqlPath ||
        "/graphiql";

      if (pathname === graphqlPath) {
        const response = await this.graphqlServer.handleRequest(
          req as unknown as globalThis.Request,
        );
        // 将原生 Response 转换为框架 Response
        res.status = response.status;
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        res.body = await response.text();
        return;
      }

      // 处理 GraphiQL 请求
      if (
        pathname === graphiqlPath &&
        this.config.graphql?.config?.graphiql !== false
      ) {
        res.html(this.graphqlServer.getGraphiQLHTML());
        return;
      }
    }

    // 将组件文件路径转换为模块请求路径
    pathname = normalizeModulePath(pathname);
    if (pathname !== url.pathname) {
      url.pathname = pathname;
    }

    // 处理 JSR 依赖代理请求（开发环境使用，避免 CORS 问题）
    // JSR.io 不支持直接通过 HTTP URL 访问 .ts 文件并返回编译后的 JavaScript
    if (pathname.startsWith("/__jsr/")) {
      await this.handleJSRProxyRequest(req, res, pathname);
      return;
    }

    // 处理模块请求
    if (pathname.startsWith("/__modules/")) {
      await this.handleModuleRequestRoute(req, res, pathname, url);
      return;
    }

    // 处理批量预加载请求
    if (
      pathname === "/__prefetch/batch" || pathname.endsWith("/__prefetch/batch")
    ) {
      await this.handleBatchPrefetch(req, res);
      return;
    }

    // 匹配路由
    const matchedRouteInfo = this.router.match(pathname);

    if (!matchedRouteInfo) {
      await this.handle404(req, res);
      return;
    }

    // 立即创建 routeInfo 的副本，避免并发请求共享同一个对象引用
    // 这很重要，因为 router.match 返回的是共享对象，多个并发请求可能会互相影响
    const routeInfo: RouteInfo = {
      path: matchedRouteInfo.path, // 立即捕获
      filePath: matchedRouteInfo.filePath, // 立即捕获
      type: matchedRouteInfo.type,
      params: matchedRouteInfo.params
        ? [...matchedRouteInfo.params]
        : undefined, // 数组副本
      isCatchAll: matchedRouteInfo.isCatchAll,
      clientModulePath: matchedRouteInfo.clientModulePath,
    };

    // 处理匹配的路由
    try {
      await this.handleMatchedRoute(routeInfo, req, res, pathname);
    } catch (error) {
      await this.handleError(error, req, res);

      // 确保错误处理后响应体已设置
      if (!res.body && res.status === 200) {
        res.status = 500;
        res.html(
          `<h1>500 - Internal Server Error</h1><p>${
            error instanceof Error ? error.message : String(error)
          }</p>`,
        );
      }
    }
  }

  /**
   * 处理 API 路由
   */
  private async handleApiRoute(
    routeInfo: RouteInfo,
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      // 将 Application 实例附加到 req 对象，供 API 路由使用
      if (this.application) {
        (req as any).getApplication = () => this.application;
      }

      // 加载 API 路由模块
      const handlers = await loadApiRoute(routeInfo.filePath);

      // 从配置中获取 API 路由模式（method 或 restful）
      // routes 可能是字符串或对象，需要检查类型
      let apiMode: "method" | "restful" = "method"; // 默认使用 method 模式
      if (this.config?.routes && typeof this.config.routes === "object") {
        apiMode = this.config.routes.apiMode || "method";
      }

      // 提取路由参数
      const params = req.params || {};
      if (routeInfo.params) {
        const url = new URL(req.url);
        const extractedParams = this.router.extractParams(
          routeInfo.path,
          url.pathname,
          routeInfo,
        );
        Object.assign(params, extractedParams);
      }

      // 解析查询参数
      const url = new URL(req.url);
      const query: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        query[key] = value;
      });

      // 获取 Cookie
      const cookie = req.cookies || {};

      // 获取 Session
      let session = req.session || null;
      if (!session && typeof req.getSession === "function") {
        session = await req.getSession();
      }

      // 获取 Application 实例
      const app = this.application || (req.getApplication?.() || null);
      if (!app) {
        throw new Error("Application 实例不可用");
      }

      // 创建 ApiContext
      const context: ApiContext = {
        req,
        res,
        app,
        cookie,
        session,
        params,
        query,
        routePath: routeInfo.path,
        url,
      };

      // 处理 API 请求
      // 如果发生错误，api-route.ts 会直接设置响应并返回 null（不再抛出异常）
      const result = await handleApiRoute(
        handlers,
        req.method,
        apiMode,
        req,
        res,
        context,
      );

      // 如果返回 null，说明错误响应已经设置，直接返回
      if (result === null) {
        return;
      }

      // 如果响应已经被设置（通过 res.text()、res.json() 等方法），直接返回
      if (res.body !== undefined) {
        return;
      }

      // 否则返回 JSON 响应
      res.json(result);
    } catch (error) {
      // 向后兼容：如果 api-route.ts 没有传递 res 参数，仍然会抛出异常
      // API 路由错误应该返回 JSON，而不是 HTML
      // 检查是否是 ApiError 类型（从 common/errors/index.ts 导入）
      const { ApiError } = await import("../common/errors/index.ts");

      let statusCode = 500;
      let errorMessage = "API 请求处理失败";
      let errorDetails: Record<string, unknown> | undefined = undefined;

      if (error instanceof ApiError) {
        // 如果是 ApiError，使用其状态码和详情
        statusCode = error.statusCode;
        errorMessage = error.message;
        errorDetails = error.details;
      } else if (error instanceof Error) {
        // 如果是普通 Error，根据错误消息判断状态码
        errorMessage = error.message;
        if (
          errorMessage.includes("未找到") || errorMessage.includes("not found")
        ) {
          statusCode = 404;
        } else if (
          errorMessage.includes("格式错误") || errorMessage.includes("格式")
        ) {
          statusCode = 400;
        }
      } else {
        errorMessage = String(error);
      }

      // 记录错误日志（但不抛出异常）
      logger.error("API 路由错误", error instanceof Error ? error : undefined, {
        url: req.url,
        method: req.method,
        errorMessage,
        routeFile: routeInfo.filePath,
        statusCode,
      });

      // 返回结构化的错误响应给客户端
      res.status = statusCode;
      res.json({
        success: false,
        error: errorMessage,
        ...(errorDetails && { details: errorDetails }),
      });
    }
  }

  /**
   * 加载页面模块
   *
   * 该函数动态导入页面模块文件，获取页面组件、`load` 函数、`metadata` 等导出内容。
   *
   * 模块导出内容：
   * - `default`: 页面组件（必需）
   * - `load`: 数据加载函数（可选）
   * - `metadata`: SEO 元数据（可选）
   * - `renderMode`: 渲染模式（可选）
   * - `hydrate`: 是否启用 hydration（可选）
   * - `layout`: 布局组件（可选）
   *
   * @param routeInfo - 路由信息对象，包含文件路径等信息
   * @param res - HTTP 响应对象，用于在加载失败时设置错误响应
   * @returns 页面模块对象，包含所有导出内容
   *
   * @throws {Error} 如果模块导入失败或返回空值，会设置响应状态码为 500 并抛出错误
   *
   * @example
   * ```typescript
   * const pageModule = await this.loadPageModule(routeInfo, res);
   * const PageComponent = pageModule.default;
   * const loadFunction = pageModule.load;
   * const metadata = pageModule.metadata;
   * ```
   */
  /**
   * 动态导入模块（支持路径别名解析）
   * 当 Deno 无法自动解析 deno.json 中的导入映射时，手动处理路径别名
   *
   * @param filePath 文件路径（file:// 协议）
   * @returns 导入的模块
   */
  private async importModuleWithAlias(
    filePath: string,
  ): Promise<Record<string, unknown>> {
    try {
      // 先尝试直接导入（如果文件没有使用路径别名，这样可以更快）
      return await import(filePath);
    } catch (error) {
      // 如果导入失败，可能是路径别名问题
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      if (errorMessage.includes("not a dependency and not in import map")) {
        // 这是路径别名问题，需要特殊处理
        // 读取文件内容，替换路径别名，然后使用临时文件导入
        try {
          const filePathWithoutPrefix = filePath.replace(/^file:\/\//, "");
          const fileDir = path.dirname(filePathWithoutPrefix);

          // 读取 deno.json 获取导入映射
          // 使用 findProjectRoot 查找项目根目录（更可靠）
          const projectRoot = findProjectRoot(fileDir);
          let importMap: Record<string, string> = {};
          try {
            const { readDenoJson } = await import("../server/utils/file.ts");
            const denoJson = await readDenoJson(projectRoot);
            if (denoJson && denoJson.imports) {
              importMap = denoJson.imports;
              logger.debug(
                `[importModuleWithAlias] 成功读取 deno.json，找到 ${
                  Object.keys(importMap).length
                } 个导入映射。项目根目录: ${projectRoot}`,
              );
            } else {
              logger.warn(
                `[importModuleWithAlias] 未找到 deno.json 或 deno.jsonc 文件中的 imports。项目根目录: ${projectRoot}, 文件目录: ${fileDir}`,
              );
            }
          } catch (readError) {
            // deno.json 不存在或读取失败，记录警告但继续处理
            // 因为 buildFromStdin 会通过 jsrResolverPlugin 处理路径别名
            // 但是，如果 importMap 为空，jsrResolverPlugin 可能无法处理路径别名
            // 所以我们需要确保 importMap 不为空
            logger.warn(
              `[importModuleWithAlias] 读取 deno.json 失败（将依赖 esbuild 插件处理路径别名）: ${
                readError instanceof Error
                  ? readError.message
                  : String(readError)
              }, 项目根目录: ${projectRoot}, 文件目录: ${fileDir}`,
            );
            // 不抛出错误，继续处理，让 buildFromStdin 的 jsrResolverPlugin 处理路径别名
            // 但是，如果 importMap 为空，我们需要确保 buildFromStdin 能够正确处理
          }

          // 如果 importMap 为空，记录警告（这可能导致路径别名无法处理）
          if (Object.keys(importMap).length === 0) {
            logger.warn(
              `[importModuleWithAlias] importMap 为空，路径别名可能无法处理。项目根目录: ${projectRoot}, 文件: ${filePathWithoutPrefix}`,
            );
          }

          // 读取文件内容
          const fileContent = await Deno.readTextFile(filePathWithoutPrefix);

          // 替换路径别名
          const processedContent = replaceImportAliasesInContent(
            fileContent,
            importMap,
            fileDir,
          );

          // 检查是否还有未替换的路径别名（esbuild 插件会处理，但我们需要确保 importMap 正确传递）
          const aliasCheckRegex =
            /(?:from\s+['"]|import\s*\(\s*['"])(@[^'"]+)(['"])/g;
          const remainingAliases = processedContent.match(aliasCheckRegex);
          if (remainingAliases && remainingAliases.length > 0) {
            logger.debug(
              `[importModuleWithAlias] 文件中仍有未替换的路径别名（将由 esbuild 插件处理）: ${filePathWithoutPrefix}`,
              { remainingAliases: Array.from(remainingAliases) },
            );
          }

          // 注意：import.meta.resolve 在动态导入的上下文中无法解析导入映射
          // 所以我们需要使用 data: URL 方案

          // 方案：使用 data: URL，但需要将相对路径转换为绝对路径
          // 匹配所有相对路径导入（如 import ... from "./xxx" 或 import ... from "../xxx"）
          // 同时也需要处理可能遗留的路径别名（不应该发生，但为了安全起见）
          const relativeImportRegex =
            /(?:from\s+['"]|import\s*\(\s*['"])(\.\.?\/[^'"]+)(['"])/g;
          const processedWithAbsolutePaths = processedContent.replace(
            relativeImportRegex,
            (match, importPath, _quote) => {
              // 将相对路径转换为绝对路径（不添加 file:// 协议，esbuild 需要普通路径）
              const absolutePath = path.resolve(fileDir, importPath);
              return match.replace(importPath, absolutePath);
            },
          );

          // 使用 esbuild 编译 TypeScript/JSX 代码
          // 因为 Deno 无法直接解析 data: URL 中的 TypeScript/JSX 语法
          let compiledCode: string;
          try {
            // 确定文件扩展名以选择正确的 loader
            const ext = path.extname(filePathWithoutPrefix);
            const loader = ext === ".tsx" || ext === ".jsx" ? "tsx" : "ts";

            // 找到项目根目录作为 cwd
            const projectRoot = findProjectRoot(fileDir);

            // 使用 esbuild 编译代码
            // 注意：即使 processedWithAbsolutePaths 中还有未替换的路径别名，
            // buildFromStdin 会通过 jsrResolverPlugin 来处理它们
            compiledCode = await buildFromStdin(
              processedWithAbsolutePaths,
              filePathWithoutPrefix,
              projectRoot,
              loader,
              {
                importMap,
                cwd: projectRoot,
                bundleClient: false, // 服务端构建，不打包客户端依赖
                isServerBuild: true, // 明确标记为服务端构建
                minify: false, // 开发环境不压缩
                sourcemap: false,
                keepNames: true, // 保留函数名，便于调试
              },
            );
          } catch (compileError) {
            // 编译失败，记录详细错误信息
            const errorMessage = compileError instanceof Error
              ? compileError.message
              : String(compileError);
            logger.warn(
              `[importModuleWithAlias] esbuild 编译失败: ${errorMessage}`,
              {
                file: filePathWithoutPrefix,
                projectRoot,
                importMapKeys: Object.keys(importMap),
              },
            );
            throw new Error(
              `无法编译模块: ${errorMessage}`,
            );
          }

          // 编译后的代码可能包含绝对路径的导入（如果 esbuild 没有完全打包）
          // 在服务端使用临时文件导入时，绝对路径应该保留为绝对路径
          // Deno 的 import map 会处理这些路径，不需要转换为 file:// URL
          // 注意：临时文件中的代码在 Deno 的上下文中执行，可以访问文件系统
          // 所以绝对路径可以直接使用，Deno 会根据 import map 解析
          const finalCompiledCode = compiledCode;

          // 调试：检查编译后的代码中是否包含问题导入
          if (finalCompiledCode.includes("@dreamer/dweb/client")) {
            logger.debug(
              `[importModuleWithAlias] 编译后的代码中仍包含 @dreamer/dweb/client 导入`,
              { file: filePathWithoutPrefix },
            );
          }

          // 注意：data: URL 中的代码无法访问文件系统，所以即使转换为 file:// URL 也无法解析
          // 解决方案：使用临时文件而不是 data: URL
          // 创建临时文件
          const tempDir = await Deno.makeTempDir({ prefix: "dweb-import-" });
          const tempFilePath = path.join(tempDir, "module.js");
          await Deno.writeTextFile(tempFilePath, finalCompiledCode);

          try {
            // 导入临时文件（需要处理 Windows 路径）
            let importPath = `file://${tempFilePath}`;
            if (Deno.build.os === "windows") {
              // Windows 路径需要特殊处理
              importPath = `file:///${tempFilePath.replace(/\\/g, "/")}`;
            }

            // 添加超时处理，避免导入挂起
            const importPromise = import(importPath);
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error("模块导入超时")), 10000); // 10秒超时
            });

            const module = await Promise.race([
              importPromise,
              timeoutPromise,
            ]) as Record<string, unknown>;

            if (!module) {
              throw new Error("模块导入返回空值");
            }

            return module;
          } catch (importError) {
            // 导入失败，记录详细错误信息
            logger.warn(
              `[importModuleWithAlias] 临时文件导入失败: ${
                importError instanceof Error
                  ? importError.message
                  : String(importError)
              }`,
              { filePath: filePathWithoutPrefix, tempFilePath },
            );
            throw importError;
          } finally {
            // 清理临时文件（异步，不阻塞）
            Deno.remove(tempDir, { recursive: true }).catch(() => {
              // 忽略清理错误
            });
          }
        } catch (processError) {
          // 处理路径别名失败，返回原始错误
          logger.warn(
            `加载模块失败（路径别名处理失败）: ${filePath}`,
          );
          // 处理错误信息，避免输出过长的 base64 data URL
          let errorMessage = processError instanceof Error
            ? processError.message
            : String(processError);
          // 如果错误信息包含 data: URL，只保留前面的部分，不输出 base64 内容
          if (errorMessage.includes("data:application/javascript;base64,")) {
            const dataUrlIndex = errorMessage.indexOf(
              "data:application/javascript;base64,",
            );
            const beforeDataUrl = errorMessage.substring(0, dataUrlIndex);
            // 只保留 "data:application/javascript;base64," 部分，不输出后面的 base64 内容
            errorMessage = beforeDataUrl +
              "data:application/javascript;base64,[...]";
          }
          logger.warn(
            `错误信息: ${errorMessage}`,
          );
          throw error; // 抛出原始错误
        }
      } else {
        // 其他错误，直接抛出
        throw error;
      }
    }
  }

  private async loadPageModule(
    routeInfo: RouteInfo,
    res: Response,
  ): Promise<Record<string, unknown>> {
    const pagePath = resolveFilePath(routeInfo.filePath);
    try {
      const pageModule = await this.importModuleWithAlias(pagePath);
      if (!pageModule) {
        throw new Error("模块导入返回空值");
      }
      return pageModule;
    } catch (error) {
      res.status = 500;
      res.text(
        `Failed to load page module: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * 加载页面数据（通过 load 函数）
   *
   * 该函数调用页面模块的 `load` 函数获取页面所需的数据。
   * `load` 函数在服务端执行，用于在渲染前获取数据（如数据库查询、API 调用等）。
   *
   * 传递给 `load` 函数的参数：
   * - `params`: 路由参数（动态路由参数）
   * - `query`: URL 查询参数
   * - `cookies`: Cookie 对象（只读）
   * - `session`: Session 对象（如果存在）
   * - `getCookie(name)`: 获取 Cookie 值的函数
   * - `getSession()`: 获取 Session 的函数（异步）
   * - `db`: 数据库实例（如果配置了数据库）
   *
   * 如果页面模块没有导出 `load` 函数，返回空对象。
   *
   * @param pageModule - 页面模块对象，可能包含 `load` 函数
   * @param req - HTTP 请求对象，用于获取参数、查询、Cookie、Session 等
   * @param res - HTTP 响应对象，用于在 `load` 函数执行失败时设置错误响应
   * @returns `load` 函数返回的数据对象，如果没有 `load` 函数则返回空对象
   *
   * @throws {Error} 如果 `load` 函数执行失败，会设置响应状态码为 500 并抛出错误
   *
   * @example
   * ```typescript
   * // 在页面模块中
   * export async function load({ params, db }) {
   *   const user = await db.query('SELECT * FROM users WHERE id = ?', [params.id]);
   *   return { user };
   * }
   *
   * // 在路由处理器中
   * const pageData = await this.loadPageData(pageModule, req, res);
   * // pageData = { user: {...} }
   * ```
   */
  private async loadPageData(
    pageModule: Record<string, unknown>,
    req: Request,
    res: Response,
    routePath?: string,
  ): Promise<Record<string, unknown>> {
    if (!pageModule.load || typeof pageModule.load !== "function") {
      return {};
    }

    try {
      // 确保全局 $t 和 t 函数已设置
      // 这确保在 load 函数中可以直接使用 $t() 和 t()
      // 如果 i18n 插件已初始化，使用实际的翻译函数
      // 如果未初始化，使用默认函数（返回 key 本身），确保不会报错
      if (typeof globalThis !== "undefined") {
        // 如果 req.t 存在（i18n 插件已设置），使用实际的翻译函数
        if ((req as any).t) {
          (globalThis as any).$t = (req as any).t;
        } else {
          // 如果 req.t 不存在，尝试从 i18n access 模块获取
          try {
            const { ensureGlobalI18n } = await import(
              "../plugins/i18n/access.ts"
            );
            // ensureGlobalI18n 会检查 i18n 是否已初始化
            // 如果已初始化，使用实际翻译函数；如果未初始化，使用默认函数
            ensureGlobalI18n();
          } catch {
            // i18n 模块未加载，设置默认函数（返回 key 本身）
            if (!(globalThis as any).$t) {
              const defaultT = (key: string) => key;
              (globalThis as any).$t = defaultT;
            }
          }
        }
      }

      // 获取 session（如果存在）
      let session = req.session || null;
      if (!session && typeof req.getSession === "function") {
        session = await req.getSession();
      }

      // 导入数据库访问函数
      const { getDatabase } = await import("../features/database/access.ts");

      // 调用 load 函数，传递 params、query、cookies、session、数据库和 store
      const loadResult = await pageModule.load({
        req,
        res,
        params: req.params,
        query: req.query,
        cookies: req.cookies,
        session: session,
        getCookie: (name: string) => req.getCookie(name),
        getSession: async () => {
          if (typeof req.getSession === "function") {
            return await req.getSession();
          }
          return null;
        },
        // 提供数据库访问（如果已初始化）
        db: (() => {
          try {
            return getDatabase();
          } catch {
            return null;
          }
        })(),
        // 提供当前语言代码（如果 i18n 插件已设置）
        lang: (req as any).lang,
        // 提供 Store 实例（如果 store 插件已设置）
        store: (req as any).getStore ? (req as any).getStore() : undefined,
        // 提供当前路由路径
        routePath: routePath || new URL(req.url).pathname || "/",
        // 提供 URL 对象
        url: new URL(req.url),
      });
      // 确保返回的是对象，如果 load 函数返回 undefined 或 null，返回空对象
      if (loadResult && typeof loadResult === "object") {
        return loadResult as Record<string, unknown>;
      }
      return {};
    } catch (error) {
      res.status = 500;
      res.html(
        `<h1>500 - Load 函数执行失败</h1><p>${
          error instanceof Error ? error.message : String(error)
        }</p>`,
      );
      throw error;
    }
  }

  /**
   * 获取渲染配置（模式、是否 hydration、布局组件）
   *
   * 该函数根据页面模块导出、路由信息和自动检测结果，确定页面的渲染配置。
   *
   * 渲染模式优先级（从高到低）：
   * 1. 页面组件导出的 `renderMode`（显式指定）
   * 2. 自动检测结果（如果组件使用了 Preact Hooks，自动设置为 CSR）
   * 3. 全局配置的 `renderMode`
   * 4. 默认 SSR 模式
   *
   * Hydration 规则：
   * - Hybrid 模式：总是启用 hydration
   * - SSR 模式：默认不启用 hydration，除非页面组件显式设置 `hydrate: true`
   * - CSR 模式：不启用 hydration（客户端完全渲染）
   *
   * 布局组件加载：
   * - 从路由系统获取布局路径
   * - 动态导入布局模块
   * - 如果加载失败，静默处理，继续使用无布局模式
   *
   * @param pageModule - 页面模块对象，可能包含：
   *   - `renderMode`: 显式指定的渲染模式
   *   - `hydrate`: 是否启用 hydration（仅 SSR 模式有效）
   *   - `default`: 页面组件
   * @param routeInfo - 路由信息对象，包含文件路径、路由路径等信息
   * @returns 渲染配置对象，包含：
   *   - `renderMode`: 最终确定的渲染模式（'ssr' | 'csr' | 'hybrid'）
   *   - `shouldHydrate`: 是否启用 hydration（客户端激活）
   *   - `LayoutComponent`: 布局组件函数，如果不存在则返回 `null`
   *
   * @example
   * ```typescript
   * const config = await this.getRenderConfig(pageModule, routeInfo);
   * // config = {
   * //   renderMode: 'csr',
   * //   shouldHydrate: false,
   * //   LayoutComponent: LayoutComponentFunction
   * // }
   * ```
   */
  private async getRenderConfig(
    pageModule: Record<string, unknown>,
    routeInfo: RouteInfo,
    req?: Request,
    res?: Response,
  ): Promise<{
    renderMode: RenderMode;
    shouldHydrate: boolean;
    LayoutComponents: ((props: LayoutProps) => unknown)[];
    layoutData: Record<string, unknown>[];
    layoutDisabled: boolean;
  }> {
    // 获取渲染模式（优先级：页面组件导出 > 自动检测 > 配置 > 默认 SSR）
    const pageRenderMode = pageModule.renderMode as RenderMode | undefined;

    // 获取所有布局组件（从最具体到最通用）
    const LayoutComponents: ((props: LayoutProps) => unknown)[] = [];
    // 存储每个布局的 load 数据
    const layoutData: Record<string, unknown>[] = [];

    // 检查页面是否设置了 layout = false（禁用布局）
    const pageLayoutDisabled = pageModule.layout === false;

    // 获取所有匹配的布局路径（用于后续检测 Hooks）
    const layoutPaths: string[] = [];

    // 如果页面禁用了布局，直接返回空数组，不加载任何布局
    if (!pageLayoutDisabled) {
      try {
        // 获取所有匹配的布局路径
        layoutPaths.push(...this.router.getAllLayouts(routeInfo.path));

        // 加载所有布局组件，如果某个布局设置了 layout = false，则停止继承
        for (const layoutPath of layoutPaths) {
          try {
            const layoutFullPath = resolveFilePath(layoutPath);
            const layoutModule = await this.importModuleWithAlias(
              layoutFullPath,
            );
            const LayoutComponent = layoutModule.default as
              | ((props: LayoutProps) => unknown)
              | undefined;
            if (!LayoutComponent) {
              logger.warn(`布局文件 ${layoutPath} 没有默认导出`);
              continue;
            }

            // 检查并执行布局的 load 方法（如果存在）
            let layoutLoadData: Record<string, unknown> = {};
            if (
              req && res && layoutModule.load &&
              typeof layoutModule.load === "function"
            ) {
              try {
                layoutLoadData = await this.loadPageData(
                  layoutModule,
                  req,
                  res,
                  routeInfo.path,
                );

                // 检查是否在 load 函数中进行了重定向
                // 如果响应状态码是 301 或 302，并且设置了 location header，说明已经重定向
                if (
                  (res.status === 301 || res.status === 302) &&
                  res.headers.get("location")
                ) {
                  // 布局重定向，停止加载后续布局，直接返回
                  // 注意：布局重定向会中断整个页面渲染流程
                  return {
                    renderMode: "ssr",
                    shouldHydrate: false,
                    LayoutComponents: [],
                    layoutData: [],
                    layoutDisabled: true,
                  };
                }
              } catch (loadError) {
                // load 函数执行失败，记录警告但继续加载布局组件
                const errorMessage = loadError instanceof Error
                  ? loadError.message
                  : String(loadError);
                logger.warn(`布局文件 ${layoutPath} 的 load 函数执行失败:`, {
                  error: errorMessage,
                });
              }
            }

            // 检查是否设置了 layout = false（禁用继承）
            // 如果设置了 layout = false，则停止继承，只使用到当前布局为止的布局链
            if (layoutModule.layout === false) {
              LayoutComponents.push(LayoutComponent);
              layoutData.push(layoutLoadData);
              // 停止继承，不再加载后续的布局
              break;
            }

            LayoutComponents.push(LayoutComponent);
            layoutData.push(layoutLoadData);
          } catch (error) {
            // 布局加载失败不影响页面渲染，跳过该布局
            const errorMessage = error instanceof Error
              ? error.message
              : String(error);
            logger.warn(`加载布局文件失败: ${layoutPath}`, {
              error: errorMessage,
            });
          }
        }
      } catch (error) {
        // 继续执行，不使用布局
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        logger.warn(`[布局继承] 获取布局时出错: ${errorMessage}`);
      }
    } else {
      // 即使禁用了布局，也需要获取布局路径用于检测 Hooks
      try {
        layoutPaths.push(...this.router.getAllLayouts(routeInfo.path));
      } catch {
        // 静默处理错误
      }
    }

    // 如果页面没有明确指定 renderMode，检测页面组件和布局组件是否使用了 Preact Hooks
    // 暂时禁用自动检测 Hooks 并转换为 CSR 的功能
    const autoDetectedMode: RenderMode | undefined = undefined;
    // if (!pageRenderMode) {
    //   // 检测页面组件
    //   const pageUsesHooks = await this.detectPreactHooks(routeInfo.filePath);

    //   // 检测布局组件（如果存在）
    //   let layoutUsesHooks = false;
    //   for (const layoutPath of layoutPaths) {
    //     if (await this.detectPreactHooks(layoutPath)) {
    //       layoutUsesHooks = true;
    //       break;
    //     }
    //   }

    //   // 如果页面组件或布局组件使用了 Hooks，自动设置为 CSR
    //   if (pageUsesHooks || layoutUsesHooks) {
    //     autoDetectedMode = "csr";
    //   }
    // }

    // 从配置中读取渲染模式
    const configRenderMode = this.config?.render?.mode;
    const renderMode: RenderMode = pageRenderMode || autoDetectedMode ||
      configRenderMode || "ssr";

    // 对于 SSR 模式，默认不进行 hydration
    // 只有在明确指定 hybrid 模式或 hydrate=true 时才进行 hydration
    const shouldHydrate = renderMode === "hybrid" ||
      pageModule.hydrate === true;

    return {
      renderMode,
      shouldHydrate,
      LayoutComponents,
      layoutData,
      layoutDisabled: pageLayoutDisabled,
    };
  }

  /**
   * 渲染页面内容为 HTML
   * 支持异步页面组件和异步布局组件
   *
   * 注意：preact-render-to-string 不支持异步组件
   * 对于异步组件，我们需要创建一个包装组件，在 h() 内部调用异步组件并等待 Promise
   * 但是 renderToString 不支持异步组件，所以我们需要先等待 Promise 完成，然后用同步方式渲染
   *
   * 关键：如果组件使用了 hooks，hooks 上下文需要在 h() 内部初始化
   * 所以，对于使用 hooks 的异步组件，我们需要在 h() 内部调用组件
   */
  /**
   * 渲染错误页面（优先使用 _500.tsx，如果没有则使用 _error.tsx，如果都没有则返回 null）
   */
  private async renderErrorPage(
    _statusCode: number,
    error: unknown,
    _req: Request,
    _res: Response,
  ): Promise<string | null> {
    try {
      // 先尝试加载 _500.tsx
      let errorPagePath = this.router.getErrorPage("500");

      // 如果没有 _500.tsx，尝试加载 _error.tsx
      if (!errorPagePath) {
        errorPagePath = this.router.getErrorPage("error");
      }

      // 如果都没有，返回 null
      if (!errorPagePath) {
        return null;
      }

      // 加载错误页面组件
      const errorPageFullPath = resolveFilePath(errorPagePath);
      const errorPageModule = await this.importModuleWithAlias(
        errorPageFullPath,
      );
      const ErrorPageComponent = errorPageModule.default as (
        props: { error?: { message?: string } },
      ) => unknown;

      if (!ErrorPageComponent || typeof ErrorPageComponent !== "function") {
        return null;
      }

      // 检查组件是否是异步函数
      const errorProps = {
        error: error instanceof Error
          ? { message: error.message }
          : { message: String(error) },
      };

      try {
        const result = ErrorPageComponent(errorProps);
        if (result instanceof Promise) {
          throw new Error("错误页面组件不能是异步函数");
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (!errMsg.includes("__H") && !errMsg.includes("hooks")) {
          throw err;
        }
      }

      // 创建错误页面 VNode
      const errorVNode = this.renderAdapter.createElement(
        ErrorPageComponent as any,
        errorProps,
      );

      // 加载 _app.tsx 组件（如果存在）
      const appPath = this.router.getApp();
      if (appPath) {
        const appFullPath = resolveFilePath(appPath);
        const appModule = await this.importModuleWithAlias(appFullPath);
        const AppComponent = appModule.default as (props: {
          children: string;
        }) => unknown;

        if (AppComponent && typeof AppComponent === "function") {
          const errorHtmlResult = this.renderAdapter.renderToString(errorVNode);
          const errorHtml = errorHtmlResult instanceof Promise
            ? await errorHtmlResult
            : errorHtmlResult;
          const appResult = AppComponent({ children: errorHtml });
          const appElement = appResult instanceof Promise
            ? await appResult
            : appResult;
          const appHtmlResult = this.renderAdapter.renderToString(appElement);
          return appHtmlResult instanceof Promise
            ? await appHtmlResult
            : appHtmlResult;
        }
      }

      // 如果没有 _app.tsx，直接渲染错误页面
      const errorHtmlResult = this.renderAdapter.renderToString(errorVNode);
      return errorHtmlResult instanceof Promise
        ? await errorHtmlResult
        : errorHtmlResult;
    } catch {
      // 如果渲染错误页面失败，返回 null，使用默认错误页面
      return null;
    }
  }

  /**
   * 创建页面 VNode（包含布局）
   */
  private async createPageVNode(
    PageComponent: (props: Record<string, unknown>) => unknown,
    LayoutComponents: ((props: LayoutProps) => unknown)[],
    layoutData: Record<string, unknown>[],
    pageProps: Record<string, unknown>,
    req?: Request,
    routeInfo?: RouteInfo,
  ): Promise<VNode> {
    // 处理页面组件（支持 hooks，但不支持 async）
    // 检查组件函数本身是否是异步函数（不调用函数，避免触发 hooks）
    if (
      PageComponent.constructor.name === "AsyncFunction" ||
      (PageComponent as any)[Symbol.toStringTag] === "AsyncFunction"
    ) {
      throw new Error("页面组件不能是异步函数");
    }

    // 初始化 hooks 上下文：先渲染一个简单的组件来初始化 hooks 上下文
    try {
      // 创建一个简单的测试组件来初始化 hooks 上下文
      const initComponent = () => null;
      const initResult = this.renderAdapter.renderToString(
        this.renderAdapter.createElement(initComponent, {}),
      );
      // 处理异步 renderToString（Vue3）
      if (initResult instanceof Promise) {
        await initResult;
      }
    } catch {
      // 忽略错误，hooks 上下文可能已经初始化
    }

    // 创建页面 VNode（hooks 上下文会在 createElement() 调用时自动初始化）
    const pageVNode = this.renderAdapter.createElement(
      PageComponent as any,
      pageProps,
    );

    let currentElement = pageVNode;

    if (LayoutComponents.length > 0) {
      // 从最内层到最外层嵌套布局组件
      for (let i = 0; i < LayoutComponents.length; i++) {
        const LayoutComponent = LayoutComponents[i];
        // 获取对应布局的 load 数据（如果有）
        const layoutProps = layoutData[i] || {};
        // 支持异步布局组件：如果组件返回 Promise，则等待它
        // 将布局的 load 数据和页面数据作为 props 传递给布局组件
        // 布局数据直接展开，页面数据通过 data 字段传递（与页面组件保持一致）
        // 确保 children 的类型正确，并且放在最后以避免被 layoutProps 覆盖
        // 从 layoutProps 中排除 children 和 data，避免类型冲突和数据覆盖
        const { children: _, data: __, ...restLayoutProps } = layoutProps;
        // 显式声明 children 的类型，确保类型正确传递
        const children: ComponentChildren = currentElement as ComponentChildren;
        // 构建 layoutPropsWithData
        // data: 布局的 load 数据（layoutProps）
        const layoutPropsWithData = Object.assign(
          {},
          restLayoutProps,
          {
            // 布局的 load 数据作为 data
            data: layoutProps,
            // 提供当前路由路径
            routePath: routeInfo?.path ||
              (req ? new URL(req.url).pathname : "/"),
            // 提供 URL 对象
            url: req ? new URL(req.url) : undefined,
            // children 放在最后，确保类型正确且不被覆盖
            children,
          },
        ) as LayoutProps;

        // 检查布局组件函数本身是否是异步函数（不调用函数，避免触发 hooks）
        if (
          LayoutComponent.constructor.name === "AsyncFunction" ||
          (LayoutComponent as any)[Symbol.toStringTag] === "AsyncFunction"
        ) {
          throw new Error("布局组件不能是异步函数");
        }

        // 创建布局 VNode（hooks 上下文会在 createElement() 调用时自动初始化）
        currentElement = this.renderAdapter.createElement(
          LayoutComponent as any,
          layoutPropsWithData as unknown as Record<string, unknown>,
        ) as any;
      }
    }

    return currentElement;
  }

  private async renderPageContent(
    PageComponent: (
      props: Record<string, unknown>,
    ) => unknown,
    LayoutComponents: ((props: LayoutProps) => unknown)[],
    layoutData: Record<string, unknown>[],
    pageProps: Record<string, unknown>,
    renderMode: RenderMode,
    req?: Request,
    routeInfo?: RouteInfo,
  ): Promise<string> {
    if (renderMode === "csr") {
      // CSR 模式：服务端只渲染容器，内容由客户端渲染
      return "";
    }

    // 在渲染前设置全局 i18n 函数（如果 i18n 插件已设置）
    if (req && (req as any).__setGlobalI18n) {
      (req as any).__setGlobalI18n();
    }

    try {
      let html: string;
      try {
        const currentElement = await this.createPageVNode(
          PageComponent,
          LayoutComponents,
          layoutData,
          pageProps,
          req,
          routeInfo,
        );

        const renderResult = this.renderAdapter.renderToString(
          currentElement,
        );
        // 处理异步 renderToString（Vue3）
        html = renderResult instanceof Promise
          ? await renderResult
          : renderResult;

        // 确保 HTML 内容不为空
        if (!html || html.trim() === "") {
          html = "<div>页面渲染失败：内容为空</div>";
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        html = `<div>页面渲染失败: ${errorMsg}</div>`;
      }

      // 不再需要额外的包装 div，因为 _app.tsx 已经有了 <div id="root">
      // 直接返回渲染的 HTML
      return html;
    } finally {
      // 渲染完成后清理全局 i18n 函数
      if (req && (req as any).__clearGlobalI18n) {
        (req as any).__clearGlobalI18n();
      }
    }
  }

  /**
   * 获取注入脚本（import map 和客户端脚本）
   * 分离脚本生成和 HTML 注入，以便支持流式渲染
   */
  private async getInjectionScripts(
    routeInfo: RouteInfo,
    renderMode: RenderMode,
    shouldHydrate: boolean,
    pageProps: Record<string, unknown>,
    layoutDisabled: boolean,
    layoutData?: Record<string, unknown>[],
  ): Promise<{ headScripts: string[]; bodyScripts: string[] }> {
    const headScripts: string[] = [];
    const bodyScripts: string[] = [];

    // 只在需要客户端脚本时注入 import map
    // 纯 SSR 模式（ssr + !shouldHydrate）不需要 import map，因为不需要客户端脚本
    // CSR、Hybrid 和 SSR + Hydration 模式需要 import map
    const needsClientScript = renderMode === "csr" ||
      renderMode === "hybrid" || shouldHydrate || hmrClientScript;

    if (needsClientScript) {
      // 注入 import map
      let importMapScript = preloadedImportMapScript;
      if (!importMapScript) {
        try {
          importMapScript = await createImportMapScript();
        } catch (_error) {
          // 静默处理错误
        }
      }

      if (importMapScript) {
        headScripts.push(importMapScript);
      }
    }

    // 预加载 Preact 模块到全局作用域（CSR/Hybrid 模式或 HMR 时需要）
    // CSR 和 Hybrid 模式需要 Preact 进行客户端渲染，所以必须预加载
    if (needsClientScript) {
      const preactPreloadScriptContent = `
// 预加载 Preact 模块到全局作用域，供客户端渲染和 HMR 使用
(async function() {
  try {
    const [preactModule, jsxRuntimeModule, hooksModule, ] = await Promise.all([
      import('preact'),
      import('preact/jsx-runtime'),
      import('preact/hooks').catch(() => null), 
      import('preact/signals').catch(() => null) 
    ]);
    
    globalThis.__PREACT_MODULES__ = {
      render: preactModule.render,
      hydrate: preactModule.hydrate,
      jsx: jsxRuntimeModule.jsx
    };
    
    // 如果 preact/hooks 可用，也预加载到全局作用域
    if (hooksModule) {
      globalThis.__PREACT_HOOKS__ = {
        useState: hooksModule.useState,
        useEffect: hooksModule.useEffect,
        useCallback: hooksModule.useCallback,
        useMemo: hooksModule.useMemo,
        useRef: hooksModule.useRef,
        useContext: hooksModule.useContext,
        useReducer: hooksModule.useReducer,
        useLayoutEffect: hooksModule.useLayoutEffect
      };
    }
  } catch (_error) {
    // 预加载失败时静默处理
    console.error('Preact 模块预加载失败:', _error);
  }
})();
`;
      // 压缩脚本内容
      const minifiedContent = await minifyJavaScript(
        preactPreloadScriptContent,
      );
      const preactPreloadScript =
        `<script type="module" data-type="dweb-preact-preload">${minifiedContent}</script>`;

      // 注入到 head 中
      headScripts.push(preactPreloadScript);
    }

    // 注入客户端 JS（CSR、Hybrid 模式或明确启用 hydration 时需要）
    if (needsClientScript) {
      // 生产环境：如果存在 clientModulePath，使用它（只包含文件名）
      // 开发环境：使用完整的 filePath
      let modulePath: string;
      if (routeInfo.clientModulePath) {
        // 生产环境：使用相对路径（如 ./routes_index.ac1f274a32.js）
        // 这样 filePathToHttpUrl 会保持相对路径，客户端可以直接使用
        modulePath = `./${routeInfo.clientModulePath}`;
      } else {
        // 开发环境：使用完整路径
        modulePath = resolveFilePath(routeInfo.filePath);
      }

      // 获取所有布局路径（用于客户端脚本）
      // 需要检查页面是否禁用了布局，以及每个布局的 layout 属性
      const layoutPathsForClient: string[] = [];

      // 如果页面禁用了布局，不加载任何布局路径
      if (!layoutDisabled) {
        try {
          const layoutFilePaths = this.router.getAllLayouts(routeInfo.path);
          for (const layoutFilePath of layoutFilePaths) {
            try {
              // 加载布局模块以检查 layout 属性
              const layoutFullPath = resolveFilePath(layoutFilePath);
              const layoutModule = await this.importModuleWithAlias(
                layoutFullPath,
              );

              // 检查是否设置了 layout = false（禁用继承）
              // 如果设置了 layout = false，则停止继承，只使用到当前布局为止的布局链
              if (layoutModule.layout === false) {
                // 添加当前布局到客户端路径列表
                const layoutRoute = this.router.getAllRoutes().find((r) =>
                  r.filePath === layoutFilePath
                );
                if (layoutRoute?.clientModulePath) {
                  // 生产环境：使用客户端模块路径
                  layoutPathsForClient.push(layoutRoute.clientModulePath);
                } else {
                  // 开发环境：使用完整路径
                  layoutPathsForClient.push(layoutFilePath);
                }
                // 停止继承，不再加载后续的布局
                break;
              }

              // 检查布局路由信息，看是否有 clientModulePath
              const layoutRoute = this.router.getAllRoutes().find((r) =>
                r.filePath === layoutFilePath
              );
              if (layoutRoute?.clientModulePath) {
                // 生产环境：使用客户端模块路径
                layoutPathsForClient.push(layoutRoute.clientModulePath);
              } else {
                // 开发环境：使用完整路径
                layoutPathsForClient.push(layoutFilePath);
              }
            } catch (layoutError) {
              // 布局加载失败不影响页面渲染，跳过该布局
              const errorMessage = layoutError instanceof Error
                ? layoutError.message
                : String(layoutError);
              logger.warn(
                `[布局继承] 客户端脚本：加载布局文件失败: ${layoutFilePath}`,
                {
                  error: errorMessage,
                },
              );
            }
          }
        } catch (_error) {
          // 静默处理错误
          logger.warn(`[布局继承] 客户端脚本：获取布局路径失败`);
        }
      }

      // 为了向后兼容，使用第一个布局路径（最具体的）
      // 但我们需要修改客户端脚本以支持多个布局
      const layoutPathForClient = layoutPathsForClient.length > 0
        ? layoutPathsForClient[0]
        : null;
      const allLayoutPathsForClient = layoutPathsForClient.length > 0
        ? layoutPathsForClient
        : null;

      // 从 Router 获取 basePath（多应用模式使用）
      // basePath 存储在 Router 中，而不是 config 中
      const basePath = this.router.getBasePath();
      // 规范化 basePath：如果 basePath 以 / 结尾且不是根路径，移除末尾的 /
      const normalizedBasePath = basePath !== "/" && basePath.endsWith("/")
        ? basePath.slice(0, -1)
        : basePath;

      // 获取 prefetch 配置并解析通配符模式
      // 检查是否启用了预加载（enabled 默认为 true，只有显式设置为 false 时才禁用）
      const prefetchEnabled = this.config?.prefetch?.enabled !== false;
      const prefetchConfig = this.config?.prefetch?.routes;
      const prefetchLoading = this.config?.prefetch?.loading ?? false;
      const prefetchMode = this.config?.prefetch?.mode ?? "batch";
      let prefetchRoutes: string[] | undefined;

      // 只有当预加载启用且配置了路由时才处理预加载
      if (
        prefetchEnabled && Array.isArray(prefetchConfig) &&
        prefetchConfig.length > 0
      ) {
        prefetchRoutes = this.resolvePrefetchRoutes(prefetchConfig);
      }

      // 只在需要客户端渲染时注入客户端脚本
      // 纯 SSR 模式（ssr + !shouldHydrate）不需要客户端脚本，因为页面是静态的
      // CSR、Hybrid 和 SSR + Hydration 模式需要客户端脚本
      // 如果存在 HMR 脚本，即使 SSR 模式也需要注入 pageData（供 HMR 使用）
      let clientScript: string | null = null;
      if (
        renderMode === "csr" ||
        renderMode === "hybrid" ||
        (renderMode === "ssr" && shouldHydrate) ||
        hmrClientScript // 如果存在 HMR 脚本，也需要注入 pageData
      ) {
        clientScript = await createClientScript(
          modulePath,
          renderMode,
          pageProps,
          shouldHydrate,
          layoutPathForClient,
          normalizedBasePath,
          allLayoutPathsForClient,
          layoutDisabled,
          prefetchRoutes,
          prefetchLoading,
          prefetchMode,
          layoutData, // 传递布局的 load 数据到客户端
        );
      }

      // 如果启用了预加载加载状态，注入预加载动画样式
      if (prefetchLoading) {
        const prefetchSpinCss =
          `@keyframes spin { to { transform: rotate(360deg); }}`;
        headScripts.push(`<style>${prefetchSpinCss}</style>`);
      }

      // 只在有客户端脚本时才注入
      if (clientScript) {
        // 对于 CSR 模式，将链接拦截器脚本注入到 head（尽早执行）
        if (renderMode === "csr" && clientScript.includes("<script>")) {
          // 提取链接拦截器脚本（第一个 <script> 标签）
          const linkInterceptorMatch = clientScript.match(
            /<script>([\s\S]*?)<\/script>/,
          );
          if (linkInterceptorMatch) {
            headScripts.push(
              `<script>${linkInterceptorMatch[1]}</script>`,
            );
            // 从 body 脚本中移除链接拦截器，只保留模块脚本
            const moduleScript = clientScript.replace(
              /<script>[\s\S]*?<\/script>\s*/,
              "",
            );
            bodyScripts.push(moduleScript);
          } else {
            bodyScripts.push(clientScript);
          }
        } else {
          bodyScripts.push(clientScript);
        }
      }
    }

    // 在开发模式下注入 HMR 客户端脚本
    if (hmrClientScript) {
      bodyScripts.push(hmrClientScript);
    }

    return { headScripts, bodyScripts };
  }

  /**
   * 注入脚本到 HTML（import map 和客户端脚本）
   * 同时注入预加载和预取链接
   */
  private async injectScripts(
    fullHtml: string,
    routeInfo: RouteInfo,
    renderMode: RenderMode,
    shouldHydrate: boolean,
    pageProps: Record<string, unknown>,
    layoutDisabled: boolean,
    _req?: Request,
    layoutData?: Record<string, unknown>[],
  ): Promise<string> {
    const { headScripts, bodyScripts } = await this.getInjectionScripts(
      routeInfo,
      renderMode,
      shouldHydrate,
      pageProps,
      layoutDisabled,
      layoutData,
    );

    // 执行注入
    let resultHtml = fullHtml;

    if (headScripts.length > 0) {
      const headContent = headScripts.join("\n");
      const headEndIndex = resultHtml.indexOf("</head>");
      if (headEndIndex !== -1) {
        resultHtml = resultHtml.slice(0, headEndIndex) +
          headContent + "\n" +
          resultHtml.slice(headEndIndex);
      } else if (resultHtml.indexOf("<head>") !== -1) {
        // 如果没有 </head> 但有 <head>，追加到 <head> 后
        const headStartIndex = resultHtml.indexOf("<head>") + 6;
        resultHtml = resultHtml.slice(0, headStartIndex) +
          "\n" + headContent +
          resultHtml.slice(headStartIndex);
      } else {
        // 如果没有 head 标签，尝试插入到 html 标签后
        const htmlStartIndex = resultHtml.indexOf("<html");
        if (htmlStartIndex !== -1) {
          const htmlEndIndex = resultHtml.indexOf(">", htmlStartIndex) + 1;
          resultHtml = resultHtml.slice(0, htmlEndIndex) +
            "\n<head>\n" + headContent + "\n</head>" +
            resultHtml.slice(htmlEndIndex);
        } else {
          // 最坏情况，插入到最前面
          resultHtml = "<head>\n" + headContent + "\n</head>\n" + resultHtml;
        }
      }
    }

    if (bodyScripts.length > 0) {
      const bodyContent = bodyScripts.join("\n");
      const bodyEndIndex = resultHtml.indexOf("</body>");
      if (bodyEndIndex !== -1) {
        resultHtml = resultHtml.slice(0, bodyEndIndex) +
          bodyContent + "\n" +
          resultHtml.slice(bodyEndIndex);
      } else {
        resultHtml += "\n" + bodyContent;
      }
    }

    return resultHtml;
  }

  /**
   * 注入脚本到流中
   * 用于流式渲染模式，支持边渲染边传输
   */
  private injectScriptsToStream(
    inputStream: ReadableStream<Uint8Array>,
    headScripts: string[],
    bodyScripts: string[],
  ): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";
    let headInjected = false;
    let streamEnded = false;

    return new ReadableStream({
      async start(controller) {
        const reader = inputStream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              streamEnded = true;
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // 尝试注入 head 脚本
            if (!headInjected && headScripts.length > 0) {
              // 查找 </head> 闭合标签
              const headEndIndex = buffer.indexOf("</head>");
              if (headEndIndex !== -1) {
                const pre = buffer.slice(0, headEndIndex);
                const post = buffer.slice(headEndIndex);
                const scriptContent = headScripts.join("\n");

                // 注入脚本
                controller.enqueue(
                  encoder.encode(pre + "\n" + scriptContent + "\n"),
                );

                // 更新 buffer 为剩余内容
                buffer = post;
                headInjected = true;
              }
            }

            // 如果 head 已经注入，或者 buffer 过大（防止内存溢出），刷新 buffer
            // 注意：我们需要保留一部分 buffer 以防 </head> 被截断（如果还没注入）
            // 但为了简化，如果 headInjected 为 true，我们直接刷新
            // 如果 headInjected 为 false，我们最多保留 1KB 用于匹配 </head>
            if (headInjected) {
              if (buffer.length > 0) {
                controller.enqueue(encoder.encode(buffer));
                buffer = "";
              }
            } else if (buffer.length > 1024 * 10) {
              // 如果 buffer 超过 10KB 还没找到 </head>，可能没有 head 或 head 巨大
              // 强制刷新一部分，避免无限缓冲
              const keepLength = 1024; // 保留 1KB 用于匹配
              const flushPart = buffer.slice(0, buffer.length - keepLength);
              controller.enqueue(encoder.encode(flushPart));
              buffer = buffer.slice(buffer.length - keepLength);
            }
          }

          //流结束处理
          if (streamEnded) {
            // 如果 head 还没注入（例如没有 </head> 标签），尝试注入到 buffer 前面
            if (!headInjected && headScripts.length > 0) {
              // 这是一个回退策略，如果找不到 </head>，我们最好不要乱注入，以免破坏结构
              // 或者我们可以注入到 buffer 的最前面（假设它是 body 的一部分）
              // 这里选择不注入，或者注入到最前面？
              // 为了安全，如果找不到 </head>，我们假设 HTML 结构不完整，但也许应该注入到最前面
              // let's inject at the beginning of remaining buffer
              const scriptContent = headScripts.join("\n");
              buffer = scriptContent + "\n" + buffer;
            }

            // 输出剩余 buffer
            if (buffer.length > 0) {
              controller.enqueue(encoder.encode(buffer));
            }

            // 注入 body 脚本（在流的最末尾）
            if (bodyScripts.length > 0) {
              controller.enqueue(
                encoder.encode("\n" + bodyScripts.join("\n")),
              );
            }

            controller.close();
          }
        } catch (e) {
          controller.error(e);
        } finally {
          reader.releaseLock();
        }
      },
    });
  }

  /**
   * 解析预加载路由配置（支持通配符模式）
   * @param patterns 路由模式数组，支持：
   *   - ["*"] - 所有路由
   *   - ["/*] - 所有一级页面（如 /docs, /about）
   *   - ["/*\/*"] - 所有一级二级页面（如 /docs/route, /about/contact）
   *   - ["/*\/*\/*"] - 所有一级二级三级页面路由
   *   - ["/specific-route"] - 具体路由路径
   * @returns 匹配的路由路径数组
   */
  /**
   * 检查路由是否匹配给定的模式
   * @param routePath 路由路径（已移除 basePath）
   * @param pattern 匹配模式（已移除 basePath 和否定前缀）
   * @returns 是否匹配
   */
  private matchRoutePattern(
    routePath: string,
    pattern: string,
  ): boolean {
    if (pattern === "*") {
      // 匹配所有路由
      return true;
    } else if (pattern.startsWith("/") && pattern.includes("*")) {
      // 通配符模式处理
      // 例如：/* 匹配所有一级路由，/*/* 匹配所有二级路由，/docs/* 匹配所有以 /docs/ 开头的路由

      // 检查是否是带前缀的通配符模式（如 /docs/*）
      const lastStarIndex = pattern.lastIndexOf("*");
      const prefixBeforeStar = pattern.substring(0, lastStarIndex);

      if (prefixBeforeStar && prefixBeforeStar !== "/") {
        // 带前缀的通配符模式，需要检查路径前缀
        // 例如：/docs/* 需要匹配 /docs/xxx, /docs/xxx/yyy 等所有以 /docs/ 开头的路由
        // prefixBeforeStar 可能是 "/docs/" 或 "/docs"，需要处理两种情况
        const prefixWithoutTrailingSlash = prefixBeforeStar.endsWith("/")
          ? prefixBeforeStar.slice(0, -1)
          : prefixBeforeStar;

        // 检查路由路径是否以该前缀开头（必须包含子路径，即路径长度大于前缀长度）
        // 例如：/docs/* 应该匹配 /docs/middleware，但不匹配 /docs 本身
        if (!routePath.startsWith(prefixWithoutTrailingSlash + "/")) {
          return false;
        }

        // 计算通配符部分的深度（* 的数量）
        const wildcardPart = pattern.substring(lastStarIndex);
        const wildcardDepth = (wildcardPart.match(/\*/g) || []).length;

        // 检查通配符是否在模式末尾（如 /docs/* 或 /docs/*/*）
        // 如果通配符在末尾，应该匹配所有更深的路由，不限制最大深度
        const isWildcardAtEnd = pattern.endsWith("*") || pattern.endsWith("/*");

        // 移除动态参数部分来计算深度
        const pathWithoutParams = routePath.replace(/\[[^\]]+\]/g, "param");
        const routeDepth = pathWithoutParams.split("/").filter(Boolean).length;
        const prefixDepth =
          prefixWithoutTrailingSlash.split("/").filter(Boolean).length;

        // 计算最小深度（前缀深度 + 1，因为至少要有一个子路径）
        const minDepth = prefixDepth + 1;

        if (isWildcardAtEnd) {
          // 如果通配符在末尾（如 /docs/*），匹配所有深度 >= minDepth 的路由
          // 例如：/docs/* 匹配 /docs/middleware, /docs/middleware/health 等所有以 /docs/ 开头的路由
          return routeDepth >= minDepth;
        } else {
          // 如果通配符不在末尾（如 /docs/*/specific），限制最大深度
          const maxDepth = prefixDepth + wildcardDepth;
          return routeDepth >= minDepth && routeDepth <= maxDepth;
        }
      } else {
        // 纯通配符模式（如 /*, /*/*），只检查深度
        const maxDepth = pattern.split("/").filter(Boolean).length;

        // 移除动态参数部分（如 [id]）来计算深度
        // 例如：/users/[id] -> /users/param -> 深度为 2
        const pathWithoutParams = routePath.replace(/\[[^\]]+\]/g, "param");

        // 计算路径深度（排除 basePath 后的深度）
        const routeDepth = pathWithoutParams.split("/").filter(Boolean).length;

        // 匹配深度 <= maxDepth 的路由（例如 /*/* 匹配深度 1 和 2）
        return routeDepth > 0 && routeDepth <= maxDepth;
      }
    } else {
      // 具体路由路径匹配
      return routePath === pattern;
    }
  }

  /**
   * 解析预加载路由配置，支持通配符和否定模式
   * @param patterns 路由模式数组，支持通配符（如 `/*`）和否定模式（如 `!/docs/*`）
   * @returns 匹配的路由路径数组
   */
  private resolvePrefetchRoutes(patterns: string[]): string[] {
    const allRoutes = this.router.getAllRoutes();
    // 过滤页面路由，排除特殊路由（_middleware, _layout, _app, _404, _500, _error 等）
    const pageRoutes = allRoutes.filter((route) => {
      if (route.type !== "page") return false;
      // 排除以 _ 开头的特殊路由
      const pathSegments = route.path.split("/").filter(Boolean);
      return !pathSegments.some((segment) => segment.startsWith("_"));
    });

    // 获取 basePath（用于从路由路径中移除 basePath 前缀）
    const basePath = this.router.getBasePath();
    const normalizedBasePath = basePath !== "/" && basePath.endsWith("/")
      ? basePath.slice(0, -1)
      : basePath;

    // 分离包含模式和排除模式（以 ! 开头的为排除模式）
    const includePatterns: string[] = [];
    const excludePatterns: string[] = [];

    for (const pattern of patterns) {
      if (pattern.startsWith("!")) {
        // 排除模式，移除 ! 前缀
        excludePatterns.push(pattern.slice(1));
      } else {
        // 包含模式
        includePatterns.push(pattern);
      }
    }

    // 如果没有包含模式，返回空数组
    if (includePatterns.length === 0) {
      return [];
    }

    const matchedRoutes = new Set<string>();

    // 第一步：处理包含模式，收集所有匹配的路由
    for (const pattern of includePatterns) {
      // 处理 basePath
      let normalizedPattern = pattern;
      if (
        normalizedBasePath !== "/" &&
        !pattern.startsWith(normalizedBasePath)
      ) {
        // 如果模式路径不包含 basePath，添加 basePath 前缀用于后续处理
        normalizedPattern = normalizedBasePath +
          (pattern.startsWith("/") ? pattern : "/" + pattern);
      }

      // 从模式中移除 basePath 用于匹配
      let patternForMatch = normalizedPattern;
      if (
        normalizedBasePath !== "/" &&
        patternForMatch.startsWith(normalizedBasePath)
      ) {
        patternForMatch = patternForMatch.slice(normalizedBasePath.length);
        if (!patternForMatch) {
          patternForMatch = "/";
        }
      }

      if (pattern === "*") {
        // 匹配所有路由
        pageRoutes.forEach((route) => {
          matchedRoutes.add(route.path);
        });
      } else if (pattern.startsWith("/") && pattern.includes("*")) {
        // 通配符模式
        pageRoutes.forEach((route) => {
          // 从路由路径中移除 basePath 前缀（如果存在）
          let routePath = route.path;
          if (
            normalizedBasePath !== "/" &&
            routePath.startsWith(normalizedBasePath)
          ) {
            routePath = routePath.slice(normalizedBasePath.length);
            // 如果移除后为空，说明是根路径，设置为 "/"
            if (!routePath) {
              routePath = "/";
            }
          }

          // 检查是否匹配模式
          if (this.matchRoutePattern(routePath, patternForMatch)) {
            matchedRoutes.add(route.path); // 使用原始路径（包含 basePath）
          }
        });
      } else {
        // 具体路由路径，需要处理 basePath
        let fullRoute = pattern;
        if (
          normalizedBasePath !== "/" && !pattern.startsWith(normalizedBasePath)
        ) {
          // 如果模式路径不包含 basePath，添加 basePath 前缀
          fullRoute = normalizedBasePath +
            (pattern.startsWith("/") ? pattern : "/" + pattern);
        }
        matchedRoutes.add(fullRoute);
      }
    }

    // 第二步：处理排除模式，从匹配的路由中移除被排除的路由
    if (excludePatterns.length > 0) {
      const routesToExclude = new Set<string>();

      for (const pattern of excludePatterns) {
        // 处理 basePath
        let normalizedPattern = pattern;
        if (
          normalizedBasePath !== "/" &&
          !pattern.startsWith(normalizedBasePath)
        ) {
          normalizedPattern = normalizedBasePath +
            (pattern.startsWith("/") ? pattern : "/" + pattern);
        }

        // 从模式中移除 basePath 用于匹配
        let patternForMatch = normalizedPattern;
        if (
          normalizedBasePath !== "/" &&
          patternForMatch.startsWith(normalizedBasePath)
        ) {
          patternForMatch = patternForMatch.slice(normalizedBasePath.length);
          if (!patternForMatch) {
            patternForMatch = "/";
          }
        }

        if (pattern === "*") {
          // 排除所有路由
          matchedRoutes.forEach((route) => {
            routesToExclude.add(route);
          });
        } else if (pattern.startsWith("/") && pattern.includes("*")) {
          // 通配符排除模式
          matchedRoutes.forEach((routePath) => {
            // 从路由路径中移除 basePath 前缀（如果存在）
            let routePathForMatch = routePath;
            if (
              normalizedBasePath !== "/" &&
              routePathForMatch.startsWith(normalizedBasePath)
            ) {
              routePathForMatch = routePathForMatch.slice(
                normalizedBasePath.length,
              );
              // 如果移除后为空，说明是根路径，设置为 "/"
              if (!routePathForMatch) {
                routePathForMatch = "/";
              }
            }

            // 检查是否匹配排除模式
            if (this.matchRoutePattern(routePathForMatch, patternForMatch)) {
              routesToExclude.add(routePath);
            }
          });
        } else {
          // 具体路由路径排除
          let fullRoute = pattern;
          if (
            normalizedBasePath !== "/" &&
            !pattern.startsWith(normalizedBasePath)
          ) {
            fullRoute = normalizedBasePath +
              (pattern.startsWith("/") ? pattern : "/" + pattern);
          }
          routesToExclude.add(fullRoute);
        }
      }

      // 从匹配的路由中移除被排除的路由
      routesToExclude.forEach((route) => {
        matchedRoutes.delete(route);
      });
    }

    return Array.from(matchedRoutes);
  }

  /**
   * 处理页面路由
   */
  private async handlePageRoute(
    routeInfo: RouteInfo,
    req: Request,
    res: Response,
  ): Promise<void> {
    // 立即捕获 routeInfo 的关键值，避免在异步操作过程中被其他并发请求修改
    // 这很重要，因为 routeInfo 对象可能被多个请求共享
    const routePath = routeInfo.path;
    const routeFilePath = routeInfo.filePath;

    // 加载页面模块
    const pageModule = await this.loadPageModule(routeInfo, res);

    // 先执行 load 函数（如果存在），因为 load 函数可能会进行重定向
    // 如果 load 函数进行了重定向，就不需要默认导出的页面组件了
    let pageData: Record<string, unknown> = {};
    const hasLoadFunction = pageModule.load &&
      typeof pageModule.load === "function";

    if (hasLoadFunction) {
      pageData = await this.loadPageData(pageModule, req, res, routePath);

      // 检查是否在 load 函数中进行了重定向
      // 如果响应状态码是 301 或 302，并且设置了 location header，说明已经重定向，直接返回
      if (
        (res.status === 301 || res.status === 302) &&
        res.headers.get("location")
      ) {
        return; // 重定向已设置，直接返回，不继续渲染页面
      }
    }

    // 获取页面组件
    const PageComponent = pageModule.default as (
      props: Record<string, unknown>,
    ) => unknown;

    // 如果没有默认导出的页面组件，检查是否是因为只需要重定向
    // 如果 load 函数存在但没有重定向，说明需要页面组件，报错
    // 如果 load 函数不存在，也需要页面组件，报错
    if (!PageComponent || typeof PageComponent !== "function") {
      // 如果只有 load 函数且没有重定向，说明需要页面组件
      if (hasLoadFunction) {
        const errorMsg = "Page component not found";
        console.error("\n❌ ========== 页面组件错误 ==========");
        console.error("请求路径:", req.url);
        console.error("请求方法:", req.method);
        console.error("错误:", errorMsg);
        console.error("路由文件:", routeInfo.filePath);
        console.error(
          "提示: 如果只需要重定向，请在 load 函数中使用 res.redirect()",
        );
        console.error("===================================\n");
        res.status = 500;
        res.html(`<h1>500 - ${errorMsg}</h1>`);
        return;
      } else {
        // 没有 load 函数也没有页面组件，报错
        const errorMsg = "Page component not found";
        console.error("\n❌ ========== 页面组件错误 ==========");
        console.error("请求路径:", req.url);
        console.error("请求方法:", req.method);
        console.error("错误:", errorMsg);
        console.error("路由文件:", routeInfo.filePath);
        console.error("===================================\n");
        res.status = 500;
        res.html(`<h1>500 - ${errorMsg}</h1>`);
        return;
      }
    }

    // 如果 load 函数还没有执行（没有 load 函数），现在加载页面数据
    if (!hasLoadFunction) {
      pageData = await this.loadPageData(pageModule, req, res);
    }

    // 提取页面元数据（metadata）用于 SEO
    // 支持 metadata 为对象或函数（函数可以接收与 load 函数相同的完整参数）
    let pageMetadata: Record<string, unknown> | undefined;
    if (pageModule.metadata) {
      if (typeof pageModule.metadata === "function") {
        // metadata 是函数，调用它获取元数据
        // 传递与 load 函数相同的完整参数，并额外添加 data（load 函数返回的数据）
        try {
          // 获取 session（如果存在）
          let session = req.session || null;
          if (!session && typeof req.getSession === "function") {
            session = await req.getSession();
          }

          // 导入数据库访问函数
          const { getDatabase } = await import(
            "../features/database/access.ts"
          );

          const metadataResult = await pageModule.metadata({
            req,
            res,
            params: req.params,
            query: req.query,
            cookies: req.cookies,
            session: session,
            getCookie: (name: string) => req.getCookie(name),
            getSession: async () => {
              if (typeof req.getSession === "function") {
                return await req.getSession();
              }
              return null;
            },
            // 提供数据库访问（如果已初始化）
            db: (() => {
              try {
                return getDatabase();
              } catch {
                return null;
              }
            })(),
            // 提供当前语言代码（如果 i18n 插件已设置）
            lang: (req as any).lang,
            // 提供 Store 实例（如果 store 插件已设置）
            store: (req as any).getStore ? (req as any).getStore() : undefined,
            // 额外提供 data（load 函数返回的数据）
            data: pageData,
          });
          // 确保返回的是对象
          if (metadataResult && typeof metadataResult === "object") {
            pageMetadata = metadataResult as Record<string, unknown>;
          }
        } catch (error) {
          logger.warn("metadata 函数执行失败", {
            error: error instanceof Error ? error.message : String(error),
          });
          pageMetadata = undefined;
        }
      } else if (typeof pageModule.metadata === "object") {
        // metadata 是对象，直接使用
        pageMetadata = pageModule.metadata as Record<string, unknown>;
      }
    }

    // 将 metadata 存储到 req 对象上，供 SEO 插件使用
    if (pageMetadata) {
      (req as any).pageMetadata = pageMetadata;
    }

    const pageProps = {
      params: req.params,
      query: req.query,
      data: pageData,
      // 提供当前语言代码（如果 i18n 插件已设置）
      lang: (req as any).lang,
      // 提供 Store 实例（如果 store 插件已设置）
      store: (req as any).getStore ? (req as any).getStore() : undefined,
      // 添加 metadata 到 props，供客户端脚本使用
      metadata: pageMetadata,
      // 提供当前路由路径
      routePath: routePath,
      // 提供 URL 对象
      url: new URL(req.url),
    };

    // 获取渲染配置
    const {
      renderMode,
      shouldHydrate,
      LayoutComponents,
      layoutData,
      layoutDisabled,
    } = await this
      .getRenderConfig(
        pageModule,
        routeInfo,
        req,
        res,
      );

    // 尝试流式渲染
    // 如果适配器支持 renderToStream 且不是 CSR 模式，则尝试使用流式渲染
    const supportStreaming = this.renderAdapter.renderToStream &&
      renderMode !== "csr";

    if (supportStreaming) {
      try {
        // 1. 创建页面 VNode
        // createPageVNode 会处理 Layout(Layout(Page)) 的嵌套结构
        const pageVNode = await this.createPageVNode(
          PageComponent,
          LayoutComponents,
          layoutData,
          pageProps,
          req,
          routeInfo,
        );

        // 2. 加载 _app.tsx 组件
        const appPath = this.router.getApp();
        if (!appPath) {
          throw new Error("_app.tsx 文件不存在，这是框架必需的文件");
        }
        const appFullPath = resolveFilePath(appPath);
        const appModule = await this.importModuleWithAlias(appFullPath);
        const AppComponent = appModule.default;

        if (!AppComponent || typeof AppComponent !== "function") {
          throw new Error("_app.tsx 必须导出默认组件函数");
        }

        // 3. 创建 App VNode (包裹页面 VNode)
        // 将 pageVNode 作为 children 传递给 App 组件
        const appElement = this.renderAdapter.createElement(
          AppComponent as any,
          { children: pageVNode },
        );

        // 4. 准备注入脚本
        // 获取所有需要在 head 和 body 中注入的脚本
        const { headScripts, bodyScripts } = await this.getInjectionScripts(
          routeInfo,
          renderMode,
          shouldHydrate,
          pageProps,
          layoutDisabled,
          layoutData,
        );

        // 5. 渲染为流
        // 使用非空断言，因为我们已经检查了 supportStreaming
        const stream = await this.renderAdapter.renderToStream!(appElement);

        // 6. 注入脚本到流中
        // 使用 TransformStream 动态注入脚本
        const finalStream = this.injectScriptsToStream(
          stream,
          headScripts,
          bodyScripts,
        );

        // 7. 发送响应
        res.status = 200;
        res.headers.set("Content-Type", "text/html; charset=utf-8");
        res.body = finalStream;
        return;
      } catch (error) {
        // 如果流式渲染失败，记录警告并降级到普通渲染
        // 这保证了系统的健壮性
        const errorMsg = error instanceof Error ? error.message : String(error);
        // 如果是已知的“不支持流式渲染”错误，仅在调试模式下记录
        if (
          errorMsg.includes("不支持流式渲染") ||
          errorMsg.includes("Preact 适配器")
        ) {
          logger.debug(`[Streaming] 适配器不支持流式渲染，降级到 SSR`);
        } else {
          // 其他流式渲染错误也降级为 debug，避免干扰开发
          logger.debug(
            `[Streaming] 流式渲染失败，降级到 SSR: ${errorMsg}`,
          );
        }
        // 继续执行后续的 renderPageContent 逻辑
      }
    }

    // 渲染页面内容
    // 支持异步页面组件和异步布局组件
    let html: string;
    try {
      html = await this.renderPageContent(
        PageComponent,
        LayoutComponents,
        layoutData,
        pageProps,
        renderMode,
        req,
        routeInfo,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("\n❌ ========== 渲染页面组件失败 ==========");
      console.error("请求路径:", req.url);
      console.error("请求方法:", req.method);
      console.error("错误:", errorMsg);
      if (error instanceof Error && error.stack) {
        console.error("错误堆栈:");
        console.error(error.stack);
      }
      console.error("===================================\n");

      // 尝试渲染自定义错误页面
      const errorHtml = await this.renderErrorPage(500, error, req, res);
      if (errorHtml) {
        res.html(errorHtml, { status: 500 });
        return;
      }

      // 如果没有自定义错误页面，使用默认错误 HTML
      const defaultErrorHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>500 - 渲染页面组件失败</title>
</head>
<body>
  <h1>500 - 渲染页面组件失败</h1>
  <p>${errorMsg}</p>
</body>
</html>`;
      res.html(defaultErrorHtml, { status: 500 });
      return;
    }

    // 加载 _app.tsx 组件（根应用组件，必需）
    const appPath = this.router.getApp();
    if (!appPath) {
      throw new Error("_app.tsx 文件不存在，这是框架必需的文件");
    }

    const appFullPath = resolveFilePath(appPath);
    const appModule = await this.importModuleWithAlias(appFullPath);
    const AppComponent = appModule.default as (props: {
      children: string;
    }) => unknown | Promise<unknown>;

    if (!AppComponent) {
      throw new Error(`_app.tsx 文件未导出默认组件: ${appPath}`);
    }
    if (typeof AppComponent !== "function") {
      throw new Error(`_app.tsx 导出的默认组件不是函数: ${appPath}`);
    }

    // 使用 _app.tsx 组件包裹页面内容（支持异步组件）
    let appElement;
    try {
      // 支持异步组件：如果组件返回 Promise，则等待它
      const result = AppComponent({ children: html });
      appElement = result instanceof Promise ? await result : result;
      if (!appElement) {
        throw new Error("_app.tsx 组件返回了空值");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("\n❌ ========== App 组件错误 ==========");
      console.error("请求路径:", req.url);
      console.error("请求方法:", req.method);
      console.error("错误:", errorMsg);
      if (error instanceof Error && error.stack) {
        console.error("错误堆栈:");
        console.error(error.stack);
      }
      console.error("===================================\n");

      // 尝试渲染自定义错误页面
      const errorHtml = await this.renderErrorPage(500, error, req, res);
      if (errorHtml) {
        res.html(errorHtml, { status: 500 });
        return;
      }

      // 如果没有自定义错误页面，使用默认错误 HTML
      res.html(`<h1>500 - App Component Error</h1><p>${errorMsg}</p>`, {
        status: 500,
      });
      return;
    }

    // 渲染完整的 HTML
    let fullHtml: string;
    try {
      const renderResult = this.renderAdapter.renderToString(appElement);
      // 处理异步 renderToString（Vue3）
      fullHtml = renderResult instanceof Promise
        ? await renderResult
        : renderResult;
      if (!fullHtml || fullHtml.trim() === "") {
        throw new Error("_app.tsx 渲染结果为空");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("\n❌ ========== 渲染错误 ==========");
      console.error("请求路径:", req.url);
      console.error("请求方法:", req.method);
      console.error("错误:", errorMsg);
      if (error instanceof Error && error.stack) {
        console.error("错误堆栈:");
        console.error(error.stack);
      }
      console.error("===================================\n");

      // 尝试渲染自定义错误页面
      const errorHtml = await this.renderErrorPage(500, error, req, res);
      if (errorHtml) {
        res.html(errorHtml, { status: 500 });
        return;
      }

      // 如果没有自定义错误页面，使用默认错误 HTML
      res.html(`<h1>500 - Render Error</h1><p>${errorMsg}</p>`, {
        status: 500,
      });
      return;
    }

    // 注入脚本
    // 注意：使用在 handlePageRoute 开始时捕获的 routePath 和 routeFilePath
    // 这样可以避免在异步操作过程中被其他并发请求修改
    const routeInfoForScript: RouteInfo = {
      path: routePath, // 使用在函数开始时捕获的值
      filePath: routeFilePath, // 使用在函数开始时捕获的值
      type: routeInfo.type,
      params: routeInfo.params ? [...routeInfo.params] : undefined, // 数组副本
      isCatchAll: routeInfo.isCatchAll,
      clientModulePath: routeInfo.clientModulePath,
    };

    fullHtml = await this.injectScripts(
      fullHtml,
      routeInfoForScript,
      renderMode,
      shouldHydrate,
      pageProps,
      layoutDisabled,
      req,
      layoutData, // 传递布局的 load 数据
    );

    // 设置响应
    if (!fullHtml || fullHtml.trim() === "") {
      const errorMsg = "页面渲染结果为空";
      console.error("\n❌ ========== 页面渲染结果为空 ==========");
      console.error("请求路径:", req.url);
      console.error("请求方法:", req.method);
      console.error("错误:", errorMsg);
      console.error("===================================\n");

      // 尝试渲染自定义错误页面
      const error = new Error(errorMsg);
      const errorHtml = await this.renderErrorPage(500, error, req, res);
      if (errorHtml) {
        res.html(errorHtml, { status: 500 });
        return;
      }

      // 如果没有自定义错误页面，使用默认错误 HTML
      res.html(`<h1>500 - Internal Server Error</h1><p>${errorMsg}</p>`, {
        status: 500,
      });
      return;
    }

    // 使用 res.html() 方法设置响应，确保 Content-Type 正确设置
    res.html(fullHtml, { status: 200 });
  }

  /**
   * 处理批量预加载请求
   * 返回路由和组件模块路径的映射，供客户端预加载
   */
  private async handleBatchPrefetch(
    req: Request,
    res: Response,
  ): Promise<void> {
    // 只处理 GET 请求
    if (req.method !== "GET") {
      res.status = 405;
      res.json({ error: "Method not allowed" });
      return;
    }

    try {
      // 检查是否启用了预加载（enabled 默认为 true，只有显式设置为 false 时才禁用）
      const prefetchEnabled = this.config?.prefetch?.enabled !== false;
      if (!prefetchEnabled) {
        res.status = 200;
        res.json({});
        return;
      }

      // 获取 prefetch 配置
      const prefetchConfig = this.config?.prefetch?.routes;
      if (!Array.isArray(prefetchConfig) || prefetchConfig.length === 0) {
        res.status = 200;
        res.json({});
        return;
      }

      // 解析预加载路由
      const routes = this.resolvePrefetchRoutes(prefetchConfig);
      if (routes.length === 0) {
        res.status = 200;
        res.json({});
        return;
      }

      const url = new URL(req.url);

      // 处理每个路由，获取模块路径和页面数据
      // 使用并行处理提高性能，但限制并发数量避免资源耗尽
      const batchData: Array<{
        route: string;
        body: string;
        pageData: Record<string, unknown>;
        layouts?: Record<string, string>; // 布局组件代码映射（key: 布局路径, value: 布局代码）
      }> = [];

      // 并行处理所有路由，但限制并发数量（最多同时处理 10 个路由）
      const CONCURRENT_LIMIT = 10;
      const routeChunks: string[][] = [];
      for (let i = 0; i < routes.length; i += CONCURRENT_LIMIT) {
        routeChunks.push(routes.slice(i, i + CONCURRENT_LIMIT));
      }

      for (const routeChunk of routeChunks) {
        const chunkResults = await Promise.allSettled(
          routeChunk.map((route) =>
            this.processRouteForPrefetch(route, req, url, res)
          ),
        );

        for (const result of chunkResults) {
          if (result.status === "fulfilled" && result.value) {
            batchData.push(result.value);
          }
        }
      }

      // 返回路由、组件代码和页面数据的数组
      res.status = 200;
      res.json(batchData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      res.status = 500;
      res.json({ error: `Batch prefetch failed: ${errorMsg}` });
    }
  }

  /**
   * 处理单个路由的预加载（用于并行处理）
   * @param route 路由路径
   * @param req 原始请求对象
   * @param url URL 对象
   * @param res 响应对象（用于错误处理）
   * @returns 路由数据，如果处理失败返回 null
   */
  private async processRouteForPrefetch(
    route: string,
    req: Request,
    url: URL,
    res: Response,
  ): Promise<
    {
      route: string;
      body: string;
      pageData: Record<string, unknown>;
      layouts?: Record<string, string>;
    } | null
  > {
    try {
      // 匹配路由
      const routeInfo = this.router.match(route);
      if (!routeInfo || routeInfo.type !== "page") {
        return null;
      }

      // 创建模拟请求对象用于加载页面数据
      // 需要包含所有扩展方法（getCookie, getHeader, getSession 等）
      const routeUrl = new URL(route, req.url);
      const mockNativeReq = new Request(routeUrl.toString(), {
        method: "GET",
        headers: req.headers,
      });
      const mockReq = this.createExtendedRequest(req, mockNativeReq);
      // 更新 params/query（路由匹配后的参数，url 是只读的，不能设置）
      (mockReq as any).params = {};
      (mockReq as any).query = {};

      // 加载页面模块（支持路径别名）
      // 注意：即使 loadPageModule 失败，我们仍然可以继续处理，因为 handleModuleRequest 会处理路径别名
      let pageModule: Record<string, unknown> | null = null;
      let loadData: Record<string, unknown> = {};
      let renderMode: string | undefined;
      let layoutDisabled: boolean = false;
      let layoutData: Record<string, unknown>[] | undefined;

      try {
        // 添加超时处理，避免 loadPageModule 挂起
        const loadPageModulePromise = this.loadPageModule(routeInfo, res);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("加载页面模块超时")), 15000); // 15秒超时
        });
        pageModule = await Promise.race([
          loadPageModulePromise,
          timeoutPromise,
        ]);
        if (pageModule && pageModule.default) {
          // 加载页面数据（load 函数返回的数据）
          try {
            loadData = await this.loadPageData(pageModule, mockReq, res);
          } catch (loadDataError) {
            // load 函数执行失败不影响预加载，使用空数据
            console.warn(
              `[Batch Prefetch] 加载页面数据失败: ${route}`,
              loadDataError,
            );
          }

          // 获取渲染配置（用于获取布局路径和布局数据）
          const renderConfig = await this.getRenderConfig(
            pageModule,
            routeInfo,
            mockReq,
            res,
          );
          renderMode = renderConfig.renderMode;
          layoutDisabled = renderConfig.layoutDisabled;
          layoutData = renderConfig.layoutData; // 保存布局数据
        }
      } catch (loadError) {
        // 如果加载失败（可能是路径别名问题），记录警告但继续处理
        // 因为 handleModuleRequest 会正确处理路径别名并编译代码
        console.warn(
          `[Batch Prefetch] 加载页面模块失败（将跳过页面数据和布局）: ${route}`,
          loadError instanceof Error ? loadError.message : String(loadError),
        );
        // 使用默认渲染模式
        renderMode = "csr";
        layoutDisabled = false;
        layoutData = undefined;
      }

      // 构建模块路径
      let modulePath: string;
      if (routeInfo.clientModulePath) {
        modulePath = `./${routeInfo.clientModulePath}`;
      } else {
        modulePath = resolveFilePath(routeInfo.filePath);
      }

      // 转换为 HTTP URL（模块请求路径，filePathToHttpUrl 已经包含了 /__modules/ 前缀）
      const moduleHttpUrl = filePathToHttpUrl(modulePath);

      // 获取布局路径（参考 injectScripts 中的逻辑）
      const layoutPathsForClient: string[] = [];
      if (!layoutDisabled) {
        try {
          const layoutFilePaths = this.router.getAllLayouts(routeInfo.path);
          for (const layoutFilePath of layoutFilePaths) {
            try {
              // 加载布局模块以检查 layout 属性
              const layoutFullPath = resolveFilePath(layoutFilePath);
              const layoutModule = await this.importModuleWithAlias(
                layoutFullPath,
              );

              // 检查是否设置了 layout = false（禁用继承）
              if (layoutModule.layout === false) {
                // 添加当前布局到客户端路径列表
                const layoutRoute = this.router.getAllRoutes().find((r) =>
                  r.filePath === layoutFilePath
                );
                if (layoutRoute?.clientModulePath) {
                  layoutPathsForClient.push(layoutRoute.clientModulePath);
                } else {
                  const layoutHttpUrl = filePathToHttpUrl(layoutFullPath);
                  layoutPathsForClient.push(layoutHttpUrl);
                }
                // 停止继承，不再加载后续的布局
                break;
              }

              // 检查布局路由信息，看是否有 clientModulePath
              const layoutRoute = this.router.getAllRoutes().find((r) =>
                r.filePath === layoutFilePath
              );
              if (layoutRoute?.clientModulePath) {
                layoutPathsForClient.push(layoutRoute.clientModulePath);
              } else {
                const layoutHttpUrl = filePathToHttpUrl(layoutFullPath);
                layoutPathsForClient.push(layoutHttpUrl);
              }
            } catch (_layoutError) {
              // 布局加载失败不影响，跳过该布局
            }
          }
        } catch (_error) {
          // 静默处理错误
        }
      }

      // 构建完整的 pageData（包含客户端预加载需要的所有字段）
      const pageData = {
        ...loadData, // load 函数返回的数据（如 jsrPackageUrl）
        route: moduleHttpUrl, // 组件路径（用于 import）
        renderMode: renderMode || "csr", // 渲染模式
        layoutPath: layoutPathsForClient.length > 0
          ? layoutPathsForClient[0]
          : null, // 单个布局路径（向后兼容）
        allLayoutPaths: layoutPathsForClient.length > 0
          ? layoutPathsForClient
          : null, // 所有布局路径
        layoutData: layoutData || undefined, // 布局的 load 数据（例如 menus）
        props: {
          params: (mockReq as any).params || {},
          query: (mockReq as any).query || {},
        },
      };

      // 创建模块请求来获取组件代码
      const moduleReqUrl = moduleHttpUrl.startsWith("http")
        ? moduleHttpUrl
        : `${url.origin}${moduleHttpUrl}`;
      const moduleReq = new Request(moduleReqUrl, {
        method: "GET",
        headers: req.headers,
      });

      // 转换为扩展的请求对象
      const extendedModuleReq = this.createExtendedRequest(req, moduleReq);

      // 创建临时响应对象来获取模块代码
      const tempRes = {
        status: 200,
        body: null as string | null,
        headers: new Headers(),
        setHeader: function (key: string, value: string) {
          this.headers.set(key, value);
        },
        json: function (data: unknown) {
          this.body = JSON.stringify(data);
        },
        text: function (data: string) {
          this.body = data;
        },
      } as any;

      // 处理模块请求（获取页面组件代码）
      await this.handleModuleRequest(extendedModuleReq, tempRes);

      // 如果成功获取页面组件代码，继续获取布局组件代码
      if (tempRes.body && tempRes.status === 200) {
        const layouts: Record<string, string> = {};

        // 获取所有布局组件的代码
        if (layoutPathsForClient && layoutPathsForClient.length > 0) {
          for (const layoutPath of layoutPathsForClient) {
            // 如果布局已经存在，跳过（避免重复获取相同的布局组件）
            if (layouts[layoutPath]) {
              continue;
            }

            try {
              // 构建布局模块的 HTTP URL
              let layoutHttpUrl: string;
              if (layoutPath.startsWith("http")) {
                layoutHttpUrl = layoutPath;
              } else if (layoutPath.startsWith("/")) {
                // 绝对路径（开发环境）
                layoutHttpUrl = layoutPath.startsWith("/__modules/")
                  ? layoutPath
                  : `/__modules/${layoutPath}`;
                if (!layoutHttpUrl.startsWith("http")) {
                  layoutHttpUrl = `${url.origin}${layoutHttpUrl}`;
                }
              } else {
                // 相对路径（生产环境的 clientModulePath，如 "81e2f5821399146.js"）
                layoutHttpUrl = `${url.origin}/__modules/${layoutPath}`;
              }

              // 创建布局模块请求
              const layoutModuleReq = new Request(layoutHttpUrl, {
                method: "GET",
                headers: req.headers,
              });
              const extendedLayoutReq = this.createExtendedRequest(
                req,
                layoutModuleReq,
              );

              // 创建临时响应对象来获取布局代码
              const layoutTempRes = {
                status: 200,
                body: null as string | null,
                headers: new Headers(),
                setHeader: function (key: string, value: string) {
                  this.headers.set(key, value);
                },
                json: function (data: any) {
                  this.body = JSON.stringify(data);
                },
                text: function (data: string) {
                  this.body = data;
                },
              } as any;

              // 处理布局模块请求
              await this.handleModuleRequest(
                extendedLayoutReq,
                layoutTempRes,
              );

              // 如果成功获取布局代码，存储到 layouts 中（使用原始路径作为 key）
              if (layoutTempRes.body && layoutTempRes.status === 200) {
                layouts[layoutPath] = layoutTempRes.body;
              }
            } catch (_layoutError) {
              // 布局加载失败不影响，跳过该布局
            }
          }
        }

        // 返回页面组件代码和布局组件代码
        return {
          route,
          body: tempRes.body,
          pageData,
          layouts: Object.keys(layouts).length > 0 ? layouts : undefined,
        };
      }

      return null;
    } catch (error: unknown) {
      // 单个路由处理失败时静默处理，返回 null
      console.warn(`[Batch Prefetch] 处理路由失败: ${route}`, error);
      return null;
    }
  }

  /**
   * 处理 404 错误
   */
  private async handle404(_req: Request, res: Response): Promise<void> {
    const errorPagePath = this.router.getErrorPage("404");

    if (errorPagePath) {
      try {
        const errorModule = await import(
          errorPagePath.startsWith("file://")
            ? errorPagePath
            : `file://${errorPagePath}`
        );
        const ErrorComponent = errorModule.default;
        if (ErrorComponent) {
          const errorVNode = this.renderAdapter.createElement(
            ErrorComponent as any,
            {},
          );
          const htmlResult = this.renderAdapter.renderToString(errorVNode);
          const html = htmlResult instanceof Promise
            ? await htmlResult
            : htmlResult;
          res.status = 404;
          res.html(html);
          return;
        }
      } catch (_error) {
        // 静默处理错误
      }
    }

    // 默认 404 响应
    res.status = 404;
    res.html("<h1>404 - Page Not Found</h1>");
  }

  /**
   * 处理错误
   */
  private async handleError(
    error: unknown,
    req: Request,
    res: Response,
  ): Promise<void> {
    // 使用统一的错误日志工具
    const { logError, getErrorStatusCode, getErrorMessage } = await import(
      "../common/errors/index.ts"
    );

    // 获取当前路由信息（如果有）
    const routeInfo = this.router?.match(req.url || "/");

    // 记录错误
    logError(error, {
      request: {
        url: req.url,
        method: req.method,
      },
      route: routeInfo
        ? {
          path: routeInfo.path,
          filePath: routeInfo.filePath,
          type: routeInfo.type,
        }
        : undefined,
    });

    // 获取错误状态码和消息
    const statusCode = getErrorStatusCode(error);
    const errorMessage = getErrorMessage(error);

    // 尝试加载自定义错误页面
    const errorPagePath = this.router.getErrorPage("error");

    if (errorPagePath) {
      try {
        const errorModule = await import(
          errorPagePath.startsWith("file://")
            ? errorPagePath
            : `file://${errorPagePath}`
        );
        const ErrorComponent = errorModule.default;
        if (ErrorComponent) {
          const errorVNode = this.renderAdapter.createElement(
            ErrorComponent as any,
            { error: { message: errorMessage, statusCode } },
          );
          const htmlResult = this.renderAdapter.renderToString(errorVNode);
          const html = htmlResult instanceof Promise
            ? await htmlResult
            : htmlResult;
          res.status = statusCode;
          res.html(html);
          return;
        }
      } catch (_err) {
        // 加载错误页面失败时静默处理，使用默认错误响应
      }
    }

    // 默认错误响应
    res.status = statusCode;
    res.html(
      `<h1>${statusCode} - ${
        statusCode === 404
          ? "Not Found"
          : statusCode === 400
          ? "Bad Request"
          : "Internal Server Error"
      }</h1><p>${errorMessage}</p>`,
    );
  }
}
