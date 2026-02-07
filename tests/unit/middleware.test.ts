/**
 * 中间件系统集成测试
 *
 * 测试 src/core/middleware.ts 的功能：
 * - initializeMiddleware 初始化中间件系统
 * - getMiddlewareChain 获取中间件链
 * - registerMiddleware 注册中间件
 * - pluginEventsMiddleware 插件事件中间件
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  getMiddlewareChain,
  initializeMiddleware,
  registerMiddleware,
} from "../../src/core/middleware.ts";
import { initializeServiceContainer } from "../../src/core/service.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("中间件系统 (middleware.ts)", () => {
  describe("initializeMiddleware()", () => {
    it("应该创建中间件链实例", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const middlewareChain = initializeMiddleware(container, config);

      expect(middlewareChain).toBeDefined();
      expect(typeof middlewareChain.use).toBe("function");
      expect(typeof middlewareChain.execute).toBe("function");
    });

    it("应该将中间件链注册到服务容器", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const middlewareChain = initializeMiddleware(container, config);
      const retrievedChain = container.get("middlewareChain");

      expect(retrievedChain).toBe(middlewareChain);
    });

    it("多次调用会抛出错误（服务已注册）", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeMiddleware(container, config);

      expect(() => initializeMiddleware(container, config)).toThrow("已注册");
    });
  });

  describe("getMiddlewareChain()", () => {
    it("应该从容器中获取中间件链", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const created = initializeMiddleware(container, config);
      const retrieved = getMiddlewareChain(container);

      expect(retrieved).toBe(created);
    });

    it("应该在未初始化时抛出错误", () => {
      const container = initializeServiceContainer();

      expect(() => getMiddlewareChain(container)).toThrow();
    });
  });

  describe("registerMiddleware()", () => {
    it("应该注册中间件到链中", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeMiddleware(container, config);

      let middlewareCalled = false;
      const middleware = async (
        _ctx: unknown,
        next: () => Promise<void>,
      ) => {
        middlewareCalled = true;
        await next();
      };

      registerMiddleware(container, middleware);

      // 执行中间件链
      const chain = getMiddlewareChain(container);
      await chain.execute({});

      expect(middlewareCalled).toBe(true);
    });

    it("应该支持多个中间件按顺序执行", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeMiddleware(container, config);

      const order: number[] = [];

      registerMiddleware(container, async (_ctx, next) => {
        order.push(1);
        await next();
        order.push(4);
      });

      registerMiddleware(container, async (_ctx, next) => {
        order.push(2);
        await next();
        order.push(3);
      });

      const chain = getMiddlewareChain(container);
      await chain.execute({});

      // 洋葱模型执行顺序
      expect(order).toEqual([1, 2, 3, 4]);
    });

    it("应该支持带名称的中间件注册", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeMiddleware(container, config);

      let called = false;
      const middleware = async (_ctx: unknown, next: () => Promise<void>) => {
        called = true;
        await next();
      };

      registerMiddleware(container, middleware, undefined, "test-middleware");

      const chain = getMiddlewareChain(container);
      await chain.execute({});

      expect(called).toBe(true);
    });

    it("中间件应该能访问上下文对象", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeMiddleware(container, config);

      let receivedCtx: unknown = null;
      const middleware = async (ctx: unknown, next: () => Promise<void>) => {
        receivedCtx = ctx;
        await next();
      };

      registerMiddleware(container, middleware);

      const testCtx = { path: "/test", method: "GET" };
      const chain = getMiddlewareChain(container);
      await chain.execute(testCtx);

      expect(receivedCtx).toBe(testCtx);
    });

    it("中间件应该能修改上下文对象", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeMiddleware(container, config);

      registerMiddleware(
        container,
        async (ctx: Record<string, unknown>, next) => {
          ctx.data = "modified";
          await next();
        },
      );

      const testCtx: Record<string, unknown> = {};
      const chain = getMiddlewareChain(container);
      await chain.execute(testCtx);

      expect(testCtx.data).toBe("modified");
    });
  });

  describe("中间件错误处理", () => {
    it("中间件抛出的错误应该传播", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeMiddleware(container, config);

      const errorMiddleware = () => {
        throw new Error("测试错误");
      };

      registerMiddleware(container, errorMiddleware);

      const chain = getMiddlewareChain(container);

      let errorCaught = false;
      try {
        await chain.execute({});
      } catch (error) {
        errorCaught = true;
        expect((error as Error).message).toBe("测试错误");
      }

      expect(errorCaught).toBe(true);
    });

    it("后续中间件不应在前一个错误后执行", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeMiddleware(container, config);

      let secondCalled = false;

      registerMiddleware(container, () => {
        throw new Error("第一个中间件错误");
      });

      registerMiddleware(container, async (_ctx, next) => {
        secondCalled = true;
        await next();
      });

      const chain = getMiddlewareChain(container);

      try {
        await chain.execute({});
      } catch {
        // 忽略错误
      }

      expect(secondCalled).toBe(false);
    });
  });
});
