/**
 * dweb db 命令
 *
 * 职责：
 * - 数据库相关子命令：migrate、seed、status
 * - 使用 runtime-adapter 保证 Deno/Bun 兼容
 *
 * 运行方式：
 * - dweb db migrate -a create -n add_users
 * - dweb db migrate -a up
 * - dweb db seed
 * - dweb db status
 */

import { error, info, success } from "@dreamer/console";
import {
  createCommand,
  cwd,
  join,
  mkdir,
  readdir,
  stat,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";
import { getProjectInfo } from "../utils/project.ts";

/**
 * migrate 子命令：创建迁移、执行迁移、回滚迁移
 */
export async function migrate(
  _args: string[],
  options: ParsedOptions,
): Promise<void> {
  const rawAction = options.action;
  const action = rawAction === true
    ? "up"
    : (String(rawAction ?? "up") as string);
  const name = options.name as string | undefined;

  try {
    if (action === "create") {
      if (!name) {
        error("创建迁移需要指定名称（--name）");
        return;
      }
      info(`正在创建迁移: ${name}`);

      const currentDir = cwd();
      const migrationsDir = join(currentDir, "migrations");
      await mkdir(migrationsDir, { recursive: true });

      const timestamp = Date.now();
      const migrationName = `${timestamp}_${name}`;
      const migrationFile = join(migrationsDir, `${migrationName}.ts`);

      try {
        await stat(migrationFile);
        error(`迁移文件已存在: ${migrationFile}`);
        return;
      } catch {
        // 文件不存在，可以创建
      }

      const content = `/**
 * 数据库迁移: ${name}
 * 创建时间: ${new Date().toISOString()}
 */

/**
 * 执行迁移（up）
 */
export async function up() {
  // TODO: 实现迁移逻辑
}

/**
 * 回滚迁移（down）
 */
export async function down() {
  // TODO: 实现回滚逻辑
}
`;

      await writeTextFile(migrationFile, content);
      success(`迁移 ${name} 创建完成！`);
      info(`迁移文件: ${migrationFile}`);
    } else if (action === "up") {
      info("正在执行数据库迁移...");
      const currentDir = cwd();
      const migrationsDir = join(currentDir, "migrations");
      try {
        await stat(migrationsDir);
      } catch {
        error(`迁移目录不存在: ${migrationsDir}`);
        error("请先创建迁移文件（使用 dweb db migrate -a create -n <name>）");
        return;
      }
      info("提示: 迁移执行功能需要数据库连接，请确保已配置数据库");
      success("数据库迁移完成！（功能待完善）");
    } else if (action === "down") {
      info("正在回滚数据库迁移...");
      if (!name) {
        error("回滚迁移需要指定迁移名称（--name）");
        return;
      }
      info("提示: 迁移回滚功能需要数据库连接，请确保已配置数据库");
      success("数据库迁移回滚完成！（功能待完善）");
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
  const projectRoot = cwd();
  const projectInfo = await getProjectInfo(projectRoot);

  if (!projectInfo) {
    error("未找到 deno.json，请在 dweb 项目根目录执行");
    return;
  }

  const taskName = "db:seed";
  if (projectInfo.tasks[taskName]) {
    info("正在执行数据库种子...");
    const cmd = createCommand("deno", {
      args: ["task", taskName],
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
  const cmd = createCommand("deno", {
    args: ["run", "-A", seedFile],
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

  info(`迁移文件（共 ${files.length} 个）:`);
  for (const f of files) {
    const match = f.match(/^(\d+)_(.+)\.ts$/);
    const ts = match ? match[1] : "";
    const date = ts
      ? new Date(parseInt(ts, 10)).toISOString().slice(0, 19).replace("T", " ")
      : "";
    console.log(`  ${f}  ${date ? `(${date})` : ""}`);
  }

  info("提示: 已执行状态需数据库连接，功能待完善");
}
