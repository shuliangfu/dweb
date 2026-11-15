/**
 * 升级提示配置开关、引导脚本与 HTTP 接口
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  appendUpgradePromptBootstrap,
  htmlDocumentCacheControl,
  isUpgradePromptRequested,
  resolveUpgradePrompt,
} from "../../src/feature/upgrade-prompt.ts";
import {
  createUpgradePromptMiddleware,
  isUpgradePromptPath,
} from "../../src/feature/upgrade-prompt-middleware.ts";
import {
  DWEB_VERSION_PATH,
  DWEB_VERSION_STREAM_PATH,
  VERSION_ENDPOINT_CACHE_CONTROL,
} from "../../src/utils/constants.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("upgrade-prompt", () => {
  it("默认关闭，仅生产环境的 web 应用且显式 true 时才请求启用", () => {
    expect(isUpgradePromptRequested({}, false)).toBe(false);
    expect(isUpgradePromptRequested({ upgradePrompt: false }, false)).toBe(
      false,
    );
    expect(isUpgradePromptRequested({ upgradePrompt: true }, true)).toBe(
      false,
    );
    expect(
      isUpgradePromptRequested({ upgradePrompt: true, kind: "api" }, false),
    ).toBe(false);
    expect(
      isUpgradePromptRequested({ upgradePrompt: true, kind: "console" }, false),
    ).toBe(false);
    expect(isUpgradePromptRequested({ upgradePrompt: true }, false)).toBe(true);
  });

  it("未开启时 resolve 与缓存头保持关闭，且不注入引导", () => {
    const config: AppConfig = {};
    expect(resolveUpgradePrompt(config, false)).toBeNull();
    expect(htmlDocumentCacheControl(false, config)).toBeUndefined();
    expect(htmlDocumentCacheControl(true, config)).toBe(
      "no-cache, no-store, must-revalidate",
    );
    const statements: string[] = ['globalThis.__DWEB_MODE__ = "hybrid";'];
    appendUpgradePromptBootstrap(statements, config, false);
    expect(statements).toEqual(['globalThis.__DWEB_MODE__ = "hybrid";']);
  });

  it("开启但未填写 version 时不应启用", () => {
    const config: AppConfig = { upgradePrompt: true };
    expect(resolveUpgradePrompt(config, false)).toBeNull();
    expect(htmlDocumentCacheControl(false, config)).toBeUndefined();
    const statements: string[] = [];
    appendUpgradePromptBootstrap(statements, config, false);
    expect(statements).toEqual([]);
  });

  it("开启且填写 version 时应注入引导标志，并使用协商缓存", () => {
    const config: AppConfig = { upgradePrompt: true, version: "3.2.1" };
    const state = resolveUpgradePrompt(config, false);
    expect(state).not.toBeNull();
    expect(state?.version).toBe("3.2.1");
    expect(htmlDocumentCacheControl(false, config)).toBe(
      "no-cache, must-revalidate",
    );
    expect(resolveUpgradePrompt(config, true)).toBeNull();
    const statements: string[] = [];
    appendUpgradePromptBootstrap(statements, config, false);
    const joined = statements.join("\n");
    expect(joined).toContain("globalThis.__DWEB_UPGRADE_PROMPT__=true;");
    expect(joined).toContain("__APP_VERSION__");
    expect(joined).toContain(state!.version);
    expect(joined).not.toContain("EventSource");
    expect(joined).not.toContain("/__version/stream");
  });

  it("isUpgradePromptPath 只匹配版本接口", () => {
    expect(isUpgradePromptPath(DWEB_VERSION_PATH)).toBe(true);
    expect(isUpgradePromptPath(DWEB_VERSION_STREAM_PATH)).toBe(true);
    expect(isUpgradePromptPath("/__data")).toBe(false);
    expect(isUpgradePromptPath("/health")).toBe(false);
  });
});

describe("createUpgradePromptMiddleware", () => {
  const version = "2.3.4";
  const middleware = createUpgradePromptMiddleware(version);

  it("GET /__version 应返回当前版本且禁止缓存", async () => {
    const ctx = {
      path: DWEB_VERSION_PATH,
      request: { method: "GET" },
      response: undefined as Response | undefined,
    };
    let nextCalled = false;
    await middleware(ctx as never, () => {
      nextCalled = true;
      return Promise.resolve();
    });
    expect(nextCalled).toBe(false);
    expect(ctx.response).toBeDefined();
    expect(ctx.response!.status).toBe(200);
    expect(ctx.response!.headers.get("Cache-Control")).toBe(
      VERSION_ENDPOINT_CACHE_CONTROL,
    );
    expect(ctx.response!.headers.get("Content-Type") ?? "").toContain(
      "application/json",
    );
    const body = await ctx.response!.json() as { version?: string };
    expect(body.version).toBe(version);
  });

  it("GET /__version/stream 应在连接时推送 version 事件", async () => {
    const ac = new AbortController();
    const ctx = {
      path: DWEB_VERSION_STREAM_PATH,
      request: new Request("http://localhost" + DWEB_VERSION_STREAM_PATH, {
        signal: ac.signal,
      }),
      response: undefined as Response | undefined,
    };
    let nextCalled = false;
    await middleware(ctx as never, () => {
      nextCalled = true;
      return Promise.resolve();
    });
    expect(nextCalled).toBe(false);
    expect(ctx.response).toBeDefined();
    expect(ctx.response!.headers.get("Content-Type") ?? "").toContain(
      "text/event-stream",
    );
    expect(ctx.response!.headers.get("Cache-Control")).toBe(
      VERSION_ENDPOINT_CACHE_CONTROL,
    );
    expect(ctx.response!.headers.get("X-Accel-Buffering")).toBe("no");
    const reader = ctx.response!.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      while (!buf.includes("event: version")) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
      }
    } finally {
      ac.abort();
      try {
        await reader.cancel();
      } catch {
        /* 已取消 */
      }
    }
    expect(buf).toContain("retry: 3000");
    expect(buf).toContain("event: version");
    expect(buf).toContain(`data: ${version}`);
  });

  it("非 GET 或其它路径应交给后续中间件", async () => {
    for (
      const ctx of [
        {
          path: DWEB_VERSION_PATH,
          request: { method: "POST" },
          response: undefined as Response | undefined,
        },
        {
          path: "/",
          request: { method: "GET" },
          response: undefined as Response | undefined,
        },
      ]
    ) {
      let nextCalled = false;
      await middleware(ctx as never, () => {
        nextCalled = true;
        return Promise.resolve();
      });
      expect(nextCalled).toBe(true);
      expect(ctx.response).toBeUndefined();
    }
  });
});
