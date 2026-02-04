/**
 * db 命令测试
 *
 * 测试 src/cmd/db.ts：
 * - migrate create 能创建迁移文件（ensureDir 覆盖）
 * - 迁移文件符合 @dreamer/database Migration 接口
 */

import {
  chdir,
  cwd,
  exists,
  join,
  makeTempDir,
  readdir,
  readTextFile,
  remove,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { migrate } from "../../src/cmd/db.ts";

describe("db (cmd/db.ts)", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-db-test-" });
    originalCwd = cwd();
    chdir(testDir);
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  describe("migrate create", () => {
    it("应创建 migrations 目录和迁移文件（ensureDir 覆盖）", async () => {
      await migrate([], {
        action: "create",
        name: "add_users",
        "db-type": "sql",
      });

      const migrationsDir = join(testDir, "migrations");
      expect(await exists(migrationsDir)).toBe(true);

      const entries = await readdir(migrationsDir);
      const files = entries
        .filter((e) => e.isFile && e.name.endsWith(".ts"))
        .map((e) => e.name);

      expect(files.length).toBeGreaterThanOrEqual(1);
      const migrationFile = files.find((f) => f.includes("add_users"));
      expect(migrationFile).toBeDefined();

      const content = await readTextFile(
        join(migrationsDir, migrationFile as string),
      );
      expect(content).toContain("add_users");
      expect(content).toContain("Migration");
      expect(content).toContain("async up(");
      expect(content).toContain("async down(");
    });

    it("应支持 mongodb 类型模板", async () => {
      await migrate([], {
        action: "create",
        name: "create_collections",
        "db-type": "mongodb",
      });

      const migrationsDir = join(testDir, "migrations");
      const entries = await readdir(migrationsDir);
      const files = entries
        .filter((e) => e.isFile && e.name.endsWith(".ts"))
        .map((e) => e.name);

      const mongoFile = files.find((f) =>
        f.includes("create_collections")
      );
      expect(mongoFile).toBeDefined();

      const content = await readTextFile(
        join(migrationsDir, mongoFile as string),
      );
      expect(content).toContain("MongoDB");
      expect(content).toContain("createCollection");
    });
  });
});
