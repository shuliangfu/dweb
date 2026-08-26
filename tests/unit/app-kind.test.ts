/**
 * AppKind / console.slim 解析助手单元测试
 */

import "../setup.ts";
import { deleteEnv, getEnv, setEnv } from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import { App } from "../../src/core/app.ts";
import { SERVICE_KEY_MIDDLEWARE_CHAIN } from "../../src/core/middleware.ts";
import {
  isApiKind,
  isConsoleKind,
  resolveAppKind,
  resolveConsoleSlim,
} from "../../src/types/app.ts";

describe("AppKind helpers", () => {
  describe("resolveAppKind()", () => {
    it("缺省应为 web", () => {
      expect(resolveAppKind(undefined)).toBe("web");
      expect(resolveAppKind(null)).toBe("web");
      expect(resolveAppKind({})).toBe("web");
    });

    it("应原样返回显式 kind", () => {
      expect(resolveAppKind({ kind: "api" })).toBe("api");
      expect(resolveAppKind({ kind: "console" })).toBe("console");
      expect(resolveAppKind({ kind: "web" })).toBe("web");
    });
  });

  describe("isApiKind()", () => {
    it("仅 kind=api 为 true", () => {
      expect(isApiKind({ kind: "api" })).toBe(true);
      expect(isApiKind({ kind: "web" })).toBe(false);
      expect(isApiKind({ kind: "console" })).toBe(false);
      expect(isApiKind({})).toBe(false);
    });
  });

  describe("isConsoleKind()", () => {
    it("仅 kind=console 为 true", () => {
      expect(isConsoleKind({ kind: "console" })).toBe(true);
      expect(isConsoleKind({ kind: "api" })).toBe(false);
      expect(isConsoleKind({ kind: "web" })).toBe(false);
      expect(isConsoleKind({})).toBe(false);
    });
  });

  describe("resolveConsoleSlim()", () => {
    it("默认 false；config.console.slim 可读", () => {
      expect(resolveConsoleSlim(undefined)).toBe(false);
      expect(resolveConsoleSlim({})).toBe(false);
      expect(resolveConsoleSlim({ console: {} })).toBe(false);
      expect(resolveConsoleSlim({ console: { slim: false } })).toBe(false);
      expect(resolveConsoleSlim({ console: { slim: true } })).toBe(true);
    });

    it("环境变量优先于配置", () => {
      expect(resolveConsoleSlim({ console: { slim: false } }, "1")).toBe(true);
      expect(resolveConsoleSlim({ console: { slim: true } }, "0")).toBe(false);
      expect(resolveConsoleSlim({ console: { slim: false } }, "true")).toBe(
        true,
      );
      expect(resolveConsoleSlim({ console: { slim: true } }, "false")).toBe(
        false,
      );
      expect(resolveConsoleSlim({ console: { slim: true } }, undefined)).toBe(
        true,
      );
    });
  });
});

describe("console.slim App wiring", () => {
  it("slim=true 时应跳过 HTTP 中间件链并标记 isConsoleSlim", async () => {
    const prev = getEnv("DWEB_CONSOLE_SLIM");
    try {
      deleteEnv("DWEB_CONSOLE_SLIM");
      const app = new App(
        { kind: "console", hotReload: false, console: { slim: true } },
        { mode: "console" },
      );
      await app.start({ mode: "console" });
      expect(app.isConsoleMode()).toBe(true);
      expect(app.isConsoleSlim()).toBe(true);
      expect(app.container.has(SERVICE_KEY_MIDDLEWARE_CHAIN)).toBe(false);
      await app.stop();
      await app.shutdown();
    } finally {
      if (prev == null) deleteEnv("DWEB_CONSOLE_SLIM");
      else setEnv("DWEB_CONSOLE_SLIM", prev);
    }
  });

  it("默认 console 路径不启用 slim（中间件链仍初始化）", async () => {
    const prev = getEnv("DWEB_CONSOLE_SLIM");
    try {
      deleteEnv("DWEB_CONSOLE_SLIM");
      const app = new App(
        { kind: "console", hotReload: false },
        { mode: "console" },
      );
      await app.start({ mode: "console" });
      expect(app.isConsoleMode()).toBe(true);
      expect(app.isConsoleSlim()).toBe(false);
      expect(app.container.has(SERVICE_KEY_MIDDLEWARE_CHAIN)).toBe(true);
      await app.stop();
      await app.shutdown();
    } finally {
      if (prev == null) deleteEnv("DWEB_CONSOLE_SLIM");
      else setEnv("DWEB_CONSOLE_SLIM", prev);
    }
  });
});
