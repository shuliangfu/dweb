/**
 * 数据库集成测试
 *
 * 测试 src/core/database.ts 的功能：
 * - initializeDatabase 初始化数据库管理器
 * - getDatabaseManager 获取数据库管理器
 * - getDatabaseStatus 获取连接状态
 * - connectDatabases 将容器内 Manager 同步到 `@dreamer/database` 全局单例（ORM）
 * - SQLModel.init/create 验证 ORM 已通过全局连接就绪（MongoModel 同源的 getDatabaseAsync）
 */

import "../setup.ts";
import {
  closeDatabase,
  getDatabaseAsync,
  getDatabaseManager as getOrmDatabaseManager,
  isDatabaseInitialized,
  SQLModel,
} from "@dreamer/database";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  connectDatabases,
  getDatabaseManager,
  getDatabaseStatus,
  initializeDatabase,
} from "../../src/core/database.ts";
import { initializeServiceContainer } from "../../src/core/service.ts";
import type { AppConfig } from "../../src/types/app.ts";
import { initializeLogger } from "../../src/utils/logger.ts";
import type { ServiceContainer } from "@dreamer/service";

/**
 * `connectDatabases` 内部会 `getLogger(container)`，单测需先注册 logger。
 *
 * @param base 合并进 `initializeLogger` 的应用配置片段
 */
function createDbTestContainer(base: AppConfig = {}): ServiceContainer {
  const container = initializeServiceContainer();
  initializeLogger(container, base);
  return container;
}

/**
 * SQLite 烟测表名：`connectDatabases` + `SQLModel` 全流程用（与 Mongo 无关，仅验证 ORM 绑定全局 Manager）。
 */
const ORM_CONNECT_SMOKE_TABLE = "dweb_orm_connect_smoke";

/**
 * 最小 SQL 模型：仅 `id` + `tag`，用于断言 `init`/`create` 可走通。
 */
class OrmConnectSmokeModel extends SQLModel {
  static override tableName = ORM_CONNECT_SMOKE_TABLE;
  static override primaryKey = "id";
  /** schema 非基类声明成员，不可用 override */
  static schema = {
    id: {
      type: "integer" as const,
      validate: {},
    },
    tag: {
      type: "string" as const,
      validate: { required: true },
    },
  };
}

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

  describe("connectDatabases()", () => {
    /** 清空 `@dreamer/database` 全局单例，避免用例间串扰 */
    beforeEach(async () => {
      await closeDatabase().catch(() => {
        /** 尚无全局实例时忽略 */
      });
    });

    it("应在连库成功后把容器 DatabaseManager 同步为 ORM 所用全局实例", async () => {
      const container = createDbTestContainer();
      const config: AppConfig = {
        language: "en-US",
        database: {
          default: {
            adapter: "sqlite",
            connection: {
              filename: ":memory:",
            },
          },
        },
      };

      initializeDatabase(container, config);
      expect(isDatabaseInitialized()).toBe(false);

      await connectDatabases(container, config);

      const fromContainer = getDatabaseManager(container);
      const fromOrmPackage = getOrmDatabaseManager();

      expect(fromOrmPackage).toBe(fromContainer);
      expect(isDatabaseInitialized()).toBe(true);

      await closeDatabase();
    });

    it("同步后 ORM 的 getDatabaseAsync 不应依赖 setDatabaseConfigLoader", async () => {
      const container = createDbTestContainer();
      const config: AppConfig = {
        language: "en-US",
        database: {
          default: {
            adapter: "sqlite",
            connection: {
              filename: ":memory:",
            },
          },
        },
      };

      initializeDatabase(container, config);
      await connectDatabases(container, config);

      const adapter = await getDatabaseAsync("default");
      expect(adapter).toBeDefined();

      await closeDatabase();
    });

    it("在未连接任何命名连接但仍调用 connectDatabases 时应注册全局 Manager", async () => {
      const container = createDbTestContainer();
      const config: AppConfig = {
        database: {},
      };

      initializeDatabase(container, config);
      await connectDatabases(container, config);

      expect(getOrmDatabaseManager()).toBe(getDatabaseManager(container));

      await closeDatabase();
    });

    it("connectDatabases 后 SQLModel.init 与 create 可用（ORM 已从全局连接取适配器）", async () => {
      const container = createDbTestContainer();
      const config: AppConfig = {
        language: "en-US",
        database: {
          default: {
            adapter: "sqlite",
            connection: {
              filename: ":memory:",
            },
          },
        },
      };

      initializeDatabase(container, config);
      await connectDatabases(container, config);

      const adapter = await getDatabaseAsync("default");
      await adapter.execute(
        `DROP TABLE IF EXISTS ${ORM_CONNECT_SMOKE_TABLE}`,
        [],
      );
      await adapter.execute(
        `CREATE TABLE ${ORM_CONNECT_SMOKE_TABLE} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tag TEXT NOT NULL
        )`,
        [],
      );

      await OrmConnectSmokeModel.init();
      expect(OrmConnectSmokeModel.adapter).toBeDefined();

      await OrmConnectSmokeModel.create({ tag: "orm_ping" });
      const rows = await OrmConnectSmokeModel.findAll();
      expect(rows.length).toBe(1);

      await closeDatabase();
    });
  });
});
