/**
 * 日志集成测试
 *
 * 测试 src/utils/logger.ts 的功能：
 * - initializeLogger 初始化日志服务
 * - getLogger 获取日志实例
 * - 日志方法的调用
 */

import { describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import type { AppConfig } from "../../src/types/app.ts";
import { getLogger, initializeLogger } from "../../src/utils/logger.ts";

describe("日志集成 (logger.ts)", () => {
  describe("initializeLogger()", () => {
    it("应该创建日志实例并包含所有日志方法", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const logger = initializeLogger(container, config);

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });

    it("应该将日志实例注册为单例", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const logger = initializeLogger(container, config);
      const retrieved1 = container.get("logger");
      const retrieved2 = container.get("logger");

      expect(retrieved1).toBe(logger);
      expect(retrieved2).toBe(logger);
    });

    it("多次调用会抛出错误（服务已注册）", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeLogger(container, config);

      expect(() => initializeLogger(container, config)).toThrow("已注册");
    });
  });

  describe("getLogger()", () => {
    it("应该从容器中获取相同的日志实例", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const created = initializeLogger(container, config);
      const retrieved = getLogger(container);

      expect(retrieved).toBe(created);
    });

    it("应该在未初始化时抛出错误", () => {
      const container = initializeServiceContainer();

      expect(() => getLogger(container)).toThrow();
    });
  });

  describe("日志方法调用", () => {
    it("info 方法应该能被调用且不抛出错误", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const logger = initializeLogger(container, config);

      // 调用 info 方法不应该抛出错误
      expect(() => {
        logger.info("测试消息");
      }).not.toThrow();
    });

    it("error 方法应该能被调用且不抛出错误", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const logger = initializeLogger(container, config);

      // 调用 error 方法不应该抛出错误
      expect(() => {
        logger.error("错误消息");
      }).not.toThrow();
    });

    it("warn 方法应该能被调用且不抛出错误", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const logger = initializeLogger(container, config);

      // 调用 warn 方法不应该抛出错误
      expect(() => {
        logger.warn("警告消息");
      }).not.toThrow();
    });

    it("debug 方法应该能被调用且不抛出错误", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = { logger: { level: "debug" } };

      const logger = initializeLogger(container, config);

      // 调用 debug 方法不应该抛出错误
      expect(() => {
        logger.debug("调试消息");
      }).not.toThrow();
    });

    it("日志方法应该接受额外参数", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const logger = initializeLogger(container, config);

      // 调用带参数的日志方法不应该抛出错误
      expect(() => {
        logger.info("带参数的消息", { key: "value", count: 42 });
      }).not.toThrow();
    });

    it("日志方法应该接受 Error 对象", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const logger = initializeLogger(container, config);

      // 调用带 Error 对象的日志方法不应该抛出错误
      expect(() => {
        logger.error("发生错误", new Error("测试错误"));
      }).not.toThrow();
    });
  });

  describe("日志配置", () => {
    it("配置 debug 级别应正常创建日志实例", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        logger: { level: "debug" },
      };

      const logger = initializeLogger(container, config);

      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe("function");
    });

    it("配置 info 级别应正常创建日志实例", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        logger: { level: "info" },
      };

      const logger = initializeLogger(container, config);

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
    });

    it("配置 warn 级别应正常创建日志实例", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        logger: { level: "warn" },
      };

      const logger = initializeLogger(container, config);

      expect(logger).toBeDefined();
      expect(typeof logger.warn).toBe("function");
    });

    it("配置 error 级别应正常创建日志实例", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        logger: { level: "error" },
      };

      const logger = initializeLogger(container, config);

      expect(logger).toBeDefined();
      expect(typeof logger.error).toBe("function");
    });

    it("配置 json 格式应正常创建日志实例", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        logger: { format: "json" },
      };

      const logger = initializeLogger(container, config);

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
    });

    it("配置 text 格式应正常创建日志实例", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        logger: { format: "text" },
      };

      const logger = initializeLogger(container, config);

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
    });
  });
});
