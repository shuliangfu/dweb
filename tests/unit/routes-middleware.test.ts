/**
 * 嵌套路由中间件单元测试
 */

import { describe, expect, it } from "@dreamer/test";
import type { Router } from "@dreamer/router";
import { ServiceContainer } from "@dreamer/service";
import type { HttpContext } from "@dreamer/server";
import { createNestedRoutesMiddleware } from "../../src/feature/routes-middleware.ts";

/** 构造最小 HttpContext 供中间件测试 */
function createTestContext(path: string): HttpContext {
  const request = new Request(`http://localhost${path}`);
  const url = new URL(request.url);
  return {
    request,
    path,
    method: request.method,
    url,
    headers: request.headers,
    params: {},
    query: {},
    cookies: {
      get: () => undefined,
      getAll: () => ({}),
      set: () => {},
      remove: () => {},
      delete: () => {},
    },
  } as unknown as HttpContext;
}

describe("嵌套路由中间件 (routes-middleware.ts)", () => {
  it("应按 pathname 从外到内链式执行各层 _middleware", async () => {
    const order: string[] = [];
    const mockRouter = {
      getMiddlewarePathsForPath: (pathname: string) => {
        if (pathname === "/admin") {
          return ["/routes/_middleware.ts", "/routes/admin/_middleware.ts"];
        }
        return [];
      },
      loadModule: async (filePath: string) => {
        if (filePath.includes("admin/_middleware")) {
          return {
            default: async (
              _ctx: unknown,
              next: () => Promise<void>,
            ) => {
              order.push("admin");
              await next();
            },
          };
        }
        return {
          default: async (_ctx: unknown, next: () => Promise<void>) => {
            order.push("root");
            await next();
          },
        };
      },
    } as unknown as Router;

    const container = new ServiceContainer();
    container.registerSingleton("router", () => mockRouter);

    const middleware = createNestedRoutesMiddleware(container);
    let downstreamCalled = false;

    await middleware(createTestContext("/admin"), async () => {
      downstreamCalled = true;
    });

    expect(order).toEqual(["root", "admin"]);
    expect(downstreamCalled).toBe(true);
  });

  it("中间件 return Response 时应写入 ctx.response 并短路", async () => {
    const mockRouter = {
      getMiddlewarePathsForPath: () => ["/routes/admin/_middleware.ts"],
      loadModule: async () => ({
        default: async () => {
          return new Response("forbidden", { status: 403 });
        },
      }),
    } as unknown as Router;

    const container = new ServiceContainer();
    container.registerSingleton("router", () => mockRouter);

    const middleware = createNestedRoutesMiddleware(container);
    const ctx = createTestContext("/admin");
    let downstreamCalled = false;

    await middleware(ctx, async () => {
      downstreamCalled = true;
    });

    expect(downstreamCalled).toBe(false);
    expect(ctx.response?.status).toBe(403);
  });

  it("无 Router 或无 _middleware 时应直接 next()", async () => {
    const container = new ServiceContainer();
    const middleware = createNestedRoutesMiddleware(container);
    let called = false;

    await middleware(createTestContext("/"), async () => {
      called = true;
    });

    expect(called).toBe(true);
  });

  it("执行嵌套中间件时应注入 container 到 ctx", async () => {
    let seenContainer: ServiceContainer | undefined;
    const mockRouter = {
      getMiddlewarePathsForPath: () => ["/routes/_middleware.ts"],
      loadModule: async () => ({
        default: async (
          ctx: { container?: ServiceContainer },
          next: () => Promise<void>,
        ) => {
          seenContainer = ctx.container;
          await next();
        },
      }),
    } as unknown as Router;

    const container = new ServiceContainer();
    container.registerSingleton("router", () => mockRouter);

    const middleware = createNestedRoutesMiddleware(container);
    await middleware(createTestContext("/admin"), async () => {});

    expect(seenContainer).toBe(container);
  });


  it("named middleware export 应一并加入链", async () => {
    const order: string[] = [];
    const mockRouter = {
      getMiddlewarePathsForPath: () => ["/routes/_middleware.ts"],
      loadModule: async () => ({
        default: async (_ctx: unknown, next: () => Promise<void>) => {
          order.push("default");
          await next();
        },
        middleware: async (_ctx: unknown, next: () => Promise<void>) => {
          order.push("named");
          await next();
        },
      }),
    } as unknown as Router;

    const container = new ServiceContainer();
    container.registerSingleton("router", () => mockRouter);
    const middleware = createNestedRoutesMiddleware(container);
    await middleware(createTestContext("/x"), async () => {
      order.push("down");
    });
    expect(order).toEqual(["default", "named", "down"]);
  });

  it("loadModule 抛错时应跳过该层继续", async () => {
    const order: string[] = [];
    const mockRouter = {
      getMiddlewarePathsForPath: () => [
        "/routes/bad/_middleware.ts",
        "/routes/_middleware.ts",
      ],
      loadModule: async (filePath: string) => {
        if (filePath.includes("bad")) throw new Error("load-fail");
        return {
          default: async (_ctx: unknown, next: () => Promise<void>) => {
            order.push("ok");
            await next();
          },
        };
      },
    } as unknown as Router;

    const container = new ServiceContainer();
    container.registerSingleton("router", () => mockRouter);
    const middleware = createNestedRoutesMiddleware(container);
    await middleware(createTestContext("/x"), async () => {
      order.push("down");
    });
    expect(order).toEqual(["ok", "down"]);
  });

  it("无 ctx.path 时应从 request.url 取 pathname", async () => {
    const seen: string[] = [];
    const mockRouter = {
      getMiddlewarePathsForPath: (pathname: string) => {
        seen.push(pathname);
        return [];
      },
      loadModule: async () => ({}),
    } as unknown as Router;
    const container = new ServiceContainer();
    container.registerSingleton("router", () => mockRouter);
    const middleware = createNestedRoutesMiddleware(container);
    const ctx = createTestContext("/from-url");
    // wipe path so middleware falls back to request.url
    (ctx as { path?: string }).path = undefined as unknown as string;
    await middleware(ctx, async () => {});
    expect(seen[0]).toBe("/from-url");
  });

  it("链中已有 ctx.response 时应停止后续 middleware", async () => {
    const order: string[] = [];
    const mockRouter = {
      getMiddlewarePathsForPath: () => [
        "/routes/a/_middleware.ts",
        "/routes/b/_middleware.ts",
      ],
      loadModule: async (filePath: string) => {
        if (filePath.includes("/a/")) {
          return {
            default: async (
              ctx: { response?: Response },
              next: () => Promise<void>,
            ) => {
              order.push("a");
              ctx.response = new Response("early", { status: 299 });
              await next();
            },
          };
        }
        return {
          default: async (_ctx: unknown, next: () => Promise<void>) => {
            order.push("b");
            await next();
          },
        };
      },
    } as unknown as Router;
    const container = new ServiceContainer();
    container.registerSingleton("router", () => mockRouter);
    const middleware = createNestedRoutesMiddleware(container);
    const ctx = createTestContext("/a/b");
    let down = false;
    await middleware(ctx, async () => {
      down = true;
    });
    expect(order).toEqual(["a"]);
    expect(down).toBe(false);
    expect(ctx.response?.status).toBe(299);
  });

  it("container 有 app 时应注入 ctx.app", async () => {
    let seenApp: unknown;
    const mockApp = { name: "inject-app" };
    const mockRouter = {
      getMiddlewarePathsForPath: () => ["/routes/_middleware.ts"],
      loadModule: async () => ({
        default: async (
          ctx: { app?: unknown },
          next: () => Promise<void>,
        ) => {
          seenApp = ctx.app;
          await next();
        },
      }),
    } as unknown as Router;
    const container = new ServiceContainer();
    container.registerSingleton("router", () => mockRouter);
    container.registerSingleton("app", () => mockApp);
    const middleware = createNestedRoutesMiddleware(container);
    await middleware(createTestContext("/"), async () => {});
    expect(seenApp).toBe(mockApp);
  });

});
