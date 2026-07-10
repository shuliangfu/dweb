/**
 * registerFrameworkHttpMiddlewares 装配顺序与 opt-in 注册测试
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { registerFrameworkHttpMiddlewares } from "../../src/core/app-http-middlewares.ts";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { initializeLogger } from "../../src/utils/logger.ts";

describe("registerFrameworkHttpMiddlewares", () => {
  it("默认配置应注册基础中间件名", () => {
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
    expect(names).not.toContain("cors");
    expect(names).not.toContain("compression");
    expect(names).not.toContain("rate-limit");
  });

  it("opt-in 应注册 cors / compression / rate-limit", () => {
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
      },
      container,
      { isRuntimeDev: true, useDetailedRequestLog: true },
    );
    expect(names).toContain("cors");
    expect(names).toContain("compression");
    expect(names).toContain("rate-limit");
  });
});
