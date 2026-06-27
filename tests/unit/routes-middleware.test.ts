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
});
