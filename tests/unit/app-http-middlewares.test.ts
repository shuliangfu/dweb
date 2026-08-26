/**
 * registerFrameworkHttpMiddlewares 装配顺序与 opt-in 注册测试
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { registerFrameworkHttpMiddlewares } from "../../src/core/app-http-middlewares.ts";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { initializeLogger } from "../../src/utils/logger.ts";

describe("registerFrameworkHttpMiddlewares", () => {
  it("非 dev 默认应注册 compression；cors/rateLimit/metrics 仍 opt-in", () => {
    const names: string[] = [];
    const server = {
      use: (_mw: unknown, _cond?: unknown, name?: string) => {
        if (name) names.push(name);
      },
    };
    const container = initializeServiceContainer();
    initializeLogger(container, {});
    registerFrameworkHttpMiddlewares(server, {}, container, {
      isRuntimeDev: false,
      useDetailedRequestLog: false,
    });
    expect(names).toContain("dev-no-cache");
    expect(names).toContain("security-headers");
    expect(names).toContain("health-check");
    expect(names).toContain("compression");
    expect(names).not.toContain("cors");
    expect(names).not.toContain("rate-limit");
    expect(names).not.toContain("metrics");
  });

  it("dev 默认不注册 compression", () => {
    const names: string[] = [];
    const server = {
      use: (_mw: unknown, _cond?: unknown, name?: string) => {
        if (name) names.push(name);
      },
    };
    const container = initializeServiceContainer();
    initializeLogger(container, {});
    registerFrameworkHttpMiddlewares(server, {}, container, {
      isRuntimeDev: true,
      useDetailedRequestLog: false,
    });
    expect(names).not.toContain("compression");
  });

  it("显式 compression: false 在非 dev 也应关闭", () => {
    const names: string[] = [];
    const server = {
      use: (_mw: unknown, _cond?: unknown, name?: string) => {
        if (name) names.push(name);
      },
    };
    const container = initializeServiceContainer();
    initializeLogger(container, {});
    registerFrameworkHttpMiddlewares(
      server,
      { compression: false },
      container,
      { isRuntimeDev: false, useDetailedRequestLog: false },
    );
    expect(names).not.toContain("compression");
  });

  // rateLimit() 内部会起清理 interval，装配侧无法释放；仅断言注册名，忽略 ops/resource 泄漏
  it("opt-in 应注册 cors / compression / rate-limit / metrics", () => {
    const names: string[] = [];
    const server = {
      use: (_mw: unknown, _cond?: unknown, name?: string) => {
        if (name) names.push(name);
      },
    };
    const container = initializeServiceContainer();
    initializeLogger(container, {});
    registerFrameworkHttpMiddlewares(
      server,
      {
        cors: true,
        compression: true,
        rateLimit: true,
        metrics: true,
      },
      container,
      { isRuntimeDev: true, useDetailedRequestLog: true },
    );
    expect(names).toContain("cors");
    expect(names).toContain("compression");
    expect(names).toContain("rate-limit");
    expect(names).toContain("metrics");
  }, {
    sanitizeOps: false,
    sanitizeResources: false,
  });
});
