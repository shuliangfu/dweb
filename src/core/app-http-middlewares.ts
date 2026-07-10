/**
 * 框架内置 HTTP 中间件装配（从 app.ts 拆出，行为不变）
 *
 * 顺序：dev-no-cache → security-headers → 可选 cors/rateLimit/compression
 * → requestId / requestLogger → 可选 session → /health
 *
 * Socket / 用户 middlewares / 路由 仍由 App 后续注册。
 *
 * @module
 */

import type { Middleware } from "@dreamer/middleware";
import {
  compression,
  cors,
  rateLimit,
  requestId,
  requestLogger,
} from "@dreamer/middlewares";
import type { HttpContext } from "@dreamer/server";
import { session } from "@dreamer/session";
import type { ServiceContainer } from "@dreamer/service";
import type { AppConfig } from "../types/app.ts";
import { getLogger } from "../utils/logger.ts";
import {
  createDevNoCacheMiddleware,
  createHealthCheckMiddleware,
  createSecurityHeadersMiddleware,
} from "./middleware.ts";

/** 最小 server 面：仅需 use（与 @dreamer/server Server 兼容） */
export interface FrameworkHttpServer {
  use: (
    middleware: Middleware<HttpContext>,
    condition?: string | Middleware<HttpContext>,
    name?: string,
  ) => void;
}

/**
 * 注册框架默认 HTTP 中间件栈（不含 Socket、用户配置 middlewares、路由）。
 *
 * @param server HTTP 服务器
 * @param config 合并后的 AppConfig
 * @param container 服务容器
 * @param opts.isRuntimeDev RUNTIME_ENV===dev
 * @param opts.useDetailedRequestLog 是否使用详细请求日志
 */
export function registerFrameworkHttpMiddlewares(
  server: FrameworkHttpServer,
  config: AppConfig,
  container: ServiceContainer,
  opts: {
    isRuntimeDev: boolean;
    useDetailedRequestLog: boolean;
  },
): void {
  server.use(
    createDevNoCacheMiddleware(opts.isRuntimeDev),
    undefined,
    "dev-no-cache",
  );
  server.use(
    createSecurityHeadersMiddleware(config),
    undefined,
    "security-headers",
  );

  if (config.cors) {
    const corsOpts = config.cors === true ? {} : config.cors;
    server.use(cors(corsOpts), undefined, "cors");
  }
  if (config.rateLimit) {
    const rateOpts = config.rateLimit === true ? {} : config.rateLimit;
    server.use(rateLimit(rateOpts), undefined, "rate-limit");
  }
  if (config.compression) {
    const compOpts = config.compression === true ? {} : config.compression;
    server.use(compression(compOpts), undefined, "compression");
  }

  server.use(requestId());
  server.use(
    requestLogger({
      logger: getLogger(container),
      skip: (ctx) => ctx.path.startsWith("/.well-known/"),
      detailed: opts.useDetailedRequestLog,
    }),
  );

  if (config.session) {
    server.use(session(config.session), undefined, "session");
  }

  server.use(
    createHealthCheckMiddleware(container),
    "/health",
    "health-check",
  );
}
