/**
 * 早期请求防护：拒绝入站 Brotli 与同时出现的 Content-Length / Transfer-Encoding。
 *
 * 不依赖未发布的 @dreamer/middlewares 导出；行为与其中间件对齐。
 */

import type { Middleware } from "@dreamer/middleware";
import type { HttpContext } from "@dreamer/server";

/** 跨包读取 runtime-adapter 写入的真实远端地址。 */
export function getContextRemoteAddress(ctx: HttpContext): string | undefined {
  const fromCtx = (ctx as HttpContext & { remoteAddr?: string }).remoteAddr;
  if (fromCtx) return fromCtx;
  const map = (globalThis as unknown as Record<
    symbol,
    WeakMap<Request, string> | undefined
  >)[Symbol.for("@dreamer/runtime-adapter.remoteAddrMap")];
  return map?.get(ctx.request);
}

/** 限流键：仅在 trustProxy 时读转发头，否则用远端地址，不使用 Host。 */
export function defaultClientKey(ctx: HttpContext, trustProxy = false): string {
  if (trustProxy) {
    const forwarded = ctx.headers.get("x-forwarded-for") ??
      ctx.headers.get("X-Forwarded-For");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = ctx.headers.get("x-real-ip") ??
      ctx.headers.get("X-Real-IP") ??
      ctx.headers.get("cf-connecting-ip");
    if (realIp?.trim()) return realIp.trim();
  }
  return getContextRemoteAddress(ctx) || "unknown";
}

export function contentEncodingIncludesBr(value: string | null): boolean {
  if (!value) return false;
  return value.split(",").some((part) => part.trim().toLowerCase() === "br");
}

export function rejectBrotliRequest(
  allowBrotliRequestEncoding = false,
): Middleware<HttpContext> {
  return async (ctx, next) => {
    if (
      !allowBrotliRequestEncoding &&
      contentEncodingIncludesBr(ctx.headers.get("content-encoding"))
    ) {
      ctx.response = new Response("Unsupported Media Type", { status: 415 });
      return;
    }
    await next();
  };
}

/**
 * 若运行时仍同时暴露 Content-Length 与 Transfer-Encoding，拒绝 400。
 * 不与底层 HTTP 解析器对抗；仅在两头仍可见时拦截。
 */
export function rejectAmbiguousBodyFraming(): Middleware<HttpContext> {
  return async (ctx, next) => {
    const te = ctx.headers.get("transfer-encoding");
    const cl = ctx.headers.get("content-length");
    if (te && cl) {
      ctx.response = new Response("Bad Request", { status: 400 });
      return;
    }
    await next();
  };
}
