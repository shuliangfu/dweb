/**
 * 框架内置 HTTP 中间件装配（从 app.ts 拆出，行为不变）
 *
 * 顺序：dev-no-cache → security-headers → 可选 cors/rateLimit/metrics →
 * compression（非 dev 默认开）→ requestId / requestLogger → 可选 session → /health
 *
 * Socket / 用户 middlewares / 路由 仍由 App 后续注册。
 *
 * @module
 */

import type { Middleware } from "@dreamer/middleware";
import {
  compression,
  cors,
  metrics,
  rateLimit,
  requestId,
  requestLogger,
} from "@dreamer/middlewares";
import type { HttpContext } from "@dreamer/server";
import { session } from "@dreamer/session";
import type { ServiceContainer } from "@dreamer/service";
import type { AppConfig } from "../types/app.ts";
import {
  resolveHttpCorsOptions,
  shouldWarnOpenCors,
} from "../utils/cors-resolve.ts";
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
    const corsOpts = resolveHttpCorsOptions(config.cors)!;
    if (shouldWarnOpenCors(config.cors, opts.isRuntimeDev)) {
      getLogger(container).warn(
        'cors: true enables Access-Control-Allow-Origin "*"; prefer cors: { origin: ["https://app.example.com"] } in production',
      );
    }
    server.use(cors(corsOpts), undefined, "cors");
  }
  if (config.rateLimit) {
    const rateOpts = config.rateLimit === true ? {} : config.rateLimit;
    server.use(rateLimit(rateOpts), undefined, "rate-limit");
  }
  if (config.metrics) {
    const metricsOpts = config.metrics === true ? {} : config.metrics;
    server.use(metrics(metricsOpts), undefined, "metrics");
  }
  /**
   * 压缩：`start`/`build`（非 RUNTIME_ENV=dev）默认开启；
   * 显式 `compression: false` 关闭；`true`/对象按配置透传。
   * 开发态仍默认关（有 dev-no-cache 时收益有限，且便于调试）。
   */
  const compressionOpt = config.compression;
  const enableCompression = compressionOpt === false
    ? false
    : compressionOpt != null
    ? true
    : !opts.isRuntimeDev;
  if (enableCompression) {
    const compOpts =
      typeof compressionOpt === "object" && compressionOpt !== null
        ? compressionOpt
        : {};
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
