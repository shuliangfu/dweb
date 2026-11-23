/**
 * Session Cookie 签名与生产环境安全默认。
 *
 * 生产启用 session 时要求 `cookie.secret`（≥32 字符），并用 HMAC-SHA256
 * 签名 session Cookie，避免未签名 ID 被伪造。开发环境可不设密钥。
 * 生产默认 `secure: true`、`sameSite: "strict"`，不覆盖用户已显式设置的值。
 */

import type { Middleware } from "@dreamer/middleware";
import type { CsrfOptions } from "@dreamer/middlewares";
import type { HttpContext } from "@dreamer/server";
import type { SessionOptions } from "@dreamer/session";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { AppConfig } from "../types/app.ts";
import { DwebErrorCode, throwDwebError } from "./errors.ts";

/** 生产环境 session 签名密钥最短长度 */
export const MIN_COOKIE_SECRET_LENGTH = 32;

export type ResolvedSessionSecurity = {
  session?: SessionOptions;
  cookieSecret?: string;
  enableCsrf: boolean;
  csrfOptions: CsrfOptions | Record<string, never>;
};

/**
 * 用 HMAC-SHA256 签名 Cookie 值（`value.signature`，signature 为 base64url）。
 */
export function signCookieValue(value: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(value, "utf8").digest(
    "base64url",
  );
  return `${value}.${sig}`;
}

/**
 * 校验并拆出已签名 Cookie 的原值。签名缺失或错误时返回 undefined。
 */
export function unsignCookieValue(
  signed: string | undefined,
  secret: string,
): string | undefined {
  if (!signed) return undefined;
  const lastDot = signed.lastIndexOf(".");
  if (lastDot <= 0) return undefined;
  const value = signed.slice(0, lastDot);
  const sig = signed.slice(lastDot + 1);
  const expected = createHmac("sha256", secret).update(value, "utf8").digest(
    "base64url",
  );
  if (!safeEqualStr(sig, expected)) return undefined;
  return value;
}

function safeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * 解析 session / CSRF / Cookie 生产默认。
 * 生产启用 session 但缺少足够长的 `cookie.secret` 时抛错。
 */
export function resolveSessionSecurity(
  config: AppConfig,
  isRuntimeDev: boolean,
): ResolvedSessionSecurity {
  const enableCsrf = config.csrf === false
    ? false
    : config.csrf != null || Boolean(config.session);
  const csrfOptions = typeof config.csrf === "object" && config.csrf !== null
    ? config.csrf
    : {};

  if (!config.session) {
    return { enableCsrf, csrfOptions };
  }

  const cookieSecret = typeof config.cookie?.secret === "string"
    ? config.cookie.secret
    : undefined;

  if (!isRuntimeDev) {
    if (!cookieSecret || cookieSecret.length < MIN_COOKIE_SECRET_LENGTH) {
      throwDwebError(DwebErrorCode.CONFIG_COOKIE_SECRET_REQUIRED);
    }
  }

  const cookie = { ...(config.session.cookie ?? {}) };
  if (!isRuntimeDev) {
    if (cookie.secure === undefined) cookie.secure = true;
    if (cookie.sameSite === undefined) cookie.sameSite = "strict";
  }

  return {
    session: { ...config.session, cookie },
    cookieSecret,
    enableCsrf,
    csrfOptions,
  };
}

/**
 * 在 session 中间件读写指定 Cookie 时自动签名 / 验签。
 */
export function wrapSessionCookieSigning(
  sessionMw: Middleware<HttpContext>,
  cookieName: string,
  secret: string,
): Middleware<HttpContext> {
  return async (ctx, next) => {
    const original = ctx.cookies;
    ctx.cookies = new Proxy(original, {
      get(target, prop, receiver) {
        if (prop === "get") {
          return (name: string) => {
            const value = target.get(name);
            if (name !== cookieName) return value;
            return unsignCookieValue(value, secret);
          };
        }
        if (prop === "set") {
          return (
            name: string,
            value: string,
            options?: Parameters<HttpContext["cookies"]["set"]>[2],
          ) => {
            const signed = name === cookieName
              ? signCookieValue(value, secret)
              : value;
            return target.set(name, signed, options);
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).bind(target)
          : value;
      },
    });
    try {
      await sessionMw(ctx, next);
    } finally {
      ctx.cookies = original;
    }
  };
}
