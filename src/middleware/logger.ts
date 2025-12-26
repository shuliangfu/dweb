/**
 * 日志中间件
 * 记录请求日志
 */

import type { Middleware } from "../types/index.ts";

/**
 * 创建日志中间件
 * @param options 日志选项
 * @returns 中间件函数
 */
export function logger(options: {
  format?: "combined" | "common" | "dev" | "short" | "tiny";
  skip?: (req: { url: string; method: string }) => boolean;
} = {}): Middleware {
  const { format = "combined", skip } = options;

  // 默认跳过 Chrome DevTools 的自动请求
  const defaultSkip = (req: { url: string; method: string }) => {
    const url = new URL(req.url);
    return url.pathname.startsWith("/.well-known/") ||
      url.pathname.endsWith("/com.chrome.devtools.json");
  };

  return async (req, res, next) => {
    // 跳过某些请求（默认跳过 Chrome DevTools 请求，以及用户自定义的 skip 函数）
    if (
      defaultSkip({ url: req.url, method: req.method }) ||
      (skip && skip({ url: req.url, method: req.method }))
    ) {
      await next();
      return;
    }

    const start = Date.now();
    const url = new URL(req.url);

    // 执行下一个中间件
    await next();

    // 等待响应体准备好（对于模块请求，可能需要一些时间）
    // 如果响应体未设置且状态是 200，等待一小段时间再检查
    if (!res.body && res.status === 200) {
      // 最多等待 100ms，每 10ms 检查一次
      let waitCount = 0;
      const maxWait = 10; // 最多等待 10 次，即 100ms
      while (!res.body && waitCount < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        waitCount++;
      }
    }

    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();

    // 根据格式输出日志
    switch (format) {
      case "combined":
        console.log(
          `${req.method} ${url.pathname} ${res.status} ${duration}ms - ${
            req.headers.get("user-agent") || "-"
          }`,
        );
        break;
      case "common":
        console.log(
          `${
            req.headers.get("host") || "-"
          } - - [${timestamp}] "${req.method} ${url.pathname} HTTP/1.1" ${res.status} -`,
        );
        break;
      case "dev": {
        const statusColor = res.status >= 500
          ? "\x1b[31m"
          : res.status >= 400
          ? "\x1b[33m"
          : "\x1b[32m";
        console.log(
          `${statusColor}${req.method}\x1b[0m ${url.pathname} ${statusColor}${res.status}\x1b[0m ${duration}ms`,
        );
        break;
      }
      case "short":
        console.log(
          `${req.method} ${url.pathname} ${res.status} ${duration}ms`,
        );
        break;
      case "tiny":
        console.log(`${req.method} ${url.pathname} ${res.status}`);
        break;
      default:
        console.log(
          `${req.method} ${url.pathname} ${res.status} ${duration}ms`,
        );
    }
  };
}
