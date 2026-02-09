/**
 * CSR 客户端脚本服务中间件
 *
 * 从 csr-client-builder 拆出，负责 /_client.js、/_client/*.js 等请求的响应。
 * 支持开发模式动态构建与生产模式静态文件服务。
 *
 * @module
 */

import type { HttpContext } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import {
  basename,
  cwd,
  exists,
  getEnv,
  join,
  readTextFile,
} from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";
import { getInferredBuildOutputDirs } from "../utils/build-dirs.ts";
import { $t } from "../utils/i18n.ts";
import { getLogger } from "../utils/logger.ts";
import {
  buildClientScript,
  CLIENT_OUTPUT_MAIN_FILENAME,
  findChunkContent,
  getCachedClientScript,
  isClientChunkFile,
} from "./csr-client-builder.ts";

/**
 * 创建客户端脚本服务中间件
 *
 * 支持代码分割：
 * - /_client.js → 主入口文件
 * - /_client/chunk-xxx.js → 分割的 chunk 文件
 * - /_client/*.js.map → source map 文件
 *
 * 生产模式：直接从预构建目录提供静态文件
 * 开发模式：动态构建客户端脚本，支持热更新
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 中间件函数
 */
export function createClientScriptMiddleware(
  container: ServiceContainer,
  config: AppConfig,
): (ctx: HttpContext, next: () => Promise<void>) => Promise<void> {
  const logger = getLogger(container);

  const serverConfig = (config.server || {}) as { mode?: "dev" | "prod" };
  const envMode = getEnv("DENO_ENV") || getEnv("BUN_ENV") ||
    getEnv("NODE_ENV") || "dev";
  const mode = serverConfig.mode || envMode as "dev" | "prod";
  const isProd = mode === "prod";

  const buildConfig = (config.build || {}) as {
    client?: { output?: string };
  };
  const clientOutputDir = buildConfig.client?.output ??
    getInferredBuildOutputDirs().client;
  const clientOutputPath = join(cwd(), clientOutputDir);

  return async (ctx: HttpContext, next: () => Promise<void>): Promise<void> => {
    const pathname = ctx.url.pathname || ctx.path || "";

    if (pathname === "/_client.js" || pathname === "/_client.js.map") {
      try {
        const isMap = pathname === "/_client.js.map";
        if (!isProd) {
          let script = getCachedClientScript();
          if (!script) {
            logger.debug($t("log.clientBuildFirst"));
            script = await buildClientScript(container, config);
          }
          if (isMap) {
            const mapContent = script?.outputFiles?.get("_client.js.map");
            if (mapContent) {
              ctx.response = new Response(mapContent, {
                status: 200,
                headers: {
                  "Content-Type": "application/json; charset=utf-8",
                  "Cache-Control": "no-cache",
                },
              });
            } else {
              ctx.response = new Response("{}", {
                status: 200,
                headers: {
                  "Content-Type": "application/json; charset=utf-8",
                  "Cache-Control": "no-cache",
                },
              });
            }
            return;
          }
          if (!script?.code) {
            logger.error($t("log.clientScriptEmpty"), {
              hasScript: !!script,
              hasCode: !!script?.code,
            });
            ctx.response = new Response(
              `console.error(${
                JSON.stringify($t("client.clientScriptNotReady"))
              });`,
              {
                status: 500,
                headers: {
                  "Content-Type": "application/javascript; charset=utf-8",
                },
              },
            );
            return;
          }
          ctx.response = new Response(script.code, {
            status: 200,
            headers: {
              "Content-Type": "application/javascript; charset=utf-8",
              "Cache-Control": "no-cache",
            },
          });
          return;
        }

        const mainFile = isMap
          ? `${CLIENT_OUTPUT_MAIN_FILENAME}.map`
          : CLIENT_OUTPUT_MAIN_FILENAME;
        const clientJsPath = join(clientOutputPath, mainFile);
        if (await exists(clientJsPath)) {
          const content = await readTextFile(clientJsPath);
          ctx.response = new Response(content, {
            status: 200,
            headers: {
              "Content-Type": isMap
                ? "application/json; charset=utf-8"
                : "application/javascript; charset=utf-8",
              "Cache-Control": "public, max-age=31536000",
            },
          });
          return;
        }
        if (isMap) {
          ctx.response = new Response("{}", {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-cache",
            },
          });
          return;
        }
        logger.error($t("log.clientScriptNotFound") + ":", clientJsPath);
        ctx.response = new Response(
          `console.error(${
            JSON.stringify($t("client.clientScriptNotFound"))
          });`,
          {
            status: 500,
            headers: {
              "Content-Type": "application/javascript; charset=utf-8",
            },
          },
        );
        return;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const errStack = error instanceof Error ? error.stack : "";
        logger.error($t("log.provideClientFailed") + ":", undefined, error);
        console.error(
          "[_client.js] " + $t("log.provideClientFailed") + ":",
          errMsg,
          errStack,
        );
        ctx.response = new Response(
          `console.error(${
            JSON.stringify($t("client.clientScriptLoadFailed"))
          }, ${JSON.stringify(errMsg)});`,
          {
            status: 500,
            headers: {
              "Content-Type": "application/javascript; charset=utf-8",
            },
          },
        );
        return;
      }
    }

    if (pathname.startsWith("/_client/") || isClientChunkFile(pathname)) {
      const fileName = pathname.startsWith("/_client/")
        ? pathname.replace("/_client/", "")
        : pathname.replace("/", "");
      const isSourceMap = fileName.endsWith(".map");

      if (!isProd) {
        const script = getCachedClientScript();
        const content = findChunkContent(
          script?.outputFiles,
          fileName,
          script?.chunkContentIndex,
          script?.chunkBaseIndex,
        );
        if (content) {
          ctx.response = new Response(content, {
            status: 200,
            headers: {
              "Content-Type": isSourceMap
                ? "application/json; charset=utf-8"
                : "application/javascript; charset=utf-8",
              "Cache-Control": "no-cache",
            },
          });
          return;
        }
        if (pathname.startsWith("/_client/")) {
          ctx.response = new Response("Not Found", { status: 404 });
          return;
        }
        await next();
        return;
      }

      const filePath = join(clientOutputPath, fileName);
      if (await exists(filePath)) {
        const content = await readTextFile(filePath);
        ctx.response = new Response(content, {
          status: 200,
          headers: {
            "Content-Type": isSourceMap
              ? "application/json; charset=utf-8"
              : "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=31536000",
          },
        });
        return;
      }
      // Windows 兼容：esbuild 可能将 chunk 输出到 outdir 根目录，而非多段路径
      if (fileName.includes("/")) {
        const fallbackPath = join(clientOutputPath, basename(fileName));
        if (await exists(fallbackPath)) {
          const content = await readTextFile(fallbackPath);
          ctx.response = new Response(content, {
            status: 200,
            headers: {
              "Content-Type": isSourceMap
                ? "application/json; charset=utf-8"
                : "application/javascript; charset=utf-8",
              "Cache-Control": "public, max-age=31536000",
            },
          });
          return;
        }
      }

      if (pathname.startsWith("/_client/")) {
        ctx.response = new Response("Not Found", { status: 404 });
        return;
      }
    }

    await next();
  };
}
