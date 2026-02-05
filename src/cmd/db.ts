/**
 * dweb db 命令
 *
 * 职责：
 * - 数据库相关子命令：migrate、seed、status
 * - 使用 runtime-adapter 保证 Deno/Bun 兼容
 * - migrate create 生成符合 @dreamer/database Migration 接口的迁移文件
 * - migrate up/down 优先使用 @dreamer/database MigrationManager（需 config.database.default），否则执行 task
 *
 * 运行方式：
 * - dweb db migrate -a create -n add_users
 * - dweb db migrate -a create -n add_users --db-type mongodb
 * - dweb db migrate -a up
 * - dweb db migrate -a down -c 1（MigrationManager 回滚数量）或 -n add_users（task 方式）
 * - dweb db seed
 * - dweb db status
 */

import { error, info, success } from "@dreamer/console";
import { DatabaseManager, MigrationManager } from "@dreamer/database";
import {
  createCommand,
  cwd,
  ensureDir,
  join,
  readdir,
  stat,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";
import { loadProjectConfig } from "../utils/config-loader.ts";
import { getProjectInfo } from "../utils/project.ts";
import { getRunArgs, getRuntime, getTaskArgs } from "../utils/runtime.ts";

/** SQL 迁移模板（符合 @dreamer/database Migration 接口） */
function getSqlMigrationTemplate(name: string, className: string): string {
  return `/**
 * 数据库迁移: ${name}
 * 创建时间: ${new Date().toISOString()}
 * 符合 @dreamer/database Migration 接口
 */

import type { Migration } from "@dreamer/database";
import type { DatabaseAdapter } from "@dreamer/database";

export default class ${className} implements Migration {
  name = "${name}";

  /**
   * 执行迁移（升级）
   * @param db 数据库适配器实例
   */
  async up(db: DatabaseAdapter): Promise<void> {
    // 在此实现迁移逻辑
    // 示例：创建表
    // await db.execute(\`
    //   CREATE TABLE IF NOT EXISTS users (
    //     id INTEGER PRIMARY KEY AUTOINCREMENT,
    //     name TEXT NOT NULL,
    //     email TEXT UNIQUE NOT NULL,
    //     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    //   )
    // \`);
  }

  /**
   * 回滚迁移（降级）
   * @param db 数据库适配器实例
   */
  async down(db: DatabaseAdapter): Promise<void> {
    // 在此实现回滚逻辑（与 up 方法相反的操作）
    // 示例：删除表
    // await db.execute("DROP TABLE IF EXISTS users");
  }
}
`;
}

/** MongoDB 迁移模板 */
function getMongoMigrationTemplate(name: string, className: string): string {
  return `/**
 * 数据库迁移: ${name}
 * 创建时间: ${new Date().toISOString()}
 * 符合 @dreamer/database Migration 接口（MongoDB）
 */

import type { Migration } from "@dreamer/database";
import type { DatabaseAdapter } from "@dreamer/database";

export default class ${className} implements Migration {
  name = "${name}";

  /**
   * 执行迁移（升级）
   * @param db 数据库适配器实例
   */
  async up(db: DatabaseAdapter): Promise<void> {
    // 在此实现迁移逻辑
    // 示例：创建集合
    // await db.execute("createCollection", "users", {});
  }

  /**
   * 回滚迁移（降级）
   * @param db 数据库适配器实例
   */
  async down(db: DatabaseAdapter): Promise<void> {
    // 在此实现回滚逻辑
    // 示例：删除集合
    // await db.execute("dropCollection", "users", {});
  }
}
`;
}

/** 将迁移名称转为类名（驼峰） */
function toClassName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
}

/**
 * migrate 子命令：创建迁移、执行迁移、回滚迁移
 */
