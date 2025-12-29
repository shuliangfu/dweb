import type { Middleware, Request, Response } from "../common/types/index.ts";

/**
 * Helmet 配置选项
 */
export interface HelmetOptions {
  /**
   * 是否启用 DNS 预取控制
   * 默认: true
   */
  dnsPrefetchControl?: boolean | { allow: boolean };

  /**
   * 是否启用 X-Frame-Options
   * 默认: 'SAMEORIGIN'
   */
  frameguard?: boolean | { action: "DENY" | "SAMEORIGIN" };

  /**
   * 是否启用 X-Download-Options
   * 默认: true
   */
  ieNoOpen?: boolean;

  /**
   * 是否启用 X-Content-Type-Options
   * 默认: true
   */
  noSniff?: boolean;

  /**
   * 是否启用 X-XSS-Protection
   * 默认: true
   */
  xssFilter?: boolean;
}

/**
 * Helmet 中间件
 * 设置各种 HTTP 安全头
 */
export function helmet(options: HelmetOptions = {}): Middleware {
  return async (_req: Request, res: Response, next: () => Promise<void>) => {
    // DNS Prefetch Control
    if (options.dnsPrefetchControl !== false) {
      const allow = typeof options.dnsPrefetchControl === "object"
        ? options.dnsPrefetchControl.allow
        : false;
      res.setHeader("X-DNS-Prefetch-Control", allow ? "on" : "off");
    }

    // X-Frame-Options
    if (options.frameguard !== false) {
      const action = typeof options.frameguard === "object"
        ? options.frameguard.action
        : "SAMEORIGIN";
      res.setHeader("X-Frame-Options", action);
    }

    // X-Download-Options
    if (options.ieNoOpen !== false) {
      res.setHeader("X-Download-Options", "noopen");
    }

    // X-Content-Type-Options
    if (options.noSniff !== false) {
      res.setHeader("X-Content-Type-Options", "nosniff");
    }

    // X-XSS-Protection
    if (options.xssFilter !== false) {
      res.setHeader("X-XSS-Protection", "1; mode=block");
    }

    await next();
  };
}

/**
 * CSP 配置选项
 */
export interface CSPOptions {
  /**
   * 是否在报告模式下运行
   */
  reportOnly?: boolean;

  /**
   * CSP 指令
   */
  directives?: Record<string, string[] | string>;
}

/**
 * 内容安全策略 (CSP) 中间件
 */
export function contentSecurityPolicy(options: CSPOptions = {}): Middleware {
  return async (_req: Request, res: Response, next: () => Promise<void>) => {
    const headerName = options.reportOnly
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy";

    const directives = options.directives || {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "block-all-mixed-content": [],
      "font-src": ["'self'", "https:", "data:"],
      "frame-ancestors": ["'self'"],
      "img-src": ["'self'", "data:"],
      "object-src": ["'none'"],
      "script-src": ["'self'"],
      "script-src-attr": ["'none'"],
      "style-src": ["'self'", "https:", "'unsafe-inline'"],
      "upgrade-insecure-requests": [],
    };

    const policy = Object.entries(directives)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key} ${value.join(" ")}`;
        }
        return value ? `${key} ${value}` : key;
      })
      .join("; ");

    res.setHeader(headerName, policy);

    await next();
  };
}

/**
 * 安全配置选项
 */
export interface SecurityOptions extends HelmetOptions {
  /**
   * 内容安全策略 (CSP) 配置
   */
  csp?: CSPOptions | boolean;
}

/**
 * 综合安全中间件
 * 组合 Helmet 和 CSP 功能
 */
export function security(options: SecurityOptions = {}): Middleware {
  const helmetMiddleware = helmet(options);
  const cspOptions = typeof options.csp === "boolean"
    ? (options.csp ? {} : undefined)
    : options.csp;
  const cspMiddleware = cspOptions ? contentSecurityPolicy(cspOptions) : null;

  return async (
    req: Request,
    res: Response,
    next: () => Promise<void>,
    app: any,
  ) => {
    // 执行 Helmet 中间件
    await helmetMiddleware(req, res, async () => {
      // 执行 CSP 中间件（如果启用）
      if (cspMiddleware) {
        await cspMiddleware(req, res, next, app);
      } else {
        await next();
      }
    }, app);
  };
}
