/**
 * 中间件模块
 * 统一导出所有内置中间件，用于处理 HTTP 请求和响应
 *
 * 此模块提供以下中间件：
 *
 * **基础中间件**
 * - `logger` - 请求日志记录
 * - `cors` - 跨域资源共享（CORS）支持
 * - `bodyParser` - 请求体解析（JSON、表单等）
 * - `staticFiles` - 静态文件服务
 *
 * **安全中间件**
 * - `security` - 安全头设置（CSP、XSS 防护等）
 * - `rateLimit` - 请求频率限制（防止滥用）
 * - `ipFilter` - IP 地址过滤（黑白名单）
 * - `auth` - JWT 身份验证
 *
 * **工具中间件**
 * - `health` - 健康检查端点
 * - `requestId` - 请求 ID 生成（用于追踪）
 * - `errorHandler` - 统一错误处理
 *
 * @example
 * ```typescript
 * import { logger, cors, bodyParser, auth } from "@dreamer/dweb/middleware";
 * import { Application } from "@dreamer/dweb";
 *
 * const app = new Application();
 * await app.initialize();
 *
 * // 添加中间件
 * app.use(logger());
 * app.use(cors({ origin: "*" }));
 * app.use(bodyParser());
 * app.use(auth({ secret: "your-secret-key" }));
 *
 * await app.start();
 * ```
 *
 * @module
 */

export { logger } from "./logger.ts";
export { cors, type CorsOptions } from "./cors.ts";
export { bodyParser, type BodyParserOptions } from "./body-parser.ts";
export { staticFiles } from "./static.ts";
export type { StaticOptions } from "../common/types/index.ts";
export { security, type SecurityOptions } from "./security.ts";
export { health, type HealthOptions } from "./health.ts";
export {
  rateLimit,
  type RateLimitOptions,
  type RateLimitStore,
} from "./rate-limit.ts";
export {
  auth,
  type AuthOptions,
  type JWTPayload,
  signJWT,
  verifyJWT,
} from "./auth.ts";
export { ipFilter, type IPFilterOptions } from "./ip-filter.ts";
export { requestId, type RequestIdOptions } from "./request-id.ts";
export { errorHandler, type ErrorHandlerOptions } from "./error-handler.ts";
