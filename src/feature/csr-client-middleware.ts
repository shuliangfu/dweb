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
  cwd,
  getEnv,
  join,
  readTextFile,
  resolve,
  stat,
} from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";
import { getInferredBuildOutputDirs } from "../utils/build-dirs.ts";
import {
  CLIENT_OUTPUT_MAIN_FILENAME,
  HASHED_ASSET_CACHE_CONTROL,
  isHashedAssetFilename,
  UNHASHED_CLIENT_ENTRY_CACHE_CONTROL,
} from "../utils/constants.ts";
import { $tr } from "../utils/i18n.ts";
import { getLogger } from "../utils/logger.ts";
import { isPathWithinProject } from "../utils/path.ts";
import {
  buildClientScript,
  getCachedClientScript,
} from "./csr-client-builder.ts";
import { findChunkContent, isClientChunkFile } from "./csr-client-chunk.ts";

/** 生产态静态文件内存缓存上限（按绝对路径） */
const PROD_CLIENT_FILE_CACHE_MAX = 64;

interface ProdClientFileCacheEntry {
  body: string;
  /** 未哈希文件的 mtime；哈希文件省略（immutable） */
  mtimeMs?: number;
}

const prodClientFileCache = new Map<string, ProdClientFileCacheEntry>();

/** 测试或进程内重置时清空生产静态文件缓存 */
export function clearProdClientFileCache(): void {
  prodClientFileCache.clear();
}

function rememberProdClientFile(
  absPath: string,
  entry: ProdClientFileCacheEntry,
): void {
  if (prodClientFileCache.has(absPath)) {
    prodClientFileCache.delete(absPath);
  }
  prodClientFileCache.set(absPath, entry);
  while (prodClientFileCache.size > PROD_CLIENT_FILE_CACHE_MAX) {
    const oldest = prodClientFileCache.keys().next().value;
    if (oldest === undefined) break;
    prodClientFileCache.delete(oldest);
  }
}

async function readMtimeMs(absPath: string): Promise<number> {
  try {
    const info = await stat(absPath);
    return info.mtime?.getTime() ?? 0;
  } catch {
    return 0;
  }
}

/**
 * 生产态读取客户端产物：哈希文件名首次读后常驻；未哈希按 mtime 校验。
 */
