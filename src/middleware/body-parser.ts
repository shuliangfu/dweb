/**
 * Body Parser 中间件
 * 解析请求体（JSON、Form Data、Multipart）
 */

import type { Middleware, Request } from "../types/index.ts";

/**
 * Body Parser 选项
 */
export interface BodyParserOptions {
  json?: {
    limit?: string;
    strict?: boolean;
  };
  urlencoded?: {
    extended?: boolean;
    limit?: string;
  };
  text?: {
    limit?: string;
  };
  raw?: {
    limit?: string;
  };
}

/**
 * 解析大小限制（字符串转字节）
 */
function parseLimit(limit: string): number {
  const units: Record<string, number> = {
    "kb": 1024,
    "mb": 1024 * 1024,
    "gb": 1024 * 1024 * 1024,
  };

  const match = limit.toLowerCase().match(/^(\d+)(kb|mb|gb)?$/);
  if (!match) {
    return 1024 * 1024; // 默认 1MB
  }

  const size = parseInt(match[1]);
  const unit = match[2] || "b";

  return size * (units[unit] || 1);
}

/**
 * 创建 Body Parser 中间件
 * @param options Body Parser 选项
 * @returns 中间件函数
 */
export function bodyParser(options: BodyParserOptions = {}): Middleware {
  const {
    json = { limit: "1mb", strict: true },
    urlencoded = { extended: true, limit: "1mb" },
    text = { limit: "1mb" },
    raw = { limit: "1mb" },
  } = options;

  return async (req, res, next) => {
    const contentType = req.headers.get("content-type") || "";
    const contentLength = req.headers.get("content-length");

    // 如果没有请求体，直接跳过
    if (!contentLength || parseInt(contentLength) === 0) {
      // 扩展请求对象，设置 body 为 undefined
      const extendedReq = req as Request & { body?: unknown };
      extendedReq.body = undefined;
      await next();
      return;
    }

    // 检查内容长度
    if (contentLength) {
      const length = parseInt(contentLength);
      const maxLength = Math.max(
        json.limit ? parseLimit(json.limit) : 0,
        urlencoded.limit ? parseLimit(urlencoded.limit) : 0,
        text.limit ? parseLimit(text.limit) : 0,
        raw.limit ? parseLimit(raw.limit) : 0,
      );

      if (length > maxLength) {
        res.status = 413;
        res.json({ error: "Request entity too large" });
        return;
      }
    }

    try {
      // 扩展请求对象，添加 body 属性
      const extendedReq = req as Request & { body?: unknown };

      // 解析 JSON
      if (contentType.includes("application/json")) {
        const text = await req.text();
        if (text) {
          extendedReq.body = JSON.parse(text);
        } else {
          extendedReq.body = {};
        }
      } // 解析 URL 编码的表单数据
      else if (contentType.includes("application/x-www-form-urlencoded")) {
        const text = await req.text();
        const params = new URLSearchParams(text);
        const body: Record<string, string> = {};
        params.forEach((value, key) => {
          body[key] = value;
        });
        extendedReq.body = body;
      } // 解析文本
      else if (contentType.includes("text/")) {
        extendedReq.body = await req.text();
      } // 解析 FormData
      else if (contentType.includes("multipart/form-data")) {
        extendedReq.body = await req.formData();
      } // 其他情况，解析为原始数据
      else {
        const arrayBuffer = await req.arrayBuffer();
        extendedReq.body = new Uint8Array(arrayBuffer);
      }
    } catch (error) {
      res.status = 400;
      const message = error instanceof Error ? error.message : String(error);
      res.json({ error: `Failed to parse request body: ${message}` });
      return;
    }

    await next();
  };
}
