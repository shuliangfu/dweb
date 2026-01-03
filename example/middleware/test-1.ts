/**
 * 测试中间件 1
 * 记录请求信息
 */

import type { Middleware } from "@dreamer/dweb";

/**
 * 测试中间件 1：请求日志记录
 */
const testMiddleware1: Middleware = async (req, res, next) => {
  const url = new URL(req.url);

  // 记录请求信息
  console.log(`[测试中间件 1] ${req.method} ${url.pathname}`);

  // 添加自定义响应头
  res.setHeader("X-Test-Middleware-1", "processed");

  // 调用下一个中间件
  await next();

  // 请求处理后的逻辑
  console.log(`[测试中间件 1] ${req.method} ${url.pathname} - 完成`);
};

export default testMiddleware1;
