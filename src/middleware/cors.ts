/**
 * CORS 中间件
 * 处理跨域资源共享
 */

import type { Middleware } from "../common/types/index.ts";

/**
 * CORS 选项
 */
export interface CorsOptions {
  origin?: string | string[] | ((origin: string | null) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * 创建 CORS 中间件
 * @param options CORS 选项
 * @returns 中间件函数
 */
export function cors(options: CorsOptions = {}): Middleware {
  const {
    origin = "*",
    methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders = ["Content-Type", "Authorization"],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400,
  } = options;

  return async (req, res, next) => {
    const requestOrigin = req.headers.get("origin");

    // 处理预检请求
    if (req.method === "OPTIONS") {
      // 设置允许的来源
      if (typeof origin === "function") {
        if (origin(requestOrigin)) {
          res.setHeader("Access-Control-Allow-Origin", requestOrigin || "*");
        }
      } else if (Array.isArray(origin)) {
        if (requestOrigin && origin.includes(requestOrigin)) {
          res.setHeader("Access-Control-Allow-Origin", requestOrigin);
        }
      } else {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }

      // 设置允许的方法
      res.setHeader("Access-Control-Allow-Methods", methods.join(", "));

      // 设置允许的请求头
      res.setHeader("Access-Control-Allow-Headers", allowedHeaders.join(", "));

      // 设置暴露的响应头
      if (exposedHeaders.length > 0) {
        res.setHeader(
          "Access-Control-Expose-Headers",
          exposedHeaders.join(", "),
        );
      }

      // 设置是否允许携带凭证
      if (credentials) {
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }

      // 设置预检请求的缓存时间
      if (maxAge) {
        res.setHeader("Access-Control-Max-Age", maxAge.toString());
      }

      res.status = 204;
      return;
    }

    // 处理普通请求
    // 设置允许的来源
    if (typeof origin === "function") {
      if (origin(requestOrigin)) {
        res.setHeader("Access-Control-Allow-Origin", requestOrigin || "*");
      }
    } else if (Array.isArray(origin)) {
      if (requestOrigin && origin.includes(requestOrigin)) {
        res.setHeader("Access-Control-Allow-Origin", requestOrigin);
      }
    } else {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }

    // 设置暴露的响应头
    if (exposedHeaders.length > 0) {
      res.setHeader("Access-Control-Expose-Headers", exposedHeaders.join(", "));
    }

    // 设置是否允许携带凭证
    if (credentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    await next();
  };
}
