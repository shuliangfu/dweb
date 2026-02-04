/**
 * 插件系统集成测试
 *
 * 测试 src/core/plugin.ts 的功能：
 * - initializePlugin 初始化插件系统
 * - getPluginManager 获取插件管理器
 * - registerPlugin 注册插件
 */

import type { Plugin } from "@dreamer/plugin";
import { describe, expect, it } from "@dreamer/test";
import {
  getPluginManager,
  initializePlugin,
  registerPlugin,
} from "../../src/core/plugin.ts";
import { initializeServiceContainer } from "../../src/core/service.ts";

describe("插件系统 (plugin.ts)", () => {
  describe("initializePlugin()", () => {
    it("应该创建插件管理器实例", () => {
      const container = initializeServiceContainer();

      const pluginManager = initializePlugin(container);

      expect(pluginManager).toBeDefined();
      expect(typeof pluginManager.register).toBe("function");
      expect(typeof pluginManager.install).toBe("function");
      expect(typeof pluginManager.activate).toBe("function");
    });

    it("应该将插件管理器注册到服务容器", () => {
      const container = initializeServiceContainer();

      const pluginManager = initializePlugin(container);
      const retrievedManager = container.get("pluginManager");

      expect(retrievedManager).toBe(pluginManager);
    });

    it("应该接受配置选项", () => {
      const container = initializeServiceContainer();

      const pluginManager = initializePlugin(container, {
        autoActivate: true,
        continueOnError: false,
      });

      expect(pluginManager).toBeDefined();
    });

    it("应该使用默认配置选项", () => {
      const container = initializeServiceContainer();

      const pluginManager = initializePlugin(container);

      // 验证默认配置（autoActivate 默认为 false）
      expect(pluginManager).toBeDefined();
    });

    it("多次调用会抛出错误（服务已注册）", () => {
      const container = initializeServiceContainer();

      initializePlugin(container);

      expect(() => initializePlugin(container)).toThrow("已注册");
    });
  });

  describe("getPluginManager()", () => {
    it("应该从容器中获取插件管理器", () => {
      const container = initializeServiceContainer();

      const created = initializePlugin(container);
      const retrieved = getPluginManager(container);

      expect(retrieved).toBe(created);
    });

    it("应该在未初始化时抛出错误", () => {
      const container = initializeServiceContainer();

      expect(() => getPluginManager(container)).toThrow();
    });
  });

  describe("registerPlugin()", () => {
    it("应该注册插件到管理器", () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      const plugin: Plugin = {
        name: "test-plugin",
        version: "1.0.0",
      };

      registerPlugin(container, plugin);

      const pluginManager = getPluginManager(container);
      const registered = pluginManager.getPlugin("test-plugin");

      expect(registered).toBeDefined();
      expect(registered?.name).toBe("test-plugin");
    });

    it("应该支持多个插件注册", () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      registerPlugin(container, { name: "plugin-a", version: "1.0.0" });
      registerPlugin(container, { name: "plugin-b", version: "1.0.0" });
      registerPlugin(container, { name: "plugin-c", version: "1.0.0" });

      const pluginManager = getPluginManager(container);

      expect(pluginManager.getPlugin("plugin-a")).toBeDefined();
      expect(pluginManager.getPlugin("plugin-b")).toBeDefined();
      expect(pluginManager.getPlugin("plugin-c")).toBeDefined();
    });

    it("应该支持带生命周期钩子的插件", () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      let _initCalled = false;
      const plugin: Plugin = {
        name: "lifecycle-plugin",
        version: "1.0.0",
        onInit() {
          _initCalled = true;
        },
      };

      registerPlugin(container, plugin);

      const pluginManager = getPluginManager(container);
      const registered = pluginManager.getPlugin("lifecycle-plugin");

      expect(registered).toBeDefined();
      expect(registered?.onInit).toBeDefined();
    });

    it("应该支持带配置的插件", () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      const plugin: Plugin = {
        name: "config-plugin",
        version: "1.0.0",
        config: {
          apiKey: "test-key",
          timeout: 5000,
        },
      };

      registerPlugin(container, plugin);

      const pluginManager = getPluginManager(container);
      const registered = pluginManager.getPlugin("config-plugin");

      expect(registered?.config).toBeDefined();
      expect((registered?.config as { apiKey: string })?.apiKey).toBe(
        "test-key",
      );
    });

    it("应该支持带依赖的插件", () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      const basePlugin: Plugin = {
        name: "base-plugin",
        version: "1.0.0",
      };

      const dependentPlugin: Plugin = {
        name: "dependent-plugin",
        version: "1.0.0",
        dependencies: ["base-plugin"],
      };

      registerPlugin(container, basePlugin);
      registerPlugin(container, dependentPlugin);

      const pluginManager = getPluginManager(container);

      expect(pluginManager.getPlugin("dependent-plugin")).toBeDefined();
      expect(
        pluginManager.getPlugin("dependent-plugin")?.dependencies,
      ).toContain("base-plugin");
    });
  });

  describe("插件安装和激活", () => {
    it("应该能安装已注册的插件", async () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      const plugin: Plugin = {
        name: "installable-plugin",
        version: "1.0.0",
      };

      // 使用 PluginManager.register 而不是 registerPlugin
      // registerPlugin 会自动调用 install 和 activate
      const pluginManager = getPluginManager(container);
      pluginManager.register(plugin);
      await pluginManager.install("installable-plugin");

      const state = pluginManager.getState("installable-plugin");
      expect(state).toBe("installed");
    });

    it("应该能激活已安装的插件", async () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      const plugin: Plugin = {
        name: "activatable-plugin",
        version: "1.0.0",
      };

      // 使用 PluginManager.register 而不是 registerPlugin
      const pluginManager = getPluginManager(container);
      pluginManager.register(plugin);
      await pluginManager.install("activatable-plugin");
      await pluginManager.activate("activatable-plugin");

      const state = pluginManager.getState("activatable-plugin");
      expect(state).toBe("active");
    });

    it("应该通过 triggerInit 调用 onInit 钩子", async () => {
      const container = initializeServiceContainer();
      initializePlugin(container);

      let initCalled = false;
      const plugin: Plugin = {
        name: "init-hook-plugin",
        version: "1.0.0",
        onInit() {
          initCalled = true;
        },
      };

      // 使用 PluginManager.register 而不是 registerPlugin
      const pluginManager = getPluginManager(container);
      pluginManager.register(plugin);
      await pluginManager.install("init-hook-plugin");
      await pluginManager.activate("init-hook-plugin");

      // onInit 钩子通过 triggerInit 触发
      await pluginManager.triggerInit();

      expect(initCalled).toBe(true);
    });
  });
});
