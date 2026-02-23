/**
 * 数据库集成测试
 *
 * 测试 src/core/database.ts 的功能：
 * - initializeDatabase 初始化数据库管理器
 * - getDatabaseManager 获取数据库管理器
 * - getDatabaseStatus 获取连接状态
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  getDatabaseManager,
  getDatabaseStatus,
  initializeDatabase,
} from "../../src/core/database.ts";
import { initializeServiceContainer } from "../../src/core/service.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("数据库集成 (database.ts)", () => {
  describe("initializeDatabase()", () => {
    it("应该创建数据库管理器实例", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const manager = initializeDatabase(container, config);

      expect(manager).toBeDefined();
      expect(typeof manager.connect).toBe("function");
      expect(typeof manager.closeAll).toBe("function");
    });

    it("应该将数据库管理器注册到服务容器", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const manager = initializeDatabase(container, config);
      const retrievedManager = container.get("databaseManager");

      expect(retrievedManager).toBe(manager);
    });

    it("应该接受数据库配置", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        database: {
          managerOptions: {
            name: "test",
          },
        },
      };

      const manager = initializeDatabase(container, config);

      expect(manager).toBeDefined();
      expect(manager.getName()).toBe("test");
    });

    it("多次调用会抛出错误（服务已注册）", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeDatabase(container, config);

      expect(() => initializeDatabase(container, config)).toThrow(
        /已注册|already registered/i,
      );
    });
  });

  describe("getDatabaseManager()", () => {
    it("应该从容器中获取数据库管理器", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      const created = initializeDatabase(container, config);
      const retrieved = getDatabaseManager(container);

      expect(retrieved).toBe(created);
    });

    it("应该在未初始化时抛出错误", () => {
      const container = initializeServiceContainer();

      expect(() => getDatabaseManager(container)).toThrow();
    });

    it("应该支持命名管理器", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        database: {
          managerOptions: {
            name: "custom",
          },
        },
      };

      initializeDatabase(container, config);
      const retrieved = getDatabaseManager(container, "custom");

      expect(retrieved).toBeDefined();
      expect(retrieved.getName()).toBe("custom");
    });
  });

  describe("getDatabaseStatus()", () => {
    it("应该在无连接时返回空数组", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {};

      initializeDatabase(container, config);
      const status = getDatabaseStatus(container);

      expect(status).toEqual([]);
    });

    it("应该在管理器未初始化时返回空数组", () => {
      const container = initializeServiceContainer();
      const status = getDatabaseStatus(container);

      expect(status).toEqual([]);
    });
  });

  describe("数据库配置", () => {
    it("应该支持默认连接配置", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        database: {
          default: {
            adapter: "sqlite",
            connection: {
              filename: ":memory:",
            },
          },
        },
      };

      const manager = initializeDatabase(container, config);

      expect(manager).toBeDefined();
    });

    it("应该支持多个命名连接配置", () => {
      const container = initializeServiceContainer();
      const config: AppConfig = {
        database: {
          connections: {
            primary: {
              adapter: "sqlite",
              connection: {
                filename: ":memory:",
              },
            },
            secondary: {
              adapter: "sqlite",
              connection: {
                filename: ":memory:",
              },
            },
          },
        },
      };

      const manager = initializeDatabase(container, config);

      expect(manager).toBeDefined();
    });
  });
});
