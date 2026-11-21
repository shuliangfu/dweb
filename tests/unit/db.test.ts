/**
 * db 命令测试
 *
 * 测试 src/cmd/db.ts：
 * - migrate create 能创建迁移文件（ensureDir 覆盖）
 * - 迁移文件符合 @dreamer/database Migration 接口
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  exists,
  join,
  makeTempDir,
  mkdir,
  readdir,
  readTextFile,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "@dreamer/test";
import { migrate, seed, status } from "../../src/cmd/db.ts";

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

      const mongoFile = files.find((f) => f.includes("create_collections"));
      expect(mongoFile).toBeDefined();

      const content = await readTextFile(
        join(migrationsDir, mongoFile as string),
      );
      expect(content).toContain("MongoDB");
      expect(content).toContain("createCollection");
    });
  });
});

describe("db 命令早退与 task 回退", () => {
  const temps: string[] = [];
  const cwdStack: string[] = [];

  afterEach(async () => {
    while (cwdStack.length) chdir(cwdStack.pop()!);
    for (const dir of temps.splice(0)) {
      await remove(dir, { recursive: true }).catch(() => {});
    }
  });

  async function enterTemp(
    prefix: string,
    files: Record<string, string> = {},
  ): Promise<string> {
    const dir = await makeTempDir({ prefix });
    temps.push(dir);
    for (const [rel, content] of Object.entries(files)) {
      const path = join(dir, rel);
      const parent = path.slice(0, path.lastIndexOf("/"));
      if (parent && parent !== dir) await mkdir(parent, { recursive: true });
      await writeTextFile(path, content);
    }
    cwdStack.push(cwd());
    chdir(dir);
    return dir;
  }

  it("migrate create 未给 name 时应直接返回", async () => {
    await enterTemp("dweb-db-create-noname-");
    await migrate([], { action: "create" });
  });

  it("migrate 不支持的 action 不应抛错", async () => {
    await enterTemp("dweb-db-bad-action-");
    await migrate([], { action: "sideways" });
  });

  it("migrate up 在没有 migrations 目录时应返回", async () => {
    await enterTemp("dweb-db-up-nodir-", {
      "deno.json": JSON.stringify({ name: "tmp", version: "0.0.1" }),
    });
    await migrate([], { action: "up" });
  });

  it("migrate up 没有 database 也没有 task 时应提示并返回", async () => {
    await enterTemp("dweb-db-up-notask-", {
      "deno.json": JSON.stringify({ name: "tmp", version: "0.0.1" }),
      "migrations/.keep": "",
    });
    await migrate([], { action: "up" });
  });

  it("migrate up 有 db:migrate:up task 且成功时应走完", async () => {
    await enterTemp("dweb-db-up-ok-", {
      "deno.json": JSON.stringify({
        name: "tmp",
        version: "0.0.1",
        tasks: { "db:migrate:up": "echo migrated" },
      }),
      "migrations/.keep": "",
    });
    await migrate([], { action: "up" });
  });

  it("migrate up 有 db:migrate task 且失败时不应抛出", async () => {
    await enterTemp("dweb-db-up-fail-", {
      "deno.json": JSON.stringify({
        name: "tmp",
        version: "0.0.1",
        tasks: { "db:migrate": "exit 1" },
      }),
      "migrations/.keep": "",
    });
    await migrate([], { action: "up" });
  });

  it("migrate down 没有 name 且没有 database 时应返回", async () => {
    await enterTemp("dweb-db-down-noname-", {
      "deno.json": JSON.stringify({ name: "tmp", version: "0.0.1" }),
    });
    await migrate([], { action: "down" });
  });

  it("migrate down 没有 task 时应提示并返回", async () => {
    await enterTemp("dweb-db-down-notask-", {
      "deno.json": JSON.stringify({ name: "tmp", version: "0.0.1" }),
    });
    await migrate([], { action: "down", name: "add_users" });
  });

  it("migrate down 有 db:migrate:down task 且成功时应走完", async () => {
    await enterTemp("dweb-db-down-ok-", {
      "deno.json": JSON.stringify({
        name: "tmp",
        version: "0.0.1",
        tasks: { "db:migrate:down": "echo rolled" },
      }),
    });
    await migrate([], { action: "down", name: "add_users" });
  });

  it("migrate down 有 task 且失败时不应抛出", async () => {
    await enterTemp("dweb-db-down-fail-", {
      "deno.json": JSON.stringify({
        name: "tmp",
        version: "0.0.1",
        tasks: { "db:migrate:down": "exit 1" },
      }),
    });
    await migrate([], { action: "down", name: "add_users", count: 2 });
  });

  it("seed 没有 deno.json 时应返回", async () => {
    await enterTemp("dweb-db-seed-noproj-");
    await seed([], {});
  });

  it("seed 没有 task 也没有 seed 文件时应返回", async () => {
    await enterTemp("dweb-db-seed-noconfig-", {
      "deno.json": JSON.stringify({ name: "tmp", version: "0.0.1" }),
    });
    await seed([], {});
  });

  it("seed 有 db:seed task 且成功时应走完", async () => {
    await enterTemp("dweb-db-seed-ok-", {
      "deno.json": JSON.stringify({
        name: "tmp",
        version: "0.0.1",
        tasks: { "db:seed": "echo seeded" },
      }),
    });
    await seed([], {});
  });

  it("seed 有 db:seed task 且失败时不应抛出", async () => {
    await enterTemp("dweb-db-seed-fail-", {
      "deno.json": JSON.stringify({
        name: "tmp",
        version: "0.0.1",
        tasks: { "db:seed": "exit 1" },
      }),
    });
    await seed([], {});
  });

  it("seed 没有 task 但有 seeds/seed.ts 且成功时应走完", async () => {
    await enterTemp("dweb-db-seed-file-ok-", {
      "deno.json": JSON.stringify({ name: "tmp", version: "0.0.1" }),
      "seeds/seed.ts": "console.log('seed file');",
    });
    await seed([], {});
  });

  it("seed 没有 task 且 seeds/seed.ts 失败时不应抛出", async () => {
    await enterTemp("dweb-db-seed-file-fail-", {
      "deno.json": JSON.stringify({ name: "tmp", version: "0.0.1" }),
      "seeds/seed.ts": "throw new Error('seed boom');",
    });
    await seed([], {});
  });

  it("status 没有 migrations 目录时应返回", async () => {
    await enterTemp("dweb-db-status-nodir-");
    await status([], {});
  });

  it("status 在空 migrations 目录时应提示没有迁移", async () => {
    await enterTemp("dweb-db-status-empty-", {
      "migrations/.keep": "",
    });
    await status([], {});
  });

  it("status 应列出迁移文件", async () => {
    await enterTemp("dweb-db-status-files-", {
      "migrations/1700000000000_add_users.ts": "export {}",
      "migrations/notes.txt": "ignore",
    });
    await status([], {});
  });
});
