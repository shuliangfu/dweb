/**
 * 路由请求处理模块
 * 处理路由匹配、页面渲染、API 路由调用
 */

import type {
  AppConfig,
  Middleware,
  RenderMode,
  Request,
  Response,
} from "../types/index.ts";
import type { RouteInfo, Router } from "./router.ts";
import { handleApiRoute, loadApiRoute } from "./api-route.ts";
import type { GraphQLServer } from "../features/graphql/server.ts";
import { renderToString } from "preact-render-to-string";
import type { CookieManager } from "../features/cookie.ts";
import type { SessionManager } from "../features/session.ts";
import { removeLoadOnlyImports } from "../utils/module.ts";
import * as esbuild from "esbuild";
import {
  filePathToHttpUrl,
  normalizeModulePath,
  resolveFilePath,
  resolveRelativePath,
} from "../utils/path.ts";
import { createImportMapScript } from "../utils/import-map.ts";
import { createClientScript } from "../utils/script-client.ts";
import { minifyJavaScript } from "../utils/minify.ts";
import * as path from "@std/path";
import { logger } from "../utils/logger.ts";

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
  } catch (_error) {
    // 预加载失败时静默处理
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

  constructor(
    router: Router,
    cookieManager?: CookieManager,
    sessionManager?: SessionManager,
    config?: AppConfig,
    graphqlServer?: GraphQLServer,
  ) {
    this.router = router;
    this.cookieManager = cookieManager;
    this.sessionManager = sessionManager;
    this.config = config;
    this.graphqlServer = graphqlServer;
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
        const outDir = this.config?.build?.outDir;
        if (outDir) {
          // 客户端请求：从 client 目录加载（不包含 load 函数）
          const clientOutDir = path.join(outDir, "client");
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
        try {
          // 直接等待 stat 操作完成，确保异步操作完成
          await Deno.stat(fullPath);
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
          try {
            const cwd = Deno.cwd();
            const absoluteFilePath = path.isAbsolute(fullPath)
              ? fullPath
              : path.resolve(cwd, fullPath);

            // 读取 deno.json 获取 import map（用于解析外部依赖）
            let importMap: Record<string, string> = {};
            try {
              const denoJsonPath = path.join(cwd, "deno.json");
              const denoJsonContent = await Deno.readTextFile(denoJsonPath);
              const denoJson = JSON.parse(denoJsonContent);
              if (denoJson.imports) {
                importMap = denoJson.imports;
              }
            } catch {
              // deno.json 不存在或解析失败，使用空 import map
            }

            // 收集所有外部依赖（从 import map 中提取）
            const externalPackages: string[] = [
              "@dreamer/dweb",
              "preact",
              "preact-render-to-string",
            ];

            // 从 import map 中添加所有外部依赖
            // 注意：@dreamer/dweb/client 会被打包，不添加到 external
            for (const [key, value] of Object.entries(importMap)) {
              // @dreamer/dweb/client 需要被打包，不添加到 external
              if (key === "@dreamer/dweb/client") {
                continue;
              }
              if (
                value.startsWith("jsr:") ||
                value.startsWith("npm:") ||
                value.startsWith("http")
              ) {
                externalPackages.push(key);
              }
            }

            // 使用 stdin 选项直接传入处理后的代码，确保 load 函数被移除
            // resolveDir 设置为原始文件所在目录，用于解析相对路径导入
            const originalDir = path.dirname(absoluteFilePath);
            const originalBasename = path.basename(absoluteFilePath);
            // 根据文件扩展名确定 loader
            const loader = fullPath.endsWith(".tsx") ? "tsx" : "ts";

            // 创建 JSR URL 解析插件（用于打包 @dreamer/dweb/client）
            const jsrResolverPlugin = {
              name: "jsr-resolver",
              setup(build: esbuild.PluginBuild) {
                // 解析 @dreamer/dweb/client（支持 JSR URL 和本地路径）
                build.onResolve({ filter: /^@dreamer\/dweb\/client$/ }, async (_args) => {
                  const clientImport = importMap["@dreamer/dweb/client"];
                  if (!clientImport) {
                    return undefined; // 让 esbuild 使用默认解析
                  }

                  // 如果是本地路径，解析为绝对路径
                  if (!clientImport.startsWith("jsr:") && !clientImport.startsWith("http")) {
                    const resolvedPath = path.isAbsolute(clientImport)
                      ? clientImport
                      : path.resolve(cwd, clientImport);
                    return {
                      path: resolvedPath,
                    };
                  }

                  // 如果是 JSR URL，解析为实际的 HTTP URL
                  if (clientImport.startsWith("jsr:")) {
                    try {
                      // 使用 import.meta.resolve 解析 JSR URL
                      let resolvedUrl = await import.meta.resolve(clientImport);
                      
                      // 如果返回的是 file:// 协议（本地开发），需要转换为 HTTP URL
                      if (resolvedUrl.startsWith("file://")) {
                        // 手动构建 JSR URL
                        const jsrPath = clientImport.replace(/^jsr:/, "");
                        const jsrMatch = jsrPath.match(/^@([\w-]+)\/([\w-]+)@([\d.]+)\/(.+)$/);
                        if (jsrMatch) {
                          const [, scope, packageName, version, subPath] = jsrMatch;
                          let actualSubPath = subPath;
                          if (!actualSubPath.startsWith("src/") && !actualSubPath.includes("/")) {
                            actualSubPath = `src/${subPath}.ts`;
                          } else if (!actualSubPath.endsWith(".ts") && !actualSubPath.endsWith(".tsx")) {
                            actualSubPath = `${actualSubPath}.ts`;
                          }
                          resolvedUrl = `https://jsr.io/@${scope}/${packageName}/${version}/${actualSubPath}`;
                        } else {
                          return undefined;
                        }
                      }
                      
                      return {
                        path: resolvedUrl,
                        namespace: "http-url",
                      };
                    } catch {
                      return undefined; // 解析失败，使用默认行为
                    }
                  }
                  
                  return undefined; // 不是 JSR URL，使用默认解析
                });

                // 加载 HTTP URL 内容
                build.onLoad({ filter: /.*/, namespace: "http-url" }, async (args) => {
                  try {
                    const response = await fetch(args.path);
                    if (!response.ok) {
                      throw new Error(`Failed to fetch: ${args.path} (${response.status})`);
                    }
                    const contents = await response.text();
                    return {
                      contents,
                      loader: "ts",
                    };
                  } catch (error) {
                    return {
                      errors: [{
                        text: error instanceof Error ? error.message : String(error),
                      }],
                    };
                  }
                });
              },
            };

            const result = await esbuild.build({
              stdin: {
                contents: processedContent,
                sourcefile: originalBasename, // 用于错误报告
                resolveDir: originalDir, // 用于解析相对路径导入
                loader: loader, // 指定文件类型，确保 TypeScript/JSX 语法被正确解析
              },
              bundle: true, // ✅ 打包所有依赖（包括相对路径导入 ../ 和 ./）
              format: "esm",
              target: "esnext",
              jsx: "automatic",
              jsxImportSource: "preact",
              minify: false, // 开发环境不压缩，便于调试
              treeShaking: true, // ✅ Tree-shaking
              write: false, // 不写入文件，我们手动处理
              external: externalPackages, // 外部依赖不打包（保持 import 语句）
              plugins: [jsrResolverPlugin], // 添加 JSR 解析插件
              // 设置 import map（用于解析外部依赖）
              // 注意：只对本地路径使用 alias，JSR/NPM/HTTP 导入已经在 external 中，不需要 alias
              // 相对路径导入（../ 和 ./）不会被 alias 处理，由 esbuild 自动解析和打包
              alias: Object.fromEntries(
                Object.entries(importMap)
                  .filter(
                    ([key, value]) =>
                      // 排除所有 @dreamer/dweb 相关的导入（由插件处理或保持为外部依赖）
                      !key.startsWith("@dreamer/dweb") &&
                      !value.startsWith("jsr:") &&
                      !value.startsWith("npm:") &&
                      !value.startsWith("http"),
                  )
                  .map(([key, value]) => [key, path.resolve(cwd, value)]),
              ),
            });

            if (!result.outputFiles || result.outputFiles.length === 0) {
              throw new Error("esbuild 打包结果为空");
            }

            // esbuild.build 返回的是 outputFiles 数组，取第一个
            jsCode = result.outputFiles[0].text;
          } catch (_esbuildError) {
            // 如果 esbuild 失败，使用原始内容
            jsCode = fileContent;
          }
        } else {
          // 非 TS/TSX 文件（可能是已编译的 JS 文件）
          // 直接使用原始内容
          jsCode = fileContent;
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
   * 处理 Chrome DevTools 配置请求
   */
  private handleDevToolsConfig(res: Response): void {
    res.status = 200;
    res.setHeader("Content-Type", "application/json");
    res.json({});
  }

  /**
   * 处理 JSR 模块请求（/__jsr/ 路径）
   * 将 JSR URL 转换为可通过服务端代理的 HTTP URL
   * 
   * 注意：这个方法通过 Deno 的 import map 解析 JSR URL，然后返回模块的源代码
   * 对于客户端 API（如 @dreamer/dweb/client），我们需要返回原始的 TypeScript/JavaScript 代码
   */
  private async handleJSRModuleRequest(
    _req: Request,
    res: Response,
    pathname: string,
  ): Promise<void> {
    try {
      // 提取 JSR 路径：/__jsr/@dreamer/dweb@1.3.1/client -> @dreamer/dweb@1.3.1/client
      const jsrPath = pathname.replace(/^\/__jsr\//, "");
      const jsrUrl = `jsr:${jsrPath}`;
      
      // 尝试使用 import.meta.resolve 获取正确的 JSR URL
      // 这样可以处理 JSR 的实际 URL 格式（可能不是简单的 https://jsr.io/...）
      let moduleUrl: string;
      try {
        // 使用 import.meta.resolve 解析 JSR URL（Deno 会自动处理）
        moduleUrl = await import.meta.resolve(jsrUrl);
        
        // 如果 resolve 返回的是 file:// 协议（本地开发环境），需要转换为 HTTP URL
        if (moduleUrl.startsWith("file://")) {
          // 在本地开发环境中，无法直接获取 JSR URL
          // 尝试手动构建 JSR URL
          const jsrMatch = jsrPath.match(/^@([\w-]+)\/([\w-]+)@([\d.]+)\/(.+)$/);
          if (!jsrMatch) {
            throw new Error(`Invalid JSR path format: ${jsrPath}`);
          }
          const [, scope, packageName, version, subPath] = jsrMatch;
          // JSR 的导出路径（如 client）映射到 src/client.ts
          let actualSubPath = subPath;
          if (!actualSubPath.startsWith("src/") && !actualSubPath.includes("/")) {
            // 如果是单个导出名（如 client），映射到 src/client.ts
            actualSubPath = `src/${subPath}.ts`;
          } else if (!actualSubPath.endsWith(".ts") && !actualSubPath.endsWith(".tsx")) {
            // 如果路径不包含扩展名，添加 .ts
            actualSubPath = `${actualSubPath}.ts`;
          }
          moduleUrl = `https://jsr.io/@${scope}/${packageName}/${version}/${actualSubPath}`;
        }
      } catch {
        // 如果 resolve 失败，手动构建 JSR URL
        const jsrMatch = jsrPath.match(/^@([\w-]+)\/([\w-]+)@([\d.]+)\/(.+)$/);
        if (!jsrMatch) {
          res.status = 400;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.text(`Invalid JSR path format: ${jsrPath}`);
          return;
        }
      const [, scope, packageName, version, subPath] = jsrMatch;
      // 构建 JSR URL（直接使用 https://jsr.io）
      // 注意：JSR 的导出路径（如 client）映射到 src/client.ts
      // 所以如果 subPath 不包含 src/，需要添加 src/ 前缀
      let actualSubPath = subPath;
      if (!actualSubPath.startsWith("src/") && !actualSubPath.includes("/")) {
        // 如果是单个导出名（如 client），映射到 src/client.ts
        actualSubPath = `src/${subPath}.ts`;
      } else if (!actualSubPath.endsWith(".ts") && !actualSubPath.endsWith(".tsx")) {
        // 如果路径不包含扩展名，添加 .ts
        actualSubPath = `${actualSubPath}.ts`;
      }
      moduleUrl = `https://jsr.io/@${scope}/${packageName}/${version}/${actualSubPath}`;
      }
      
      // 获取模块内容（TypeScript 文件）
      const response = await fetch(moduleUrl);
      if (!response.ok) {
        // 如果第一种格式失败，尝试其他可能的格式
        if (response.status === 404) {
          const jsrMatch = jsrPath.match(/^@([\w-]+)\/([\w-]+)@([\d.]+)\/(.+)$/);
          if (jsrMatch) {
            const [, scope, packageName, version, subPath] = jsrMatch;
            // 尝试格式2: https://deno.land/x/... (旧格式，可能不适用)
            // 或者格式3: 不带 .ts 扩展名
            const alternativeUrl = `https://jsr.io/@${scope}/${packageName}/${version}/${subPath}`;
            const altResponse = await fetch(alternativeUrl);
            if (altResponse.ok) {
              const tsContent = await altResponse.text();
              // 编译 TypeScript 为 JavaScript
              try {
                const result = await esbuild.transform(tsContent, {
                  loader: "ts",
                  format: "esm",
                  target: "esnext",
                  jsx: "automatic",
                  jsxImportSource: "preact",
                });
                res.status = 200;
                res.setHeader("Content-Type", "application/javascript; charset=utf-8");
                res.text(result.code);
                return;
              } catch (compileError) {
                res.status = 500;
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                const errorMsg = compileError instanceof Error ? compileError.message : String(compileError);
                res.text(`Compilation error: ${errorMsg}`);
                return;
              }
            }
          }
        }
        res.status = response.status;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.text(`Failed to fetch JSR module: ${moduleUrl} (${response.status})\nTried path: ${jsrPath}`);
        return;
      }
      
      const tsContent = await response.text();
      
      // 编译 TypeScript 为 JavaScript（浏览器无法直接执行 TypeScript）
      try {
        const result = await esbuild.transform(tsContent, {
          loader: "ts",
          format: "esm",
          target: "esnext",
          jsx: "automatic",
          jsxImportSource: "preact",
        });
        
        // 返回编译后的 JavaScript
        res.status = 200;
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        res.text(result.code);
      } catch (compileError) {
        // 如果编译失败，返回原始内容（虽然浏览器可能无法执行）
        res.status = 200;
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        const errorMsg = compileError instanceof Error ? compileError.message : String(compileError);
        res.text(`// Compilation error: ${errorMsg}\n${tsContent}`);
      }
    } catch (error) {
      res.status = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      const errorMsg = error instanceof Error ? error.message : String(error);
      res.text(`Error handling JSR module request: ${errorMsg}`);
    }
  }

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
      : `${url.origin}${pathname}`;
    const moduleReq = new Request(moduleReqUrl, {
      method: req.method,
      headers: req.headers,
    });

    // console.log({ pathname, url})

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
      const module = await import(filePath);

      // 支持默认导出中间件函数
      if (module.default) {
        // 如果是数组，返回数组中的所有中间件
        if (Array.isArray(module.default)) {
          return module.default.filter((m: unknown): m is Middleware =>
            typeof m === "function"
          );
        }
        // 如果是单个函数，返回包含该函数的数组
        if (typeof module.default === "function") {
          return [module.default as Middleware];
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
    const next = async (): Promise<void> => {
      if (index < middlewares.length) {
        const middleware = middlewares[index++];
        await middleware(req, res, next);
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

    // 处理 JSR 模块请求（通过服务端代理）
    if (pathname.startsWith("/__jsr/")) {
      await this.handleJSRModuleRequest(req, res, pathname);
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
      // 加载 API 路由模块
      const handlers = await loadApiRoute(routeInfo.filePath);

      // 处理 API 请求
      const result = await handleApiRoute(handlers, req.method, req, res);

      // 如果响应已经被设置（通过 res.text()、res.json() 等方法），直接返回
      if (res.body !== undefined) {
        return;
      }

      // 否则返回 JSON 响应
      res.json(result);
    } catch (error) {
      // API 路由错误应该返回 JSON，而不是 HTML
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("API 路由错误", error instanceof Error ? error : undefined, {
        url: req.url,
        method: req.method,
        errorMessage: errorMsg,
        routeFile: routeInfo.filePath,
      });

      res.status = errorMsg.includes("未找到") ? 404 : 500;
      res.json({
        success: false,
        error: errorMsg,
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
  private async loadPageModule(
    routeInfo: RouteInfo,
    res: Response,
  ): Promise<Record<string, unknown>> {
    const pagePath = resolveFilePath(routeInfo.filePath);
    try {
      const pageModule = await import(pagePath);
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
      return await pageModule.load({
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
      });
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
   * 检测组件文件是否使用了 Preact Hooks
   *
   * 该函数通过静态分析检测组件文件及其依赖是否使用了 Preact Hooks。
   * 如果检测到 Hooks 使用，框架会自动将渲染模式设置为 CSR（客户端渲染），
   * 因为 Hooks 需要在客户端环境中运行。
   *
   * 检测策略：
   * 1. 检查是否导入了 `preact/hooks`（包括各种格式：源文件、构建后、HTTP URL）
   * 2. 检查是否使用了常见的 Hooks（useState、useEffect、useCallback 等）
   * 3. 检查是否有重命名的 Hooks（如 `useState as i`）
   * 4. 递归检测所有相对路径导入的组件文件（防止循环引用）
   *
   * 支持的 Hooks：
   * - useState, useEffect, useCallback, useMemo, useRef
   * - useContext, useReducer, useLayoutEffect
   *
   * @param filePath - 组件文件的路径（相对路径或绝对路径）
   * @param visited - 已访问的文件路径集合，用于防止循环引用（递归调用时使用）
   * @returns 如果检测到使用了 Hooks 返回 `true`，否则返回 `false`
   *
   * @example
   * ```typescript
   * // 检测页面组件是否使用 Hooks
   * const usesHooks = await this.detectPreactHooks('routes/index.tsx');
   * if (usesHooks) {
   *   // 自动设置为 CSR 模式
   * }
   * ```
   *
   * @remarks
   * - 如果文件读取失败，返回 `false`（不自动设置 CSR，避免影响正常渲染）
   * - 使用保守策略：只要检测到 hooks 导入，即使没有直接使用，也认为使用了 hooks
   * - 递归检测深度受文件系统限制，但通过 `visited` 集合防止无限递归
   */
  private async detectPreactHooks(
    filePath: string,
    visited: Set<string> = new Set(),
  ): Promise<boolean> {
    try {
      // 读取文件源代码
      const fullPath = resolveFilePath(filePath);
      // 处理 file:// 协议路径
      let actualPath: string;
      if (fullPath.startsWith("file://")) {
        actualPath = new URL(fullPath).pathname;
      } else if (fullPath.startsWith("/")) {
        actualPath = fullPath;
      } else {
        actualPath = `${Deno.cwd()}/${fullPath}`;
      }

      // 防止循环引用
      if (visited.has(actualPath)) {
        return false;
      }
      visited.add(actualPath);

      const fileContent = await Deno.readTextFile(actualPath);

      // 检查是否导入了 preact/hooks
      // 匹配以下所有格式：
      // 1. 源文件格式：import { useState, useEffect } from 'preact/hooks';
      // 2. 源文件格式：import { useState, useEffect } from "preact/hooks";
      // 3. 构建后格式（无空格）：import{useState as i,useEffect as d}from"https://esm.sh/preact@10.19.2/hooks";
      // 4. 构建后格式（有空格）：import { useState as i, useEffect as d } from "https://esm.sh/preact@10.19.2/hooks";
      // 正则说明：
      // - `import\s*\{[^}]*\}` 匹配 import { ... } 或 import{...}（无空格）
      // - `\s*from\s*` 匹配 from（可能有空格，也可能没有）
      // - `['"](?:preact\/hooks|https?:\/\/[^'"]*\/preact[^'"]*\/hooks)['"]` 匹配：
      //   * 'preact/hooks' 或 "preact/hooks"（源文件）
      //   * "https://esm.sh/preact@10.19.2/hooks"（构建后的文件，包含版本号）
      //   * 其他 HTTP URL 格式的 hooks 导入
      const hasPreactHooksImport =
        /import\s*\{[^}]*\}\s*from\s*['"](?:preact\/hooks|https?:\/\/[^'"]*\/preact[^'"]*\/hooks)['"]/i
          .test(
            fileContent,
          );

      // 检查是否使用了常见的 Hooks
      // 匹配：useState(、useEffect(、const [x, setX] = useState( 等
      // 注意：构建后的代码中，hooks 可能被重命名（如 useState as i），所以需要检测原始名称和重命名后的使用
      const commonHooks = [
        "useState",
        "useEffect",
        "useCallback",
        "useMemo",
        "useRef",
        "useContext",
        "useReducer",
        "useLayoutEffect",
      ];
      const hasHooksUsage = commonHooks.some((hook) => {
        // 匹配 hook 的使用，例如：useState(、useEffect(、const [x, setX] = useState(
        // 使用单词边界 \b 确保匹配完整的 hook 名称
        const hookPattern = new RegExp(`\\b${hook}\\s*\\(`, "i");
        return hookPattern.test(fileContent);
      });

      // 如果检测到 hooks 导入，即使没有直接使用（可能被重命名），也认为使用了 hooks
      // 因为 hooks 导入通常意味着组件需要客户端交互
      if (hasPreactHooksImport) {
        // 检查是否有重命名的 hooks（如 useState as i, useEffect as d）
        // 匹配：import { useState as xxx, useEffect as yyy } from ...
        // 注意：构建后的代码可能没有空格，如 import{useState as i,useEffect as d}from"..."
        const renamedHooksPattern =
          /import\s*\{[^}]*\b(?:useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer|useLayoutEffect)\s+as\s+\w+/i;
        if (renamedHooksPattern.test(fileContent) || hasHooksUsage) {
          // 如果检测到重命名的 hooks 或直接使用 hooks，认为使用了 hooks
          return true;
        }
        // 即使没有检测到重命名，只要有 hooks 导入，也认为使用了 hooks（保守策略）
        return true;
      }

      // 如果当前文件使用了 Hooks，直接返回 true
      if (hasHooksUsage) {
        return true;
      }

      // 检测导入的相对路径组件（如 ../components/Navbar.tsx）
      // 匹配：import ... from '../components/Navbar.tsx' 或 import ... from './Navbar'
      const importRegex = /import\s+.*\s+from\s+['"](\.\.?\/[^'"]+)['"]/gi;
      const imports: string[] = [];
      let match;
      while ((match = importRegex.exec(fileContent)) !== null) {
        const importPath = match[1];
        // 只检测相对路径的导入（本地组件）
        if (importPath.startsWith("./") || importPath.startsWith("../")) {
          imports.push(importPath);
        }
      }

      // 递归检测所有导入的组件文件
      for (const importPath of imports) {
        try {
          // 解析相对路径为绝对路径
          const dir = actualPath.substring(0, actualPath.lastIndexOf("/"));
          const resolvedPath = resolveRelativePath(dir, importPath);

          // 只检测 .tsx、.ts、.jsx、.js 文件
          if (resolvedPath.match(/\.(tsx?|jsx?)$/)) {
            const componentUsesHooks = await this.detectPreactHooks(
              resolvedPath,
              visited,
            );
            if (componentUsesHooks) {
              return true;
            }
          }
        } catch (_error) {
          // 如果解析导入路径失败，跳过该导入
          continue;
        }
      }

      return false;
    } catch (_error) {
      // 如果读取文件失败，返回 false（不自动设置 CSR）
      // 这样即使检测失败，也不会影响正常渲染
      return false;
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
  ): Promise<{
    renderMode: RenderMode;
    shouldHydrate: boolean;
    LayoutComponents: ((props: { children: unknown }) => unknown)[];
    layoutDisabled: boolean;
  }> {
    // 获取渲染模式（优先级：页面组件导出 > 自动检测 > 配置 > 默认 SSR）
    const pageRenderMode = pageModule.renderMode as RenderMode | undefined;

    // 获取所有布局组件（从最具体到最通用）
    const LayoutComponents: ((props: { children: unknown }) => unknown)[] = [];

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
            const layoutModule = await import(layoutFullPath);
            const LayoutComponent = layoutModule.default;
            if (!LayoutComponent) {
              logger.warn(`布局文件 ${layoutPath} 没有默认导出`);
              continue;
            }

            // 检查是否设置了 layout = false（禁用继承）
            // 如果设置了 layout = false，则停止继承，只使用到当前布局为止的布局链
            if (layoutModule.layout === false) {
              LayoutComponents.push(LayoutComponent);
              // 停止继承，不再加载后续的布局
              break;
            }

            LayoutComponents.push(LayoutComponent);
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
    let autoDetectedMode: RenderMode | undefined = undefined;
    if (!pageRenderMode) {
      // 检测页面组件
      const pageUsesHooks = await this.detectPreactHooks(routeInfo.filePath);

      // 检测布局组件（如果存在）
      let layoutUsesHooks = false;
      for (const layoutPath of layoutPaths) {
        if (await this.detectPreactHooks(layoutPath)) {
          layoutUsesHooks = true;
          break;
        }
      }

      // 如果页面组件或布局组件使用了 Hooks，自动设置为 CSR
      if (pageUsesHooks || layoutUsesHooks) {
        autoDetectedMode = "csr";
      }
    }

    const configRenderMode = this.config?.renderMode;
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
      layoutDisabled: pageLayoutDisabled,
    };
  }

  /**
   * 渲染页面内容为 HTML
   */
  private async renderPageContent(
    PageComponent: (
      props: Record<string, unknown>,
    ) => unknown | Promise<unknown>,
    LayoutComponents:
      ((props: { children: unknown }) => unknown | Promise<unknown>)[],
    pageProps: Record<string, unknown>,
    renderMode: RenderMode,
    req?: Request,
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
      // SSR 或 Hybrid 模式：服务端渲染内容
      let pageElement;
      try {
        // 支持异步组件：如果组件返回 Promise，则等待它
        const result = PageComponent(pageProps);
        pageElement = result instanceof Promise ? await result : result;
        if (!pageElement) {
          throw new Error("页面组件返回了空值");
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`渲染页面组件失败: ${errorMsg}`);
      }

      // 如果有布局，按顺序嵌套包裹（支持异步布局组件）
      let html: string;
      try {
        if (LayoutComponents.length > 0) {
          // 从最内层到最外层嵌套布局组件
          let currentElement = pageElement;
          for (let i = 0; i < LayoutComponents.length; i++) {
            const LayoutComponent = LayoutComponents[i];
            // 支持异步布局组件：如果组件返回 Promise，则等待它
            const layoutResult = LayoutComponent({ children: currentElement });
            const layoutElement = layoutResult instanceof Promise
              ? await layoutResult
              : layoutResult;
            if (!layoutElement) {
              throw new Error("布局组件返回了空值");
            }
            currentElement = layoutElement;
          }
          html = renderToString(
            currentElement as unknown as Parameters<typeof renderToString>[0],
          );
        } else {
          html = renderToString(
            pageElement as unknown as Parameters<typeof renderToString>[0],
          );
        }

        // 确保 HTML 内容不为空
        if (!html || html.trim() === "") {
          html = "<div>页面渲染失败：内容为空</div>";
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        html = `<div>页面渲染失败: ${errorMsg}</div>`;
      }

      // SSR 和 Hybrid 模式：都需要包装在容器中以便 hydration
      if (renderMode === "hybrid" || renderMode === "ssr") {
        html = `<div>${html}</div>`;
      }

      return html;
    } finally {
      // 渲染完成后清理全局 i18n 函数
      if (req && (req as any).__clearGlobalI18n) {
        (req as any).__clearGlobalI18n();
      }
    }
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
  ): Promise<string> {
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
      if (fullHtml.includes("</head>")) {
        fullHtml = fullHtml.replace("</head>", `  ${importMapScript}\n</head>`);
      } else if (fullHtml.includes("<head>")) {
        fullHtml = fullHtml.replace("<head>", `<head>\n  ${importMapScript}`);
      } else {
        fullHtml = fullHtml.replace(
          "<html",
          `<html>\n<head>\n  ${importMapScript}\n</head>`,
        );
      }
    }

    // 预加载 Preact 模块到全局作用域（CSR/Hybrid 模式或 HMR 时需要）
    // CSR 和 Hybrid 模式需要 Preact 进行客户端渲染，所以必须预加载
    if (
      renderMode === "csr" || renderMode === "hybrid" || shouldHydrate ||
      hmrClientScript
    ) {
      const preactPreloadScriptContent = `
// 预加载 Preact 模块到全局作用域，供客户端渲染和 HMR 使用
(async function() {
  try {
    const [preactModule, jsxRuntimeModule, hooksModule] = await Promise.all([
      import('preact'),
      import('preact/jsx-runtime'),
      import('preact-router').catch(() => null), // preact-router 可能不存在，允许失败
      import('preact/hooks').catch(() => null) // preact/hooks 可能不存在，允许失败
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
        `<script type="module">${minifiedContent}</script>`;

      // 注入到 head 中（在 import map 之后）
      if (fullHtml.includes("</head>")) {
        fullHtml = fullHtml.replace(
          "</head>",
          `  ${preactPreloadScript}\n</head>`,
        );
      } else if (fullHtml.includes("<head>")) {
        fullHtml = fullHtml.replace(
          "<head>",
          `<head>\n  ${preactPreloadScript}`,
        );
      }
    }

    // 构建要注入到 head 的脚本（链接拦截器，需要尽早执行）
    const headScriptsToInject: string[] = [];

    // 构建要注入到 body 的脚本
    const scriptsToInject: string[] = [];

    // 注入客户端 JS（CSR、Hybrid 模式或明确启用 hydration 时需要）
    if (renderMode === "csr" || renderMode === "hybrid" || shouldHydrate) {
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
              const layoutModule = await import(layoutFullPath);

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
      const prefetchConfig = this.config?.prefetch?.routes;
      const prefetchLoading = this.config?.prefetch?.loading ?? false;
      const prefetchMode = this.config?.prefetch?.mode ?? "batch";
      let prefetchRoutes: string[] | undefined;

      if (Array.isArray(prefetchConfig) && prefetchConfig.length > 0) {
        prefetchRoutes = this.resolvePrefetchRoutes(prefetchConfig);
      }

      const clientScript = await createClientScript(
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
      );

      // 如果启用了预加载加载状态，注入预加载动画样式（插入到现有的 style 标签中，或创建新的 style 标签）
      if (prefetchLoading) {
        const prefetchSpinCss =
          `@keyframes spin { to { transform: rotate(360deg); }}`;

        // 查找 head 中的 style 标签
        const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);

        if (styleMatch && styleMatch.length > 0) {
          // 如果存在 style 标签，将 CSS 插入到最后一个 style 标签的内容中
          const lastStyleTag = styleMatch[styleMatch.length - 1];
          const lastStyleIndex = fullHtml.lastIndexOf(lastStyleTag);

          // 提取 style 标签的内容（不包含标签本身）
          const styleContentMatch = lastStyleTag.match(
            /<style[^>]*>([\s\S]*?)<\/style>/i,
          );
          if (styleContentMatch) {
            const existingContent = styleContentMatch[1];
            const styleTagStart = lastStyleTag.substring(
              0,
              lastStyleTag.indexOf(">") + 1,
            );
            const styleTagEnd = "</style>";

            // 检查是否已经包含 spin 动画（避免重复）
            if (!existingContent.includes("@keyframes spin")) {
              const newStyleContent = styleTagStart + existingContent +
                prefetchSpinCss + styleTagEnd;
              fullHtml = fullHtml.slice(0, lastStyleIndex) + newStyleContent +
                fullHtml.slice(lastStyleIndex + lastStyleTag.length);
            }
          }
        } else {
          // 如果不存在 style 标签，创建新的 style 标签
          const prefetchSpinStyle = `<style>${prefetchSpinCss}</style>`;

          // 查找 link[rel="stylesheet"]，在其后插入
          const linkMatch = fullHtml.match(
            /<link[^>]*rel=["']stylesheet["'][^>]*>/gi,
          );

          if (linkMatch && linkMatch.length > 0) {
            // 在最后一个 link[rel="stylesheet"] 后插入
            const lastLinkIndex = fullHtml.lastIndexOf(
              linkMatch[linkMatch.length - 1],
            );
            const insertIndex = lastLinkIndex +
              linkMatch[linkMatch.length - 1].length;
            fullHtml = fullHtml.slice(0, insertIndex) +
              `\n      ${prefetchSpinStyle}` +
              fullHtml.slice(insertIndex);
          } else if (fullHtml.includes("</head>")) {
            // 如果没有找到 link，在 </head> 之前插入
            fullHtml = fullHtml.replace(
              "</head>",
              `      ${prefetchSpinStyle}\n</head>`,
            );
          }
        }
      }

      // 对于 CSR 模式，将链接拦截器脚本注入到 head（尽早执行）
      if (renderMode === "csr" && clientScript.includes("<script>")) {
        // 提取链接拦截器脚本（第一个 <script> 标签）
        const linkInterceptorMatch = clientScript.match(
          /<script>([\s\S]*?)<\/script>/,
        );
        if (linkInterceptorMatch) {
          headScriptsToInject.push(
            `<script>${linkInterceptorMatch[1]}</script>`,
          );
          // 从 body 脚本中移除链接拦截器，只保留模块脚本
          const moduleScript = clientScript.replace(
            /<script>[\s\S]*?<\/script>\s*/,
            "",
          );
          scriptsToInject.push(moduleScript);
        } else {
          scriptsToInject.push(clientScript);
        }
      } else {
        scriptsToInject.push(clientScript);
      }
    }

    // 在开发模式下注入 HMR 客户端脚本
    if (hmrClientScript) {
      scriptsToInject.push(hmrClientScript);
    }

    // 将脚本注入到 </head> 之前（尽早执行）
    if (headScriptsToInject.length > 0) {
      const allHeadContent = headScriptsToInject.join("\n");
      if (fullHtml.includes("</head>")) {
        fullHtml = fullHtml.replace("</head>", `${allHeadContent}\n</head>`);
      } else if (fullHtml.includes("<head>")) {
        fullHtml = fullHtml.replace("<head>", `<head>\n${allHeadContent}`);
      } else {
        // 如果没有 head 标签，在开头添加
        fullHtml = `<head>${allHeadContent}</head>${fullHtml}`;
      }
    }

    // 将所有脚本注入到 </body> 之前
    if (scriptsToInject.length > 0) {
      const allScripts = scriptsToInject.join("\n");
      if (fullHtml.includes("</body>")) {
        fullHtml = fullHtml.replace("</body>", `${allScripts}\n</body>`);
      } else {
        fullHtml += allScripts;
      }
    }

    return fullHtml;
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
  private resolvePrefetchRoutes(patterns: string[]): string[] {
    const allRoutes = this.router.getAllRoutes();
    // 过滤页面路由，排除特殊路由（_middleware, _layout, _app, _404, _500, _error 等）
    const pageRoutes = allRoutes.filter((route) => {
      if (route.type !== "page") return false;
      // 排除以 _ 开头的特殊路由
      const pathSegments = route.path.split("/").filter(Boolean);
      return !pathSegments.some((segment) => segment.startsWith("_"));
    });
    const matchedRoutes = new Set<string>();

    // 获取 basePath（用于从路由路径中移除 basePath 前缀）
    const basePath = this.router.getBasePath();
    const normalizedBasePath = basePath !== "/" && basePath.endsWith("/")
      ? basePath.slice(0, -1)
      : basePath;

    for (const pattern of patterns) {
      if (pattern === "*") {
        // 匹配所有路由
        pageRoutes.forEach((route) => {
          matchedRoutes.add(route.path);
        });
      } else if (pattern.startsWith("/") && pattern.includes("*")) {
        // 通配符模式：计算最大路径深度（/ 的数量）
        // 例如：/* 最大深度为1（匹配深度 <= 1），/*/* 最大深度为2（匹配深度 <= 2），/*/*/* 最大深度为3（匹配深度 <= 3）
        const maxDepth = pattern.split("/").filter(Boolean).length;

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

          // 移除动态参数部分（如 [id]）来计算深度
          // 例如：/users/[id] -> /users/param -> 深度为 2
          const pathWithoutParams = routePath.replace(/\[[^\]]+\]/g, "param");

          // 计算路径深度（排除 basePath 后的深度）
          const routeDepth =
            pathWithoutParams.split("/").filter(Boolean).length;

          // 匹配深度 <= maxDepth 的路由（例如 /*/* 匹配深度 1 和 2）
          if (routeDepth > 0 && routeDepth <= maxDepth) {
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

    // 获取页面组件
    const PageComponent = pageModule.default as (
      props: Record<string, unknown>,
    ) => unknown;
    if (!PageComponent || typeof PageComponent !== "function") {
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

    // 提取页面元数据（metadata）用于 SEO
    // 将 metadata 存储到 req 对象上，供 SEO 插件使用
    if (pageModule.metadata && typeof pageModule.metadata === "object") {
      (req as any).pageMetadata = pageModule.metadata;
    }

    // 加载页面数据
    const pageData = await this.loadPageData(pageModule, req, res);
    // 提取页面元数据（metadata）用于 SEO
    const pageMetadata =
      pageModule.metadata && typeof pageModule.metadata === "object"
        ? pageModule.metadata
        : undefined;

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
    };

    // 获取渲染配置
    const { renderMode, shouldHydrate, LayoutComponents, layoutDisabled } =
      await this
        .getRenderConfig(
          pageModule,
          routeInfo,
        );

    // 渲染页面内容
    let html: string;
    try {
      html = await this.renderPageContent(
        PageComponent,
        LayoutComponents,
        pageProps,
        renderMode,
        req,
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
      const errorHtml = `<!DOCTYPE html>
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
      res.status = 500;
      res.body = errorHtml;
      return;
    }

    // 加载 _app.tsx 组件（根应用组件，必需）
    const appPath = this.router.getApp();
    if (!appPath) {
      throw new Error("_app.tsx 文件不存在，这是框架必需的文件");
    }

    const appFullPath = resolveFilePath(appPath);
    const appModule = await import(appFullPath);
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
      res.status = 500;
      res.html(`<h1>500 - App Component Error</h1><p>${errorMsg}</p>`);
      return;
    }

    // 渲染完整的 HTML
    let fullHtml: string;
    try {
      fullHtml = renderToString(appElement);
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
      res.status = 500;
      res.html(`<h1>500 - Render Error</h1><p>${errorMsg}</p>`);
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
    );

    // 设置响应
    if (!fullHtml || fullHtml.trim() === "") {
      const errorMsg = "页面渲染结果为空";
      console.error("\n❌ ========== 页面渲染结果为空 ==========");
      console.error("请求路径:", req.url);
      console.error("请求方法:", req.method);
      console.error("错误:", errorMsg);
      console.error("===================================\n");
      res.status = 500;
      res.html(`<h1>500 - Internal Server Error</h1><p>${errorMsg}</p>`);
      return;
    }

    res.status = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.body = fullHtml;

    // 验证响应体已设置
    if (!res.body || res.body.trim() === "") {
      res.status = 500;
      res.body = "<h1>500 - Internal Server Error</h1><p>响应体设置失败</p>";
      res.setHeader("Content-Type", "text/html; charset=utf-8");
    }
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
      const batchData: Array<{
        route: string;
        body: string;
        pageData: Record<string, unknown>;
        layouts?: Record<string, string>; // 布局组件代码映射（key: 布局路径, value: 布局代码）
      }> = [];

      for (const route of routes) {
        try {
          // 匹配路由
          const routeInfo = this.router.match(route);
          if (!routeInfo || routeInfo.type !== "page") {
            continue;
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

          // 加载页面模块
          const pageModule = await this.loadPageModule(routeInfo, res);
          if (!pageModule || !pageModule.default) {
            continue;
          }

          // 加载页面数据（load 函数返回的数据）
          const loadData = await this.loadPageData(pageModule, mockReq, res);

          // 构建模块路径
          let modulePath: string;
          if (routeInfo.clientModulePath) {
            modulePath = `./${routeInfo.clientModulePath}`;
          } else {
            modulePath = resolveFilePath(routeInfo.filePath);
          }

          // 转换为 HTTP URL（模块请求路径，filePathToHttpUrl 已经包含了 /__modules/ 前缀）
          const moduleHttpUrl = filePathToHttpUrl(modulePath);

          // 获取渲染配置（用于获取布局路径）
          const { renderMode, layoutDisabled } = await this.getRenderConfig(
            pageModule,
            routeInfo,
          );

          // 获取布局路径（参考 injectScripts 中的逻辑）
          const layoutPathsForClient: string[] = [];
          if (!layoutDisabled) {
            try {
              const layoutFilePaths = this.router.getAllLayouts(routeInfo.path);
              for (const layoutFilePath of layoutFilePaths) {
                try {
                  // 加载布局模块以检查 layout 属性
                  const layoutFullPath = resolveFilePath(layoutFilePath);
                  const layoutModule = await import(layoutFullPath);

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

            // 存储页面组件代码和布局组件代码
            batchData.push({
              route,
              body: tempRes.body,
              pageData,
              layouts: Object.keys(layouts).length > 0 ? layouts : undefined,
            });
          }
        } catch (error) {
          // 单个路由处理失败时静默处理，继续处理下一个
          console.warn(`[Batch Prefetch] 处理路由失败: ${route}`, error);
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
          const html = renderToString(ErrorComponent({}));
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
      "../utils/error.ts"
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
          const html = renderToString(
            ErrorComponent({ error: { message: errorMessage, statusCode } }),
          );
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
