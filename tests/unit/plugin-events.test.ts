/**
 * 插件事件系统测试
 *
 * 测试 src/core/plugin-events.ts 的功能：
 * - emitPluginEvent 触发插件事件
 * - emitOnInit, emitOnStart, emitOnStop 等事件触发函数
 * - emitOnError 错误事件处理
 */

import "../setup.ts";
import type { Plugin, SocketContext, SocketIOSocket } from "@dreamer/plugin";
import { describe, expect, it } from "@dreamer/test";
import type { HttpContext } from "@dreamer/server";
import {
  emitOnBuild,
  emitOnBuildComplete,
  emitOnError,
  emitOnHealthCheck,
  emitOnHotReload,
  emitOnInit,
  emitOnRequest,
  emitOnRequestEnd,
  emitOnResponse,
  emitOnRoute,
  emitOnShutdown,
  emitOnSocket,
  emitOnSocketClose,
  emitOnSSREnd,
  emitOnStart,
  emitOnStop,
  emitPluginEvent,
  pluginEvents,
} from "../../src/core/plugin-events.ts";
import { initializeLogger } from "../../src/utils/logger.ts";
import { initializePlugin, registerPlugin } from "../../src/core/plugin.ts";
import { initializeServiceContainer } from "../../src/core/service.ts";

