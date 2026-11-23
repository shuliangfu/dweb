/**
 * Session Cookie 签名、生产默认与 CSRF 自动开启
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import type { Middleware } from "@dreamer/middleware";
import type { HttpContext } from "@dreamer/server";
import type { SessionStore } from "@dreamer/session";
import {
  MIN_COOKIE_SECRET_LENGTH,
  resolveSessionSecurity,
  signCookieValue,
  unsignCookieValue,
  wrapSessionCookieSigning,
} from "../../src/utils/cookie-security.ts";
import { registerFrameworkHttpMiddlewares } from "../../src/core/app-http-middlewares.ts";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { initializeLogger } from "../../src/utils/logger.ts";

const SECRET = "A".repeat(MIN_COOKIE_SECRET_LENGTH);

function fakeStore(): SessionStore {
  return {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    has: async () => false,
    clear: async () => {},
  };
}

describe("resolveSessionSecurity", () => {
  it("生产环境启用 session 且未配置 secret 时应失败", () => {
    expect(() =>
      resolveSessionSecurity({ session: { store: fakeStore() } }, false)
    ).toThrow(/cookie\.secret/);
  });

  it("生产环境启用 session 且 secret 不足 32 字符时应失败", () => {
    expect(() =>
      resolveSessionSecurity({
        session: { store: fakeStore() },
        cookie: { secret: "too-short" },
      }, false)
    ).toThrow(/cookie\.secret/);
  });

  it("生产环境启用 session 且 secret 不少于 32 字符时应成功", () => {
    const resolved = resolveSessionSecurity({
      session: { store: fakeStore() },
      cookie: { secret: SECRET },
    }, false);
    expect(resolved.session).toBeDefined();
    expect(resolved.cookieSecret).toBe(SECRET);
  });

  it("生产环境未覆盖时应默认 secure 与 sameSite strict", () => {
    const resolved = resolveSessionSecurity({
      session: { store: fakeStore() },
      cookie: { secret: SECRET },
    }, false);
    expect(resolved.session?.cookie?.secure).toBe(true);
    expect(resolved.session?.cookie?.sameSite).toBe("strict");
  });

  it("生产环境不应覆盖用户显式设置的 secure 与 sameSite", () => {
    const resolved = resolveSessionSecurity({
      session: {
        store: fakeStore(),
        cookie: { secure: false, sameSite: "lax" },
      },
      cookie: { secret: SECRET },
    }, false);
    expect(resolved.session?.cookie?.secure).toBe(false);
    expect(resolved.session?.cookie?.sameSite).toBe("lax");
  });

  it("开发环境启用 session 且无 secret 时应成功，且不强制 secure/sameSite", () => {
    const resolved = resolveSessionSecurity({
      session: { store: fakeStore() },
    }, true);
    expect(resolved.session).toBeDefined();
    expect(resolved.cookieSecret).toBeUndefined();
    expect(resolved.session?.cookie?.secure).toBeUndefined();
    expect(resolved.session?.cookie?.sameSite).toBeUndefined();
  });

  it("启用 session 时应自动开启 CSRF", () => {
    const resolved = resolveSessionSecurity({
      session: { store: fakeStore() },
    }, true);
    expect(resolved.enableCsrf).toBe(true);
  });

  it("显式 csrf: false 在启用 session 时仍应关闭", () => {
    const resolved = resolveSessionSecurity({
      session: { store: fakeStore() },
      csrf: false,
    }, true);
    expect(resolved.enableCsrf).toBe(false);
  });

  it("未启用 session 且未配置 csrf 时应保持关闭", () => {
    const resolved = resolveSessionSecurity({}, false);
    expect(resolved.enableCsrf).toBe(false);
    expect(resolved.session).toBeUndefined();
  });
});

describe("signCookieValue / unsignCookieValue", () => {
  it("应能签名并还原", () => {
    const signed = signCookieValue("sid-1", SECRET);
    expect(signed).not.toBe("sid-1");
    expect(unsignCookieValue(signed, SECRET)).toBe("sid-1");
  });

  it("应拒绝未签名或被篡改的值", () => {
    expect(unsignCookieValue("sid-1", SECRET)).toBeUndefined();
    const signed = signCookieValue("sid-1", SECRET);
    expect(unsignCookieValue(signed + "x", SECRET)).toBeUndefined();
    expect(unsignCookieValue("sid-2." + signed.split(".").pop(), SECRET))
      .toBeUndefined();
  });
});

describe("wrapSessionCookieSigning", () => {
  it("写入时应签名，中间件内读取时应得到原值", async () => {
    const store = new Map<string, string>();
    const cookies = {
      get: (name: string) => store.get(name),
      set: (name: string, value: string) => {
        store.set(name, value);
      },
      remove: (name: string) => {
        store.delete(name);
      },
    };
    const inner: Middleware<HttpContext> = async (ctx, next) => {
      ctx.cookies.set("sessionId", "abc123");
      expect(ctx.cookies.get("sessionId")).toBe("abc123");
      await next();
    };
    const wrapped = wrapSessionCookieSigning(inner, "sessionId", SECRET);
    await wrapped({ cookies } as HttpContext, async () => {});
    expect(store.get("sessionId")).toBe(signCookieValue("abc123", SECRET));
  });
});

describe("registerFrameworkHttpMiddlewares session/csrf", () => {
  function collectNames(
    config: Parameters<
      typeof registerFrameworkHttpMiddlewares
    >[1],
    isRuntimeDev: boolean,
  ): string[] {
    const names: string[] = [];
    const server = {
      use: (_mw: unknown, _cond?: unknown, name?: string) => {
        if (name) names.push(name);
      },
    };
    const container = initializeServiceContainer();
    initializeLogger(container, {});
    registerFrameworkHttpMiddlewares(server, config, container, {
      isRuntimeDev,
      useDetailedRequestLog: false,
    });
    return names;
  }

  it("生产环境 session + 合法 secret 应能装配并默认开启 CSRF", () => {
    const names = collectNames({
      session: { store: fakeStore() },
      cookie: { secret: SECRET },
      rateLimit: false,
      compression: false,
    }, false);
    expect(names).toContain("session");
    expect(names).toContain("csrf");
  }, { sanitizeOps: false, sanitizeResources: false });

  it("生产环境 session + csrf:false 应装配 session 且不装配 CSRF", () => {
    const names = collectNames({
      session: { store: fakeStore() },
      cookie: { secret: SECRET },
      csrf: false,
      rateLimit: false,
      compression: false,
    }, false);
    expect(names).toContain("session");
    expect(names).not.toContain("csrf");
  }, { sanitizeOps: false, sanitizeResources: false });

  it("开发环境 session 无 secret 应能装配", () => {
    const names = collectNames({
      session: { store: fakeStore() },
    }, true);
    expect(names).toContain("session");
    expect(names).toContain("csrf");
  }, { sanitizeOps: false, sanitizeResources: false });

  it("生产环境 session 无 secret 装配时应失败", () => {
    expect(() =>
      collectNames({
        session: { store: fakeStore() },
        rateLimit: false,
        compression: false,
      }, false)
    ).toThrow(/cookie\.secret/);
  });
});
