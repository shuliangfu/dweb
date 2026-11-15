/**
 * 升级提示 HTTP 接口：`GET /__version` 与 SSE `GET /__version/stream`。
 * 仅在 `upgradePrompt: true` 且已读到项目版本时注册。
 */

import type { Middleware } from "@dreamer/middleware";
import type { HttpContext } from "@dreamer/server";
import {
  DWEB_VERSION_PATH,
  DWEB_VERSION_STREAM_PATH,
  VERSION_ENDPOINT_CACHE_CONTROL,
} from "../utils/constants.ts";
import { sse } from "../utils/sse.ts";

/**
 * 创建版本查询与 SSE 推送中间件。
 *
 * @param version 当前进程的 `AppConfig.version`
 */
export function createUpgradePromptMiddleware(
  version: string,
): Middleware<HttpContext> {
  const jsonBody = JSON.stringify({ version });
  return async (ctx: HttpContext, next: () => Promise<void>): Promise<void> => {
    if (ctx.request.method !== "GET") {
      await next();
      return;
    }
    const path = ctx.path;
    if (path === DWEB_VERSION_PATH) {
      ctx.response = new Response(jsonBody, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": VERSION_ENDPOINT_CACHE_CONTROL,
        },
      });
      return;
    }
    if (path === DWEB_VERSION_STREAM_PATH) {
      ctx.response = sse(ctx.request, (push) => {
        push.send(version, "version");
      }, {
        retry: 3000,
        pingInterval: 15_000,
        headers: { "Cache-Control": VERSION_ENDPOINT_CACHE_CONTROL },
      });
      return;
    }
    await next();
  };
}

/**
 * 是否为升级提示的版本查询或 SSE 路径。
 *
 * @param path 请求路径
 */
export function isUpgradePromptPath(path: string): boolean {
  return path === DWEB_VERSION_PATH || path === DWEB_VERSION_STREAM_PATH;
}
