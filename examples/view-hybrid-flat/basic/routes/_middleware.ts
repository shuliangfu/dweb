/**
 * 路由级中间件（可选）
 * 请求日志、Request ID 等已由框架级中间件处理（requestId、requestLogger）
 * 可在此添加路由特定的逻辑，如鉴权、埋点等
 */

import type { Context, Next } from "@dreamer/dweb";

/**
 * 路由中间件
 * @param _ctx - 请求上下文（HttpContext）
 * @param next - 下一个中间件
 */
export async function middleware(_ctx: Context, next: Next) {
  // console.log(`[路由中间件] 进入: ${_ctx.method} ${_ctx.path}`);
  await next();
  // console.log(`[路由中间件] 离开: ${_ctx.method} ${_ctx.path}`);
}