describe("插件事件系统 (plugin-events.ts)", () => {
  // 辅助函数：创建测试环境
  function createTestEnv() {
    const container = initializeServiceContainer();
    initializePlugin(container);
    return container;
  }

  // 辅助函数：注册并激活插件
  // 注意：registerPlugin 内部已经调用了 install 和 activate
  async function registerAndActivate(
    container: ReturnType<typeof initializeServiceContainer>,
    plugin: Plugin,
  ) {
    await registerPlugin(container, plugin);
  }

  describe("emitPluginEvent()", () => {
    it("应该触发已激活插件的事件钩子", async () => {
      const container = createTestEnv();
      let eventCalled = false;

      const plugin: Plugin = {
        name: "test-plugin",
        version: "1.0.0",
        onInit() {
          eventCalled = true;
        },
      };

      await registerAndActivate(container, plugin);
      await emitPluginEvent(container, "onInit");

      expect(eventCalled).toBe(true);
    });

    it("不应该触发未激活插件的事件钩子", async () => {
      const container = createTestEnv();
      let eventCalled = false;

      const plugin: Plugin = {
        name: "inactive-plugin",
        version: "1.0.0",
        onInit() {
          eventCalled = true;
        },
      };

      registerPlugin(container, plugin);
      // 只注册不激活
      await emitPluginEvent(container, "onInit");

      expect(eventCalled).toBe(false);
    });

    it("应该传递参数给事件钩子", async () => {
      const container = createTestEnv();
      let receivedArg: unknown = null;

      const plugin: Plugin = {
        name: "args-plugin",
        version: "1.0.0",
        onBuild(options: unknown) {
          receivedArg = options;
        },
      };

      await registerAndActivate(container, plugin);
      await emitPluginEvent(container, "onBuild", { mode: "prod" });

      expect(receivedArg).toEqual({ mode: "prod" });
    });

    it("应该触发多个插件的事件钩子", async () => {
      const container = createTestEnv();
      const calledPlugins: string[] = [];

      const plugin1: Plugin = {
        name: "plugin-1",
        version: "1.0.0",
        onInit() {
          calledPlugins.push("plugin-1");
        },
      };

      const plugin2: Plugin = {
        name: "plugin-2",
        version: "1.0.0",
        onInit() {
          calledPlugins.push("plugin-2");
        },
      };

      await registerAndActivate(container, plugin1);
      await registerAndActivate(container, plugin2);
      await emitPluginEvent(container, "onInit");

      expect(calledPlugins).toContain("plugin-1");
      expect(calledPlugins).toContain("plugin-2");
    });

    it("应该在钩子出错时继续执行其他插件", async () => {
      const container = createTestEnv();
      let secondCalled = false;

      const errorPlugin: Plugin = {
        name: "error-plugin",
        version: "1.0.0",
        onInit() {
          throw new Error("故意抛出的错误");
        },
      };

      const goodPlugin: Plugin = {
        name: "good-plugin",
        version: "1.0.0",
        onInit() {
          secondCalled = true;
        },
      };

      await registerAndActivate(container, errorPlugin);
      await registerAndActivate(container, goodPlugin);
      await emitPluginEvent(container, "onInit");

      expect(secondCalled).toBe(true);
    });
  });

  describe("生命周期事件触发函数", () => {
    it("emitOnInit 应该触发 onInit 钩子", async () => {
      const container = createTestEnv();
      let called = false;

      await registerAndActivate(container, {
        name: "init-plugin",
        version: "1.0.0",
        onInit() {
          called = true;
        },
      });

      await emitOnInit(container);
      expect(called).toBe(true);
    });

    it("emitOnStart 应该触发 onStart 钩子", async () => {
      const container = createTestEnv();
      let called = false;

      await registerAndActivate(container, {
        name: "start-plugin",
        version: "1.0.0",
        onStart() {
          called = true;
        },
      });

      await emitOnStart(container);
      expect(called).toBe(true);
    });

    it("emitOnStop 应该触发 onStop 钩子", async () => {
      const container = createTestEnv();
      let called = false;

      await registerAndActivate(container, {
        name: "stop-plugin",
        version: "1.0.0",
        onStop() {
          called = true;
        },
      });

      await emitOnStop(container);
      expect(called).toBe(true);
    });

    it("emitOnShutdown 应该触发 onShutdown 钩子", async () => {
      const container = createTestEnv();
      let called = false;

      await registerAndActivate(container, {
        name: "shutdown-plugin",
        version: "1.0.0",
        onShutdown() {
          called = true;
        },
      });

      await emitOnShutdown(container);
      expect(called).toBe(true);
    });
  });

  describe("构建事件触发函数", () => {
    it("emitOnBuild 应该触发 onBuild 钩子并传递选项", async () => {
      const container = createTestEnv();
      let receivedOptions: unknown = null;

      await registerAndActivate(container, {
        name: "build-plugin",
        version: "1.0.0",
        onBuild(options: unknown) {
          receivedOptions = options;
        },
      });

      await emitOnBuild(container, { mode: "prod", target: "client" });
      expect(receivedOptions).toEqual({ mode: "prod", target: "client" });
    });

    it("emitOnBuildComplete 应该触发 onBuildComplete 钩子并传递结果", async () => {
      const container = createTestEnv();
      let receivedResult: unknown = null;

      await registerAndActivate(container, {
        name: "build-complete-plugin",
        version: "1.0.0",
        onBuildComplete(result: unknown) {
          receivedResult = result;
        },
      });

      await emitOnBuildComplete(container, { outputFiles: ["main.js"] });
      expect(receivedResult).toEqual({ outputFiles: ["main.js"] });
    });
  });

  describe("Socket 事件触发函数", () => {
    it("emitOnSocket 应该触发 onSocket 钩子", async () => {
      const container = createTestEnv();
      let onSocketCalled = false;
      let receivedCtx: unknown = null;

      await registerAndActivate(container, {
        name: "socket-plugin",
        version: "1.0.0",
        onSocket(ctx: unknown) {
          onSocketCalled = true;
          receivedCtx = ctx;
        },
      });

      const mockCtx = {
        type: "socketio" as const,
        connectionId: "test-123",
        socket: {} as SocketIOSocket,
        namespace: "/",
        rooms: new Set<string>(),
      };

      await emitOnSocket(container, mockCtx as SocketContext);

      expect(onSocketCalled).toBe(true);
      expect(receivedCtx).toEqual(mockCtx);
    });

    it("emitOnSocketClose 应该触发 onSocketClose 钩子", async () => {
      const container = createTestEnv();
      let onSocketCloseCalled = false;
      let receivedCtx: unknown = null;

      await registerAndActivate(container, {
        name: "socket-close-plugin",
        version: "1.0.0",
        onSocketClose(ctx: unknown) {
          onSocketCloseCalled = true;
          receivedCtx = ctx;
        },
      });

      const mockCtx = {
        type: "websocket" as const,
        connectionId: "test-456",
        socket: {} as WebSocket,
        request: new Request("http://localhost/ws"),
      };

      await emitOnSocketClose(container, mockCtx as SocketContext);

      expect(onSocketCloseCalled).toBe(true);
      expect(receivedCtx).toEqual(mockCtx);
    });

    it("无 pluginManager 时 emitOnSocket 应静默返回", async () => {
      const container = initializeServiceContainer();
      // 不初始化 plugin
      const result = await emitOnSocket(container, {
        type: "socketio",
        connectionId: "x",
        socket: {} as SocketIOSocket,
        namespace: "/",
        rooms: new Set(),
      } as SocketContext);
      expect(result).toBeUndefined();
    });

    it("无 pluginManager 时 emitOnSocketClose 应静默返回", async () => {
      const container = initializeServiceContainer();
      const result = await emitOnSocketClose(container, {
        type: "websocket",
        connectionId: "x",
        socket: {} as WebSocket,
        request: new Request("http://x"),
      } as SocketContext);
      expect(result).toBeUndefined();
    });
  });

  describe("事件执行顺序", () => {
    it("应该按插件注册顺序触发事件", async () => {
      const container = createTestEnv();
      const order: string[] = [];

      await registerAndActivate(container, {
        name: "first-plugin",
        version: "1.0.0",
        onInit() {
          order.push("first");
        },
      });

      await registerAndActivate(container, {
        name: "second-plugin",
        version: "1.0.0",
        onInit() {
          order.push("second");
        },
      });

      await registerAndActivate(container, {
        name: "third-plugin",
        version: "1.0.0",
        onInit() {
          order.push("third");
        },
      });

      await emitOnInit(container);
      expect(order).toEqual(["first", "second", "third"]);
    });
  });

  describe("请求与健康检查事件", () => {
    function ctx(path = "/hello"): HttpContext {
      return {
        path,
        request: new Request(`http://localhost${path}`),
      } as HttpContext;
    }

    it("有 getActivePluginsWithHook 时只调用索引中的插件，忽略全表中的其它实现", async () => {
      const container = initializeServiceContainer();
      const called: string[] = [];
      const indexed = {
        name: "indexed",
        version: "1.0.0",
        onRequest() {
          called.push("indexed");
        },
      };
      const hidden = {
        name: "hidden",
        version: "1.0.0",
        onRequest() {
          called.push("hidden");
        },
      };
      container.registerSingleton("pluginManager", () => ({
        getActivePluginsWithHook(eventName: string) {
          return eventName === "onRequest" ? [indexed] : [];
        },
        getRegisteredPlugins() {
          return ["indexed", "hidden"];
        },
        getPlugin(name: string) {
          return name === "hidden" ? hidden : indexed;
        },
        getState() {
          return "active";
        },
      }));
      const res = await emitOnRequest(container, ctx());
      expect(res).toBeUndefined();
      expect(called).toEqual(["indexed"]);
    });

    it("emitOnRequest 可短路返回 Response，并跳过无钩子或未激活插件", async () => {
      const container = createTestEnv();
      await registerAndActivate(container, {
        name: "skip-hook",
        version: "1.0.0",
      } as Plugin);
      await registerAndActivate(container, {
        name: "short-circuit",
        version: "1.0.0",
        onRequest() {
          return new Response("from-plugin", { status: 200 });
        },
      } as Plugin);
      const res = await emitOnRequest(container, ctx());
      expect(res).toBeInstanceOf(Response);
      expect(await res!.text()).toBe("from-plugin");
    });

    it("emitOnRequest 钩子抛错时应吞掉并继续，最终返回 undefined", async () => {
      const container = createTestEnv();
      initializeLogger(container, {});
      await registerAndActivate(container, {
        name: "boom",
        version: "1.0.0",
        onRequest() {
          throw new Error("request hook fail");
        },
      } as Plugin);
      const res = await emitOnRequest(container, ctx());
      expect(res).toBeUndefined();
    });

    it("emitOnResponse / emitOnHotReload 应调用对应钩子", async () => {
      const container = createTestEnv();
      const seen: string[] = [];
      await registerAndActivate(container, {
        name: "obs",
        version: "1.0.0",
        onResponse() {
          seen.push("response");
        },
        onHotReload(files: string[]) {
          seen.push(`reload:${files.join(",")}`);
        },
      } as Plugin);
      await emitOnResponse(container, ctx("/r"));
      await emitOnHotReload(container, ["src/routes/index.tsx"]);
      expect(seen).toEqual(["response", "reload:src/routes/index.tsx"]);
    });

    it("emitOnRequestEnd / emitOnSSREnd 应调用插件钩子和配置回调，并吞掉配置回调错误", async () => {
      const container = createTestEnv();
      const seen: string[] = [];
      await registerAndActivate(container, {
        name: "obs",
        version: "1.0.0",
        onRequestEnd() {
          seen.push("plugin-req");
        },
        onSSREnd() {
          seen.push("plugin-ssr");
        },
      } as Plugin);
      container.registerSingleton("config", () => ({
        onRequestEnd() {
          seen.push("cfg-req");
        },
        onSSREnd() {
          throw new Error("ssr end fail");
        },
      }));
      initializeLogger(container, {});
      await emitOnRequestEnd(container, {
        path: "/",
        method: "GET",
        status: 200,
        durationMs: 3,
      });
      await emitOnSSREnd(container, {
        path: "/",
        mode: "ssr",
        durationMs: 5,
        ok: true,
      });
      expect(seen).toEqual(["plugin-req", "cfg-req", "plugin-ssr"]);
    });

    it("emitOnRequestEnd 在没有 config 时应只跑插件", async () => {
      const container = createTestEnv();
      await emitOnRequestEnd(container, {
        path: "/",
        method: "GET",
        status: 200,
        durationMs: 1,
      });
    });

    it("emitOnRoute 应允许插件改写路由，钩子失败时保留当前列表", async () => {
      const container = createTestEnv();
      initializeLogger(container, {});
      await registerAndActivate(container, {
        name: "add-route",
        version: "1.0.0",
        onRoute(routes: Array<{ path: string }>) {
          return [...routes, { path: "/added" }];
        },
      } as unknown as Plugin);
      await registerAndActivate(container, {
        name: "boom",
        version: "1.0.0",
        onRoute() {
          throw new Error("onRoute fail");
        },
      } as unknown as Plugin);
      const routes = await emitOnRoute(container, [{ path: "/" }]);
      expect(routes.map((r) => r.path)).toEqual(["/", "/added"]);
    });

    it("emitOnError 可返回 Response，钩子失败时继续", async () => {
      const container = createTestEnv();
      initializeLogger(container, {});
      await registerAndActivate(container, {
        name: "boom",
        version: "1.0.0",
        onError() {
          throw new Error("onError hook fail");
        },
      } as Plugin);
      await registerAndActivate(container, {
        name: "handler",
        version: "1.0.0",
        onError() {
          return new Response("handled", { status: 500 });
        },
      } as Plugin);
      const res = await emitOnError(container, new Error("boom"), ctx());
      expect(res).toBeInstanceOf(Response);
      expect(res!.status).toBe(500);
      expect(await res!.text()).toBe("handled");
    });

    it("emitOnHealthCheck 应聚合组件状态并在钩子失败时标为 unhealthy", async () => {
      const container = createTestEnv();
      await registerAndActivate(container, {
        name: "ok",
        version: "1.0.0",
        onHealthCheck() {
          return {
            status: "healthy",
            components: { db: { status: "healthy" } },
          };
        },
      } as Plugin);
      await registerAndActivate(container, {
        name: "degraded",
        version: "1.0.0",
        onHealthCheck() {
          return { status: "degraded" };
        },
      } as Plugin);
      await registerAndActivate(container, {
        name: "boom",
        version: "1.0.0",
        onHealthCheck() {
          throw new Error("health fail");
        },
      } as Plugin);
      const status = await emitOnHealthCheck(container);
      expect(status.status).toBe("unhealthy");
      expect(status.components?.db?.status).toBe("healthy");
      expect(status.components?.degraded?.status).toBe("degraded");
      expect(status.components?.boom?.status).toBe("unhealthy");
      expect(status.components?.boom?.message).toBe("health fail");
      expect(typeof status.timestamp).toBe("number");
    });

    it("pluginEvents 应暴露与具名导出相同的函数", () => {
      expect(pluginEvents.emitOnInit).toBe(emitOnInit);
      expect(pluginEvents.emitOnRequest).toBe(emitOnRequest);
      expect(pluginEvents.emitOnHealthCheck).toBe(emitOnHealthCheck);
    });
  });
});