async function readProdClientFile(
  absPath: string,
  fileName: string,
): Promise<string | null> {
  try {
    if (isHashedAssetFilename(fileName)) {
      const hit = prodClientFileCache.get(absPath);
      if (hit) return hit.body;
      const body = await readTextFile(absPath);
      rememberProdClientFile(absPath, { body });
      return body;
    }

    const mtimeMs = await readMtimeMs(absPath);
    if (mtimeMs <= 0) return null;
    const hit = prodClientFileCache.get(absPath);
    if (hit && hit.mtimeMs === mtimeMs) return hit.body;
    const body = await readTextFile(absPath);
    rememberProdClientFile(absPath, { body, mtimeMs });
    return body;
  } catch {
    return null;
  }
}

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
  const mode = (serverConfig.mode ??
    (getEnv("RUNTIME_ENV") === "dev" ? "dev" : "prod")) as
      | "dev"
      | "prod";
  const isProd = mode === "prod";

  const buildConfig = (config.build || {}) as {
    client?: { output?: string };
  };
  const clientOutputDir = buildConfig.client?.output ??
    getInferredBuildOutputDirs().client;
  const clientOutputPath = join(cwd(), clientOutputDir);

  /** 开发模式：禁止存储，避免浏览器保留旧 _client.js 导致请求已失效的 chunk URL（no-cache 仍允许存储后 revalidate，重启后可能用旧副本） */
  const devCacheControl = "no-store";

  return async (ctx: HttpContext, next: () => Promise<void>): Promise<void> => {
    const pathname = ctx.url.pathname || ctx.path || "";

    if (pathname === "/_client.js" || pathname === "/_client.js.map") {
      try {
        const isMap = pathname === "/_client.js.map";
        if (!isProd) {
          let script = getCachedClientScript();
          if (!script) {
            logger.debug($tr("log.clientBuildFirst"));
            script = await buildClientScript(container, config);
          }
          if (isMap) {
            const mapContent = script?.outputFiles?.get("_client.js.map");
            if (mapContent) {
              ctx.response = new Response(mapContent, {
                status: 200,
                headers: {
                  "Content-Type": "application/json; charset=utf-8",
                  "Cache-Control": devCacheControl,
                },
              });
            } else {
              ctx.response = new Response("{}", {
                status: 200,
                headers: {
                  "Content-Type": "application/json; charset=utf-8",
                  "Cache-Control": devCacheControl,
                },
              });
            }
            return;
          }
          if (!script?.code) {
            logger.error($tr("log.clientScriptEmpty"), {
              hasScript: !!script,
              hasCode: !!script?.code,
            });
            ctx.response = new Response(
              `console.error(${
                JSON.stringify($tr("client.clientScriptNotReady"))
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
              "Cache-Control": devCacheControl,
            },
          });
          return;
        }

        const mainFile = isMap
          ? `${CLIENT_OUTPUT_MAIN_FILENAME}.map`
          : CLIENT_OUTPUT_MAIN_FILENAME;
        const clientJsPath = join(clientOutputPath, mainFile);
        const content = await readProdClientFile(clientJsPath, mainFile);
        if (content != null) {
          ctx.response = new Response(content, {
            status: 200,
            headers: {
              "Content-Type": isMap
                ? "application/json; charset=utf-8"
                : "application/javascript; charset=utf-8",
              // 主入口文件名固定为 _client.js（无 content-hash），不可 immutable
              "Cache-Control": UNHASHED_CLIENT_ENTRY_CACHE_CONTROL,
            },
          });
          return;
        }
        if (isMap) {
          ctx.response = new Response("{}", {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": UNHASHED_CLIENT_ENTRY_CACHE_CONTROL,
            },
          });
          return;
        }
        logger.error($tr("log.clientScriptNotFound") + ":", clientJsPath);
        ctx.response = new Response(
          `console.error(${
            JSON.stringify($tr("client.clientScriptNotFound"))
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
        logger.error($tr("log.provideClientFailed") + ":", undefined, error);
        console.error(
          "[_client.js] " + $tr("log.provideClientFailed") + ":",
          errMsg,
          errStack,
        );
        const isDev = getEnv("RUNTIME_ENV") === "dev";
        const clientMsg = isDev ? errMsg : $tr("client.clientScriptLoadFailed");
        ctx.response = new Response(
          `console.error(${
            JSON.stringify($tr("client.clientScriptLoadFailed"))
          }${isDev ? `, ${JSON.stringify(clientMsg)}` : ""});`,
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
              "Cache-Control": devCacheControl,
            },
          });
          return;
        }
        // 开发模式：chunk 在内存中不存在时（如 hash 变更、重建后旧引用，或浏览器缓存了旧 _client.js）返回 404，
        // 避免 fallthrough 到路由层返回 500；用户硬刷新或清缓存即可拿到最新构建
        ctx.response = new Response("Not Found", { status: 404 });
        return;
      }

      const filePath = join(clientOutputPath, fileName);
      const resolvedChunkPath = resolve(filePath);
      if (!isPathWithinProject(resolvedChunkPath, clientOutputPath)) {
        ctx.response = new Response("Not Found", { status: 404 });
        return;
      }
      const content = await readProdClientFile(resolvedChunkPath, fileName);
      if (content != null) {
        ctx.response = new Response(content, {
          status: 200,
          headers: {
            "Content-Type": isSourceMap
              ? "application/json; charset=utf-8"
              : "application/javascript; charset=utf-8",
            "Cache-Control": isHashedAssetFilename(fileName)
              ? HASHED_ASSET_CACHE_CONTROL
              : UNHASHED_CLIENT_ENTRY_CACHE_CONTROL,
          },
        });
        return;
      }

      if (pathname.startsWith("/_client/")) {
        ctx.response = new Response("Not Found", { status: 404 });
        return;
      }
    }

    await next();
  };
}
