/**
 * 测试中间件 2
 * 添加请求时间戳
 */

import type { Middleware } from '@dreamer/dweb';

/**
 * 测试中间件 2：添加时间戳
 */
const testMiddleware2: Middleware = async (req, res, next) => {
  const url = new URL(req.url);
  const timestamp = Date.now();
  
  // 记录时间戳
  console.log(`[测试中间件 2] ${req.method} ${url.pathname} - 时间戳: ${timestamp}`);
  
  // 添加时间戳到响应头
  res.setHeader('X-Test-Middleware-2', timestamp.toString());
  res.setHeader('X-Timestamp', new Date(timestamp).toISOString());
  
  // 调用下一个中间件
  await next();
  
  // 请求处理后的逻辑
  const duration = Date.now() - timestamp;
  console.log(`[测试中间件 2] ${req.method} ${url.pathname} - 耗时: ${duration}ms`);
};

export default testMiddleware2;

