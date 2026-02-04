/**
 * 路由级中间件
 */

import type { Context, Next } from "@dreamer/dweb";

export async function middleware(_ctx: Context, next: Next) {
  await next();
}
