/**
 * Console 命令上下文测试
 *
 * 测试 src/feature/console-context.ts 的 createConsoleContext。
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import type { App } from "../../src/core/app.ts";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { createConsoleContext } from "../../src/feature/console-context.ts";
import type { AppConfig } from "../../src/types/app.ts";
import { initializeLogger } from "../../src/utils/logger.ts";

function makeApp() {
  const container = initializeServiceContainer();
  const config: AppConfig = { name: "console-ctx" };
  container.registerSingleton("config", () => config);
  const log = initializeLogger(container, config);
  const app = { container } as App;
  return { app, container, config, log };
}

describe("createConsoleContext (console-context.ts)", () => {
  it("应填入 app、config、logger，并用默认 args／options／cwd／signal", () => {
    const { app, container, config, log } = makeApp();
    const ctx = createConsoleContext({ app, routeName: "hello/world" });
    expect(ctx.app).toBe(app);
    expect(ctx.container).toBe(container);
    expect(ctx.config).toBe(config);
    expect(ctx.log).toBe(log);
    expect(ctx.name).toBe("hello/world");
    expect(ctx.args).toEqual([]);
    expect(ctx.options).toEqual({});
    expect(typeof ctx.cwd).toBe("string");
    expect(ctx.cwd.length).toBeGreaterThan(0);
    expect(ctx.signal).toBeInstanceOf(AbortSignal);
    expect(ctx.signal.aborted).toBe(false);
  });

  it("应使用传入的 args、options、cwd 与 signal", () => {
    const { app } = makeApp();
    const ac = new AbortController();
    ac.abort();
    const ctx = createConsoleContext({
      app,
      routeName: "db/migrate",
      args: ["users"],
      options: { force: true },
      cwd: "/tmp/console-ctx",
      signal: ac.signal,
    });
    expect(ctx.args).toEqual(["users"]);
    expect(ctx.options).toEqual({ force: true });
    expect(ctx.cwd).toBe("/tmp/console-ctx");
    expect(ctx.signal.aborted).toBe(true);
    expect(ctx.name).toBe("db/migrate");
  });
});
