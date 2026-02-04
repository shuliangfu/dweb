#!/usr/bin/env -S deno run -A

/**
 * CLI 命令行工具
 *
 * 职责：
 * - 提供命令行接口
 * - 处理命令行参数
 * - 执行命令行任务
 *
 * 功能：
 * - 项目初始化
 * - 代码生成
 * - 数据库迁移
 * - 其他 CLI 命令
 */

import {
  cwd,
  join,
  mkdir,
  stat,
  writeTextFile,
} from "./core/runtime-adapter.ts";

import {
  colorize,
  Command,
  error,
  info,
  type ParsedOptions,
  success,
} from "./feature/command.ts";
import { getDwebVersion } from "./utils/version.ts";

// import { generateFromTemplate } from "./template/generator.ts";

/**
 * 构建 CLI 版本展示字符串
 */
function buildVersionStr(version: string): string {
  return `\n${colorize("dweb-cli", "cyan", true)}
${colorize("Version:", "cyan", true)} ${colorize(version, "yellow")}

${colorize("@dreamer/dweb 全栈 Web 框架命令行工具", "gray")}
${colorize("用于初始化项目、生成代码、数据库迁移等", "gray")} \n`;
}

/**
 * 创建 CLI 应用
 *
 * @param version 版本号（由 getDwebVersion() 获取，不传则使用占位，执行前需设置）
 * @returns CLI 命令实例
 */
export function createCLI(version: string): Command {
  const cli = new Command("dweb", "Dreamer Web Framework CLI 工具")
    .setVersion(buildVersionStr(version))
    .option({
      name: "verbose",
      alias: "v",
      description: "显示详细信息",
      type: "boolean",
    });

  // 初始化命令：委托给 cmd/init.ts 的 main，子命令参数（如项目名称）透传
  cli
    .command("init", "初始化新项目（交互式选择引擎、样式等）")
    .action(async (args: string[]) => {
      try {
        const { main: initMain } = await import("./cmd/init.ts");
        await initMain(args);
      } catch (err) {
        error(
          `初始化项目失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

  // 生成命令：委托给 cmd/generate.ts
  cli
    .command("generate", "生成代码")
    .option({
      name: "type",
      alias: "t",
      description: "生成类型（controller, service, model 等）",
      type: "string",
      required: true,
      requiresValue: true,
    })
    .option({
      name: "name",
      alias: "n",
      description: "名称",
      type: "string",
      required: true,
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: generateMain } = await import("./cmd/generate.ts");
        await generateMain(args, options);
      } catch (err) {
        error(
          `生成失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

  // 数据库迁移命令
  cli
    .command("migrate", "数据库迁移")
    .option({
      name: "action",
      alias: "a",
      description: "操作（up, down, create）",
      type: "string",
      defaultValue: "up",
    })
    .option({
      name: "name",
      alias: "n",
      description: "迁移名称（用于 create）",
      type: "string",
    })
    .action(async (_args: string[], options: ParsedOptions) => {
      const action = options.action as string;
      const name = options.name as string;

      try {
        if (action === "create") {
          if (!name) {
            error("创建迁移需要指定名称（--name）");
            return;
          }

          info(`正在创建迁移: ${name}`);

          const currentDir = cwd();
          const migrationsDir = join(currentDir, "migrations");

          // 确保 migrations 目录存在
          await mkdir(migrationsDir, { recursive: true });

          // 生成迁移文件名（时间戳 + 名称）
          const timestamp = Date.now();
          const migrationName = `${timestamp}_${name}`;
          const migrationFile = join(migrationsDir, `${migrationName}.ts`);

          // 检查文件是否已存在
          try {
            await stat(migrationFile);
            error(`迁移文件已存在: ${migrationFile}`);
            return;
          } catch {
            // 文件不存在，可以创建
          }

          // 生成迁移文件内容
          const content = `/**
 * 数据库迁移: ${name}
 * 创建时间: ${new Date().toISOString()}
 */

/**
 * 执行迁移（up）
 */
export async function up() {
  // TODO: 实现迁移逻辑
  // 示例：
  // const db = getDatabaseAdapter();
  // await db.query(\`CREATE TABLE IF NOT EXISTS ...\`);
}

/**
 * 回滚迁移（down）
 */
export async function down() {
  // TODO: 实现回滚逻辑
  // 示例：
  // const db = getDatabaseAdapter();
  // await db.query(\`DROP TABLE IF EXISTS ...\`);
}
`;

          await writeTextFile(migrationFile, content);

          success(`迁移 ${name} 创建完成！`);
          info(`迁移文件: ${migrationFile}`);
        } else if (action === "up") {
          info("正在执行数据库迁移...");

          const currentDir = cwd();
          const migrationsDir = join(currentDir, "migrations");

          // 检查 migrations 目录是否存在
          try {
            await stat(migrationsDir);
          } catch {
            error(`迁移目录不存在: ${migrationsDir}`);
            error(
              "请先创建迁移文件（使用 migrate --action create --name <name>）",
            );
            return;
          }

          // TODO: 实现迁移执行逻辑
          // 需要：
          // 1. 读取 migrations 目录中的所有迁移文件
          // 2. 检查哪些迁移已执行（需要迁移历史表）
          // 3. 按顺序执行未执行的迁移
          // 4. 记录迁移历史

          info("提示: 迁移执行功能需要数据库连接，请确保已配置数据库");
          info("提示: 迁移历史需要存储在数据库中（migrations 表）");
          success("数据库迁移完成！（功能待完善）");
        } else if (action === "down") {
          info("正在回滚数据库迁移...");

          if (!name) {
            error("回滚迁移需要指定迁移名称（--name）");
            return;
          }

          // TODO: 实现迁移回滚逻辑
          // 需要：
          // 1. 从迁移历史中找到指定的迁移
          // 2. 执行该迁移的 down() 方法
          // 3. 从迁移历史中移除记录

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
    });

  return cli;
}

/**
 * 执行 CLI 命令
 * 如果直接运行此文件，则执行 CLI（兼容 Deno 和 Bun）
 */
if (import.meta.main) {
  const version = await getDwebVersion();
  const cli = createCLI(version);
  await cli.execute();
}
