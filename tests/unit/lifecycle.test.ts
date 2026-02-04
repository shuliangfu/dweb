/**
 * 生命周期管理模块测试
 *
 * 测试 src/core/lifecycle.ts 的功能：
 * - initializeLifecycle 初始化生命周期管理器
 * - getLifecycleManager 获取生命周期管理器
 * - registerLifecycleHook 注册生命周期钩子
 */

import { describe, expect, it } from "@dreamer/test";
import {
  getLifecycleManager,
  initializeLifecycle,
  registerLifecycleHook,
} from "../../src/core/lifecycle.ts";
import { initializeServiceContainer } from "../../src/core/service.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("生命周期管理 (lifecycle.ts)", () => {
  describe("initializeLifecycle()", () => {
    it("应该创建生命周期管理器实例", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const lifecycleManager = initializeLifecycle(container, config);

      expect(lifecycleManager).toBeDefined();
      expect(typeof lifecycleManager.on).toBe("function");
      expect(typeof lifecycleManager.start).toBe("function");
    });

    it("应该将生命周期管理器注册到服务容器", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const lifecycleManager = initializeLifecycle(container, config);
      const retrievedManager = container.get("lifecycleManager");

      expect(retrievedManager).toBe(lifecycleManager);
    });

    it("应该使用配置中的 lifecycle 选项", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        lifecycle: {
          autoEmitEvents: true,
          timeout: 5000,
        },
      };

      const lifecycleManager = initializeLifecycle(container, config);

      // 验证管理器已创建（配置选项在内部使用）
      expect(lifecycleManager).toBeDefined();
    });

    it("应该使用默认配置当 lifecycle 未提供", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const lifecycleManager = initializeLifecycle(container, config);

      expect(lifecycleManager).toBeDefined();
    });

    it("多次调用会抛出错误（服务已注册）", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      // 第一次调用成功
      initializeLifecycle(container, config);

      // 第二次调用应该抛出错误
      expect(() => initializeLifecycle(container, config)).toThrow(
        "已注册",
      );
    });
  });

  describe("getLifecycleManager()", () => {
    it("应该从容器中获取生命周期管理器", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const created = initializeLifecycle(container, config);
      const retrieved = getLifecycleManager(container);

      expect(retrieved).toBe(created);
    });

    it("应该在未初始化时抛出错误", () => {
      const container = initializeServiceContainer();

      expect(() => getLifecycleManager(container)).toThrow();
    });
  });

  describe("registerLifecycleHook()", () => {
    it("应该注册生命周期钩子", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeLifecycle(container, config);

      let hookCalled = false;
      const hook = () => {
        hookCalled = true;
      };

      // 注册 started 阶段的钩子（initialize -> start 会触发）
      registerLifecycleHook(container, "started", hook);

      // 触发生命周期转换来验证钩子被调用
      const lifecycleManager = getLifecycleManager(container);
      await lifecycleManager.initialize();
      await lifecycleManager.start();

      expect(hookCalled).toBe(true);
    });

    it("应该支持多个钩子注册到同一阶段", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeLifecycle(container, config);

      const callOrder: number[] = [];

      // 使用 started 阶段来测试
      registerLifecycleHook(container, "started", () => {
        callOrder.push(1);
      });
      registerLifecycleHook(container, "started", () => {
        callOrder.push(2);
      });

      const lifecycleManager = getLifecycleManager(container);
      await lifecycleManager.initialize();
      await lifecycleManager.start();

      expect(callOrder).toEqual([1, 2]);
    });

    it("应该支持不同阶段的钩子", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      initializeLifecycle(container, config);

      const stages: string[] = [];

      registerLifecycleHook(container, "starting", () => {
        stages.push("starting");
      });
      registerLifecycleHook(container, "started", () => {
        stages.push("started");
      });

      const lifecycleManager = getLifecycleManager(container);
      await lifecycleManager.initialize();
      await lifecycleManager.start();

      expect(stages).toEqual(["starting", "started"]);
    });
  });

  describe("生命周期阶段转换", () => {
    it("应该支持完整的生命周期流程", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      const lifecycleManager = initializeLifecycle(container, config);

      const stages: string[] = [];

      lifecycleManager.on("starting", () => {
        stages.push("starting");
      });
      lifecycleManager.on("started", () => {
        stages.push("started");
      });
      lifecycleManager.on("stopping", () => {
        stages.push("stopping");
      });
      lifecycleManager.on("stopped", () => {
        stages.push("stopped");
      });

      // 执行生命周期转换
      await lifecycleManager.initialize();
      await lifecycleManager.start();
      await lifecycleManager.stop();
      await lifecycleManager.shutdown();

      expect(stages).toEqual(["starting", "started", "stopping", "stopped"]);
    });

    it("应该能获取当前阶段", async () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};
      const lifecycleManager = initializeLifecycle(container, config);

      expect(lifecycleManager.getStage()).toBe("uninitialized");

      await lifecycleManager.initialize();
      expect(lifecycleManager.getStage()).toBe("initialized");

      await lifecycleManager.start();
      // start() 方法完成后进入 ready 阶段
      expect(lifecycleManager.getStage()).toBe("ready");
    });
  });
});
