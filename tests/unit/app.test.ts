/**
 * App 类集成测试
 *
 * 测试 src/core/app.ts 的功能：
 * - App 类的基本功能
 * - 应用生命周期
 * - 中间件和插件注册
 *
 * 注意：测试输出文件存放在 tests/data 目录下
 */

import "../setup.ts";
import type { Plugin } from "@dreamer/plugin";
import { describe, expect, it } from "@dreamer/test";
import { App } from "../../src/core/app.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("App 类 (app.ts)", () => {
  describe("App 构造函数", () => {
    it("应该创建 App 实例", () => {
      const app = new App();

      expect(app).toBeDefined();
      expect(app.name).toBe("dweb-app");
      expect(app.version).toBe("1.0.0");
    });

    it("应该使用配置中的应用名称", () => {
      const config: AppConfig = {
        name: "my-app",
      };

      const app = new App(config);

      expect(app.name).toBe("my-app");
    });

    it("应该使用配置中的应用版本", () => {
      const config: AppConfig = {
        version: "2.0.0",
      };

      const app = new App(config);

      expect(app.version).toBe("2.0.0");
    });

    it("应该创建服务容器", () => {
      const app = new App();

      expect(app.container).toBeDefined();
      expect(typeof app.container.get).toBe("function");
    });

    it("应该完成配置初始化", async () => {
      const app = new App();

      // 等待配置初始化
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(app).toBeDefined();
    });
  });

  describe("App.use() 中间件注册", () => {
    it("应该注册中间件", async () => {
      const app = new App();

      // 等待配置初始化完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      let _middlewareCalled = false;
      const middleware = async (
        _ctx: unknown,
        next: () => Promise<void>,
      ) => {
        _middlewareCalled = true;
        await next();
      };

      expect(() => app.use(middleware)).not.toThrow();
    });

    it("应该支持带名称的中间件注册", async () => {
      const app = new App();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const middleware = async (
        _ctx: unknown,
        next: () => Promise<void>,
      ) => {
        await next();
      };

      expect(() => app.use(middleware, undefined, "test-middleware")).not
        .toThrow();
    });

    it("应该支持带路径的中间件注册", async () => {
      const app = new App();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const middleware = async (
        _ctx: unknown,
        next: () => Promise<void>,
      ) => {
        await next();
      };

      expect(() => app.use("/api", middleware)).not.toThrow();
    });
  });

  describe("App.registerPlugin() 插件注册", () => {
    it("应该注册插件", async () => {
      const app = new App();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const plugin: Plugin = {
        name: "test-plugin",
        version: "1.0.0",
      };

      expect(() => app.registerPlugin(plugin)).not.toThrow();
    });

    it("应该注册带钩子的插件", async () => {
      const app = new App();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const plugin: Plugin = {
        name: "hook-plugin",
        version: "1.0.0",
        onInit() {
          // 初始化钩子
        },
      };

      expect(() => app.registerPlugin(plugin)).not.toThrow();
    });
  });

  describe("App.on() 生命周期钩子", () => {
    it("应该注册生命周期钩子", async () => {
      const app = new App();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(() => {
        app.on("starting", async () => {
          // 启动钩子
        });
      }).not.toThrow();
    });

    it("应该支持多个生命周期阶段", async () => {
      const app = new App();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const stages = [
        "starting",
        "started",
        "stopping",
        "stopped",
      ] as const;

      for (const stage of stages) {
        expect(() => {
          app.on(stage, async () => {});
        }).not.toThrow();
      }
    });
  });

  describe("App.stage 属性", () => {
    it("应该返回当前生命周期阶段", async () => {
      const app = new App();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(app.stage).toBeDefined();
      expect(typeof app.stage).toBe("string");
    });
  });

  describe("App 配置集成", () => {
    it("应该支持日志配置", () => {
      const config: AppConfig = {
        logger: {
          level: "debug",
        },
      };

      const app = new App(config);

      expect(app).toBeDefined();
    });

    it("应该支持环境变量前缀配置", () => {
      const config: AppConfig = {
        envPrefix: "MY_APP_",
      };

      const app = new App(config);

      expect(app).toBeDefined();
    });

    it("应该支持热重载配置", () => {
      const config: AppConfig = {
        hotReload: true,
      };

      const app = new App(config);

      expect(app).toBeDefined();
    });

    it("应该支持插件管理器选项配置", () => {
      const config: AppConfig = {
        pluginManagerOptions: {
          autoActivate: true,
          continueOnError: false,
        },
      };

      const app = new App(config);

      expect(app).toBeDefined();
    });
  });

  describe("App 服务容器集成", () => {
    it("应该能从容器获取服务", async () => {
      const app = new App();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // 服务容器应该有 serviceContainer 服务
      const serviceContainer = app.container.get("serviceContainer");
      expect(serviceContainer).toBe(app.container);
    });

    it("应该能注册自定义服务", async () => {
      const app = new App();

      await new Promise((resolve) => setTimeout(resolve, 100));

      app.container.registerSingleton("customService", () => ({
        value: 42,
      }));

      const customService = app.container.get<{ value: number }>(
        "customService",
      );
      expect(customService.value).toBe(42);
    });
  });
}, { sanitizeOps: false, sanitizeResources: false });
