/**
 * 日志中间件
 * 记录请求日志
 */

import type { Middleware } from "../common/types/index.ts";
import { shouldUseColor } from "../server/console/ansi.ts";

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

  /**
   * 判断是否是静态资源请求
   * 静态资源请求不应该记录日志
   */
  const isStaticResource = (pathname: string): boolean => {
    // 静态资源路径前缀
    const staticPrefixes = [
      "/__modules/", // 模块请求
      "/__scripts/", // 脚本请求
      "/__i18n/", // 国际化资源
      "/__prefetch/", // 预取请求
      "/assets/", // 静态资源目录
    ];

    // 检查是否是静态资源路径
    for (const prefix of staticPrefixes) {
      if (pathname.startsWith(prefix)) {
        return true;
      }
    }

    // 检查是否是静态文件扩展名
    const staticExtensions = [
      ".js",
      ".mjs",
      ".css",
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      ".webp",
      ".ico",
      ".woff",
      ".woff2",
      ".ttf",
      ".otf",
      ".eot",
      ".mp4",
      ".webm",
      ".mp3",
      ".wav",
      ".ogg",
      ".pdf",
      ".zip",
    ];

    // 检查路径是否以静态文件扩展名结尾（但排除 API 路由）
    if (!pathname.startsWith("/api/")) {
      for (const ext of staticExtensions) {
        if (pathname.endsWith(ext)) {
          return true;
        }
      }
    }

    return false;
  };

  // 默认跳过 Chrome DevTools 的自动请求、Docker 健康检查请求和静态资源请求
  const defaultSkip = (req: { url: string; method: string }) => {
    const url = new URL(req.url);
    // 跳过 Chrome DevTools 请求
    if (
      url.pathname.startsWith("/.well-known/") ||
      url.pathname.endsWith("/com.chrome.devtools.json") ||
      url.pathname === "/@vite/client"
    ) {
      return true;
    }
    // 跳过健康检查请求
    if (
      url.pathname === "/health" || url.pathname === "/?health" ||
      url.searchParams.has("health")
    ) {
      return true;
    }
    // 跳过静态资源请求
    if (isStaticResource(url.pathname)) {
      return true;
    }
    // 跳过 Docker 健康检查请求（通常是 GET / 且 user-agent 是 curl）
    // 注意：这里无法直接访问 headers，需要在中间件内部检查
    return false;
  };

  return async (req, res, next) => {
    const url = new URL(req.url);
    const userAgent = req.headers.get("user-agent") || "";

    // 跳过 Docker 健康检查请求（GET / 且 user-agent 是 curl）
    if (
      req.method === "GET" &&
      url.pathname === "/" &&
      userAgent.toLowerCase().includes("curl")
    ) {
      await next();
      return;
    }

    // 跳过某些请求（默认跳过 Chrome DevTools 请求，以及用户自定义的 skip 函数）
    if (
      defaultSkip({ url: req.url, method: req.method }) ||
      (skip && skip({ url: req.url, method: req.method }))
    ) {
      await next();
      return;
    }

    const start = Date.now();

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
        // 使用共用的颜色检测函数
        const useColor = shouldUseColor();
        const statusColor = useColor
          ? (res.status >= 500
            ? "\x1b[31m"
            : res.status >= 400
            ? "\x1b[33m"
            : "\x1b[32m")
          : "";
        const resetColor = useColor ? "\x1b[0m" : "";
        console.log(
          `${statusColor}${req.method}${resetColor} ${url.pathname} ${statusColor}${res.status}${resetColor} ${duration}ms`,
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
