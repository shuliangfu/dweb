/**
 * 路由中间件
 * 这个中间件会应用到所有路由请求
 *
 * 支持两种导出方式：
 * 1. 默认导出单个中间件函数
 * 2. 默认导出中间件数组（多个中间件按顺序执行）
 */

import testMiddleware1 from '../middleware/test-1.ts';
import testMiddleware2 from '../middleware/test-2.ts';
import type { Middleware } from '@dreamer/dweb';

/**
 * 路由中间件函数
 * 这个中间件会记录所有请求的日志，并在响应头中添加自定义头
 */
const routeMiddleware: Middleware = async (req, res, next) => {
  // 请求处理前的逻辑
  const startTime = Date.now();
  const url = new URL(req.url);

  // 记录请求信息
  console.log(`[路由中间件] ${req.method} ${url.pathname} - 开始处理`);

  // 添加自定义响应头
  res.setHeader('X-Route-Middleware', 'processed');
  res.setHeader('X-Request-Time', new Date().toISOString());

  // 调用下一个中间件或路由处理器
  await next();

  // 请求处理后的逻辑
  const duration = Date.now() - startTime;
  console.log(`[路由中间件] ${req.method} ${url.pathname} - 处理完成 (${duration}ms)`);

  // 添加处理时间到响应头
  res.setHeader('X-Processing-Time', `${duration}ms`);
};

/**
 * 导出中间件数组
 * 中间件会按数组顺序执行：
 * 1. testMiddleware1 - 记录请求信息
 * 2. testMiddleware2 - 添加时间戳
 * 3. routeMiddleware - 主路由中间件
 */
// export default [testMiddleware1, testMiddleware2, routeMiddleware];
export default [routeMiddleware];
