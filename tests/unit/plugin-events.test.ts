/**
 * 插件事件系统测试
 *
 * 测试 src/core/plugin-events.ts 的功能：
 * - emitPluginEvent 触发插件事件
 * - emitOnInit, emitOnStart, emitOnStop 等事件触发函数
 * - emitOnError 错误事件处理
 */

import type { Plugin } from "@dreamer/plugin";
import { describe, expect, it } from "@dreamer/test";
import {
  emitOnBuild,
  emitOnBuildComplete,
  emitOnInit,
  emitOnShutdown,
  emitOnStart,
  emitOnStop,
  emitPluginEvent,
} from "../../src/core/plugin-events.ts";
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
});