export async function migrate(
  _args: string[],
  options: ParsedOptions,
): Promise<void> {
  const runtime = getRuntime();
  const rawAction = options.action;
  const action = rawAction === true
    ? "up"
    : (String(rawAction ?? "up") as string);
  const name = options.name as string | undefined;
  const dbType = (options["db-type"] as string) || "sql";

  try {
    if (action === "create") {
      if (!name) {
        error("创建迁移需要指定名称（--name）");
        return;
      }
      info(`正在创建迁移: ${name} (类型: ${dbType})`);

      const currentDir = cwd();
      const migrationsDir = join(currentDir, "migrations");
      await ensureDir(migrationsDir);

      const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, "_");
      const timestamp = Date.now();
      const migrationName = `${timestamp}_${sanitizedName}`;
      const migrationFile = join(migrationsDir, `${migrationName}.ts`);
      const className = toClassName(sanitizedName);

      try {
        await stat(migrationFile);
        error(`迁移文件已存在: ${migrationFile}`);
        return;
      } catch {
        // 文件不存在，可以创建
      }

      const content = dbType === "mongodb"
        ? getMongoMigrationTemplate(name, className)
        : getSqlMigrationTemplate(name, className);

      await writeTextFile(migrationFile, content);
      success(`迁移 ${name} 创建完成！`);
      info(`迁移文件: ${migrationFile}`);
      info("提示: 执行迁移需配置数据库，可添加 deno task db:migrate:up");
    } else if (action === "up") {
      const projectRoot = cwd();
      const projectInfo = await getProjectInfo(projectRoot);
      const migrationsDir = join(projectRoot, "migrations");

      try {
        await stat(migrationsDir);
      } catch {
        error(`迁移目录不存在: ${migrationsDir}`);
        error("请先创建迁移文件（使用 dweb db migrate -a create -n <name>）");
        return;
      }

      // 优先尝试使用 @dreamer/database MigrationManager（需项目配置了 database）
      try {
        const config = await loadProjectConfig(projectRoot);
        const dbConfig = config.database as
          | { default?: { type: string } }
          | undefined;
        if (dbConfig?.default) {
          const manager = new DatabaseManager();
          await manager.connect(
            "default",
            dbConfig.default as Parameters<DatabaseManager["connect"]>[1],
          );
          const adapter = manager.getConnection("default");
          const migrationManager = new MigrationManager({
            migrationsDir,
            adapter,
          });
          info("正在执行数据库迁移（使用 @dreamer/database）...");
          await migrationManager.up();
          await manager.close();
          success("数据库迁移完成");
          return;
        }
      } catch {
        // 配置加载失败或数据库连接失败，回退到 task
      }

      const taskNames = ["db:migrate:up", "db:migrate"];
      const taskName = taskNames.find((t) => projectInfo?.tasks[t]);

      if (taskName) {
        info(`正在执行数据库迁移 (${taskName})...`);
        const cmd = createCommand(runtime, {
          args: getTaskArgs(taskName),
          cwd: projectRoot,
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
        });
        const child = cmd.spawn();
        const status = await child.status;
        if (status.success) {
          success("数据库迁移完成");
        } else {
          error(`迁移执行失败，退出码: ${status.code ?? "未知"}`);
        }
      } else {
        info("未找到 db:migrate:up 或 db:migrate task");
        info("请配置 config.database.default，或在 deno.json 中添加:");
        info('  "db:migrate:up": "deno run -A scripts/migrate-up.ts"');
        info("参考: https://jsr.io/@dreamer/database");
      }
    } else if (action === "down") {
      const projectRoot = cwd();
      const count = Math.max(1, Number(options.count ?? 1) || 1);

      // 优先尝试使用 @dreamer/database MigrationManager（需项目配置了 database）
      try {
        const config = await loadProjectConfig(projectRoot);
        const dbConfig = config.database as
          | { default?: { type: string } }
          | undefined;
        const migrationsDir = join(projectRoot, "migrations");
        try {
          await stat(migrationsDir);
        } catch {
          error(`迁移目录不存在: ${migrationsDir}`);
          return;
        }
        if (dbConfig?.default) {
          const manager = new DatabaseManager();
          await manager.connect(
            "default",
            dbConfig.default as Parameters<DatabaseManager["connect"]>[1],
          );
          const adapter = manager.getConnection("default");
          const migrationManager = new MigrationManager({
            migrationsDir,
            adapter,
          });
          info(`正在回滚最近 ${count} 个迁移（使用 @dreamer/database）...`);
          await migrationManager.down(count);
          await manager.close();
          success("迁移回滚完成");
          return;
        }
      } catch {
        // 配置加载失败或数据库连接失败，回退到 task
      }

      // 回退到 task 方式（需 --name 指定迁移名）
      if (!name) {
        error(
          "回滚迁移需要指定迁移名称（--name），或配置 config.database.default 以使用 MigrationManager",
        );
        return;
      }
      const projectInfo = await getProjectInfo(projectRoot);
      const taskNames = ["db:migrate:down", "db:migrate"];
      const taskName = taskNames.find((t) => projectInfo?.tasks[t]);

      if (taskName) {
        info(`正在回滚迁移: ${name} (${taskName})...`);
        const cmd = createCommand(runtime, {
          args: [...getTaskArgs(taskName), name],
          cwd: projectRoot,
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
        });
        const child = cmd.spawn();
        const status = await child.status;
        if (status.success) {
          success("迁移回滚完成");
        } else {
          error(`回滚失败，退出码: ${status.code ?? "未知"}`);
        }
      } else {
        info("未找到 db:migrate:down 或 db:migrate task");
        info("请配置 config.database.default，或在 deno.json 中添加迁移脚本");
        info("参考: https://jsr.io/@dreamer/database");
      }
    } else {
      error(`不支持的操作: ${action}`);
      error("支持的操作: create, up, down");
    }
  } catch (err) {
    error(
      `迁移操作失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * seed 子命令：执行数据库种子脚本
 */
export async function seed(
  _args: string[],
  _options: ParsedOptions,
): Promise<void> {
  const runtime = getRuntime();
  const projectRoot = cwd();
  const projectInfo = await getProjectInfo(projectRoot);

  if (!projectInfo) {
    error("未找到 deno.json，请在 dweb 项目根目录执行");
    return;
  }

  const taskName = "db:seed";
  if (projectInfo.tasks[taskName]) {
    info("正在执行数据库种子...");
    const cmd = createCommand(runtime, {
      args: getTaskArgs(taskName),
      cwd: projectRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    const status = await child.status;
    if (status.success) {
      success("数据库种子执行完成");
    } else {
      error(`seed 命令退出码: ${status.code ?? "未知"}`);
    }
    return;
  }

  const seedFile = join(projectRoot, "seeds", "seed.ts");
  try {
    await stat(seedFile);
  } catch {
    error("未找到 seed 配置");
    error("请在 deno.json 中添加 db:seed task，或创建 seeds/seed.ts 文件");
    return;
  }

  info("正在执行 seeds/seed.ts...");
  const cmd = createCommand(runtime, {
    args: getRunArgs(seedFile),
    cwd: projectRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const child = cmd.spawn();
  const status = await child.status;
  if (status.success) {
    success("数据库种子执行完成");
  } else {
    error(`seed 命令退出码: ${status.code ?? "未知"}`);
  }
}

/**
 * status 子命令：查看迁移状态
 *
 * 若配置了 config.database.default，使用 MigrationManager.status() 显示已执行状态；
 * 否则仅列出迁移文件。
 */
export async function status(
  _args: string[],
  _options: ParsedOptions,
): Promise<void> {
  const projectRoot = cwd();
  const migrationsDir = join(projectRoot, "migrations");

  try {
    await stat(migrationsDir);
  } catch {
    error("migrations 目录不存在");
    info("请先创建迁移：dweb db migrate -a create -n <name>");
    return;
  }

  // 尝试使用 MigrationManager 获取已执行状态
  try {
    const config = await loadProjectConfig(projectRoot);
    const dbConfig = config.database as
      | { default?: { type: string } }
      | undefined;
    if (dbConfig?.default) {
      const manager = new DatabaseManager();
      await manager.connect(
        "default",
        dbConfig.default as Parameters<DatabaseManager["connect"]>[1],
      );
      const adapter = manager.getConnection("default");
      const migrationManager = new MigrationManager({
        migrationsDir,
        adapter,
      });
      const statuses = await migrationManager.status();
      await manager.close();

      if (statuses.length === 0) {
        info("暂无迁移文件");
        info("创建迁移：dweb db migrate -a create -n <name>");
        return;
      }

      success(`迁移状态（共 ${statuses.length} 个）:`);
      for (const s of statuses) {
        const execInfo = s.executed && s.executedAt
          ? `✓ 已执行 ${
            s.executedAt.toISOString().slice(0, 19).replace("T", " ")
          }`
          : "○ 待执行";
        console.log(`  • ${s.name}  ${execInfo}  [${s.file}]`);
      }
      info("");
      info("执行迁移: dweb db migrate -a up");
      info(
        "回滚迁移: dweb db migrate -a down -c <数量>（或 -n <名称> 配合 task）",
      );
      return;
    }
  } catch {
    // 配置加载失败或数据库连接失败，回退到仅列出文件
  }

  const entries = await readdir(migrationsDir);
  const files = entries
    .filter((e) => e.isFile && e.name.endsWith(".ts"))
    .map((e) => e.name)
    .sort();

  if (files.length === 0) {
    info("暂无迁移文件");
    info("创建迁移：dweb db migrate -a create -n <name>");
    return;
  }

  success(`迁移文件（共 ${files.length} 个）:`);
  for (const f of files) {
    const match = f.match(/^(\d+)_(.+)\.ts$/);
    const ts = match ? match[1] : "";
    const migrationName = match ? match[2] : f.replace(/\.ts$/, "");
    const date = ts
      ? new Date(parseInt(ts, 10)).toISOString().slice(0, 19).replace("T", " ")
      : "";
    console.log(`  • ${migrationName}  ${date ? `(${date})` : ""}  [${f}]`);
  }

  info("");
  info("执行迁移: dweb db migrate -a up");
  info(
    "回滚迁移: dweb db migrate -a down -c <数量>（配置 database 后）或 -n <名称>（配合 task）",
  );
  info("已执行状态: 配置 config.database.default 后可显示");
}
