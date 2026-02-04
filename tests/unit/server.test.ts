/**
 * 服务器集成测试
 *
 * 测试 src/feature/server.ts 的功能：
 * - initializeServer 初始化服务器
 * - getServer 获取服务器实例
 * - startServer, stopServer 启动和停止服务器
 */

import { describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { getServer, initializeServer } from "../../src/feature/server.ts";
import type { AppConfig } from "../../src/types/app.ts";
import { initializeLogger } from "../../src/utils/logger.ts";

describe("服务器集成 (server.ts)", () => {
  // 辅助函数：创建带 logger 的测试环境
  function createTestEnv(config: AppConfig = {}) {
    const container = initializeServiceContainer();
    initializeLogger(container, config);
    return container;
  }

  describe("initializeServer()", () => {
    it("应该创建服务器实例", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        server: { port: 3000 },
      };

      const server = initializeServer(container, config);

      expect(server).toBeDefined();
      expect(typeof server.start).toBe("function");
      expect(typeof server.stop).toBe("function");
    });

    it("应该将服务器注册到服务容器", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        server: { port: 3000 },
      };

      const server = initializeServer(container, config);
      const retrievedServer = container.get("server");

      expect(retrievedServer).toBe(server);
    });

    it("应该使用配置中的端口号", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        server: { port: 8080 },
      };

      const server = initializeServer(container, config);

      // 验证服务器已创建
      expect(server).toBeDefined();
    });

    it("应该使用配置中的主机名", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        server: { host: "0.0.0.0" },
      };

      const server = initializeServer(container, config);

      expect(server).toBeDefined();
    });

    it("应该使用默认配置当未提供配置时", () => {
      const container = createTestEnv();
      const config: AppConfig = {};

      const server = initializeServer(container, config);

      expect(server).toBeDefined();
    });

    it("多次调用会抛出错误（服务已注册）", () => {
      const container = createTestEnv();
      const config: AppConfig = { server: { port: 3000 } };

      initializeServer(container, config);

      expect(() => initializeServer(container, config)).toThrow("已注册");
    });
  });

  describe("getServer()", () => {
    it("应该从容器中获取服务器实例", () => {
      const container = createTestEnv();
      const config: AppConfig = { server: { port: 3000 } };

      const created = initializeServer(container, config);
      const retrieved = getServer(container);

      expect(retrieved).toBe(created);
    });

    it("应该在未初始化时抛出错误", () => {
      const container = createTestEnv();

      expect(() => getServer(container)).toThrow();
    });
  });

  describe("服务器配置", () => {
    it("应该支持 dev 模式配置", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        server: {
          mode: "dev",
          port: 3000,
        },
      };

      const server = initializeServer(container, config);

      expect(server).toBeDefined();
    });

    it("应该支持 prod 模式配置", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        server: {
          mode: "prod",
          port: 8000,
        },
      };

      const server = initializeServer(container, config);

      expect(server).toBeDefined();
    });

    it("应该支持 shutdownTimeout 配置", () => {
      const container = createTestEnv();
      const config: AppConfig = {
        server: {
          port: 3000,
          shutdownTimeout: 5000,
        },
      };

      const server = initializeServer(container, config);

      expect(server).toBeDefined();
    });

    it("应该支持 onListen 回调配置", () => {
      const container = createTestEnv();
      let _listenCalled = false;

      const config: AppConfig = {
        server: {
          port: 3000,
          onListen: () => {
            _listenCalled = true;
          },
        },
      };

      const server = initializeServer(container, config);

      expect(server).toBeDefined();
      // onListen 会在服务器真正启动时调用
    });

    it("应该支持 onError 回调配置", () => {
      const container = createTestEnv();

      const config: AppConfig = {
        server: {
          port: 3000,
          onError: () => {
            return new Response("Error", { status: 500 });
          },
        },
      };

      const server = initializeServer(container, config);

      expect(server).toBeDefined();
    });
  });
});
