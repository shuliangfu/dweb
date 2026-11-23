/**
 * 框架内置 HTTP 中间件装配（从 app.ts 拆出，行为不变）
 *
 * 顺序：请求防护（拒 br / 模糊 framing）→ dev-no-cache → security-headers → 可选 cors/csrf → rateLimit/metrics →
 * compression（非 dev 默认开）→ requestId / requestLogger → 可选 session → /health
 *
 * 生产（非 dev）默认：securityHeaders 开、rateLimit 开、compression 开；
 * cors／metrics 仍 opt-in（cors 不能默认 `*`）。显式 `false` 可关默认项。
 * 启用 session 时自动开 CSRF（`csrf: false` 可关）；生产 session 须配置 cookie.secret。
 *
 * Socket / 用户 middlewares / 路由 仍由 App 后续注册。
 *
 * @module
 */

import type { Middleware } from "@dreamer/middleware";
import {
  compression,
  cors,
  csrf,
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
  resolveSessionSecurity,
  wrapSessionCookieSigning,
} from "../utils/cookie-security.ts";
import {
  resolveHttpCorsOptions,
  shouldWarnOpenCors,
} from "../utils/cors-resolve.ts";
import { getLogger } from "../utils/logger.ts";
import {
  createUpgradePromptMiddleware,
  isUpgradePromptPath,
} from "../feature/upgrade-prompt-middleware.ts";
import {
  isUpgradePromptRequested,
  readAppConfigVersion,
} from "../feature/upgrade-prompt.ts";
import { $tr } from "../utils/i18n.ts";
import {
  createDevNoCacheMiddleware,
  createHealthCheckMiddleware,
  createSecurityHeadersMiddleware,
} from "./middleware.ts";
import {
  defaultClientKey,
  rejectAmbiguousBodyFraming,
  rejectBrotliRequest,
} from "./request-guards.ts";

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
    rejectBrotliRequest(config.allowBrotliRequestEncoding === true),
    undefined,
    "reject-brotli-request",
  );
  server.use(
    rejectAmbiguousBodyFraming(),
    undefined,
    "reject-ambiguous-framing",
  );

  server.use(
    createDevNoCacheMiddleware(opts.isRuntimeDev),
    undefined,
    "dev-no-cache",
  );
  /**
   * 安全头：非 dev 默认开；`securityHeaders: false` 逃生；dev 未配置则关。
   * BREAKING（相对 3.7.x）：生产未写配置也会挂 security-headers。
   */
  server.use(
    createSecurityHeadersMiddleware(config, opts.isRuntimeDev),
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
  } else if (
    !opts.isRuntimeDev &&
    (config.kind === "api" || config.router?.apiOnly === true)
  ) {
    // cors 不能默认开 *；api 生产未配时提示白名单（同域可不配）
    getLogger(container).info(
      "kind/api production: set cors: { origin: [...] } if browsers call this API cross-origin; leaving cors unset keeps same-origin-only",
    );
  }

  const sessionSecurity = resolveSessionSecurity(config, opts.isRuntimeDev);

  // CSRF：启用 session 时自动开；`csrf: false` 显式关闭；未启用 session 则保持关闭
  if (sessionSecurity.enableCsrf) {
    server.use(csrf(sessionSecurity.csrfOptions), undefined, "csrf");
  }

  /**
   * 限流：非 dev 默认开（库默认 60s/100）；`rateLimit: false` 逃生。
   * BREAKING（相对 3.7.x）：生产未写配置也会挂 rate-limit。
   */
  const rateOpt = config.rateLimit;
  const enableRateLimit = rateOpt === false
    ? false
    : rateOpt != null
    ? true
    : !opts.isRuntimeDev;
  if (enableRateLimit) {
    const rateOpts = typeof rateOpt === "object" && rateOpt !== null
      ? rateOpt
      : {};
    const skipUpgrade = isUpgradePromptRequested(config, opts.isRuntimeDev);
    const trustProxy =
      (rateOpts as { trustProxy?: boolean }).trustProxy === true ||
      config.trustProxy === true;
    server.use(
      rateLimit({
        ...rateOpts,
        keyGenerator: rateOpts.keyGenerator ??
          ((ctx) => defaultClientKey(ctx, trustProxy)),
        skip: (ctx) =>
          (rateOpts.skip?.(ctx) ?? false) ||
          (skipUpgrade && isUpgradePromptPath(ctx.path)),
      }),
      undefined,
      "rate-limit",
    );
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
    const userFilter = compOpts.filter;
    server.use(
      compression({
        ...compOpts,
        filter: (contentType) => {
          if (contentType.includes("text/event-stream")) return false;
          if (userFilter) return userFilter(contentType);
          return (
            contentType.includes("text/") ||
            contentType.includes("application/json") ||
            contentType.includes("application/javascript") ||
            contentType.includes("application/xml") ||
            contentType.includes("application/rss+xml") ||
            contentType.includes("application/atom+xml") ||
            contentType.includes("image/svg+xml")
          );
        },
      }),
      undefined,
      "compression",
    );
  }

  server.use(requestId());
  server.use(
    requestLogger({
      logger: getLogger(container),
      skip: (ctx) =>
        ctx.path.startsWith("/.well-known/") ||
        isUpgradePromptPath(ctx.path),
      detailed: opts.useDetailedRequestLog,
    }),
  );

  if (sessionSecurity.session) {
    const sessionMw = session(sessionSecurity.session);
    const secret = sessionSecurity.cookieSecret;
    const cookieName = sessionSecurity.session.name ?? "sessionId";
    server.use(
      secret
        ? wrapSessionCookieSigning(sessionMw, cookieName, secret)
        : sessionMw,
      undefined,
      "session",
    );
  }

  server.use(
    createHealthCheckMiddleware(container),
    "/health",
    "health-check",
  );

  /**
   * 升级提示：仅 `upgradePrompt: true` 且非 dev、web 应用时挂载。
   * 版本取自 `AppConfig.version`；未填写则记录警告且不挂接口。
   */
  if (isUpgradePromptRequested(config, opts.isRuntimeDev)) {
    const version = readAppConfigVersion(config);
    if (!version) {
      getLogger(container).warn($tr("log.upgradePromptMissingVersion"));
    } else {
      server.use(
        createUpgradePromptMiddleware(version),
        undefined,
        "upgrade-prompt",
      );
    }
  }
}
