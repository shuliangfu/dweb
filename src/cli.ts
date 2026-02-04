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
  dirname,
  join,
  mkdir,
  stat,
  writeTextFile,
} from "./core/runtime-adapter.ts";

import {
  Command,
  error,
  info,
  type ParsedOptions,
  success,
} from "./feature/command.ts";

// import { generateFromTemplate } from "./template/generator.ts";

/**
 * 创建 CLI 应用
 *
 * @returns CLI 命令实例
 */
export function createCLI(): Command {
  const cli = new Command("dweb", "Dreamer Web Framework CLI 工具")
    .setVersion("1.0.0")
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

  // 生成命令
  cli
    .command("generate", "生成代码")
    .option({
      name: "type",
      alias: "t",
      description: "生成类型（controller, service, model 等）",
      type: "string",
      required: true,
    })
    .option({
      name: "name",
      alias: "n",
      description: "名称",
      type: "string",
      required: true,
    })
    .action(async (_args: string[], options: ParsedOptions) => {
      const type = options.type as string;
      const name = options.name as string;

      info(`正在生成 ${type}: ${name}`);

      try {
        const currentDir = cwd();
        let targetPath: string;
        let content: string;

        // 根据类型生成不同的代码
        switch (type.toLowerCase()) {
          case "service":
          case "s": {
            targetPath = join(currentDir, "src", "services", `${name}.ts`);
            content = `/**
 * ${name} 服务
 */

export class ${name}Service {
  /**
   * 示例方法
   */
  async example(): Promise<string> {
    return "Hello from ${name}Service";
  }
}
`;
            break;
          }
          case "controller":
          case "c": {
            targetPath = join(currentDir, "src", "routes", "api", `${name}.ts`);
            content = `/**
 * ${name} 控制器
 */

import type { Request, Response } from "@dreamer/server";

/**
 * GET /api/${name}
 */
export async function GET(req: Request, res: Response) {
  return res.json({ message: "Hello from ${name} controller" });
}

/**
 * POST /api/${name}
 */
export async function POST(req: Request, res: Response) {
  const body = await req.json();
  return res.json({ message: "Created", data: body });
}
`;
            break;
          }
          case "model":
          case "m": {
            targetPath = join(currentDir, "src", "models", `${name}.ts`);
            content = `/**
 * ${name} 数据模型
 */

// TODO: 实现数据模型
export interface ${name} {
  id: string;
  // 添加其他字段
}

export class ${name}Model {
  // TODO: 实现模型方法
}
`;
            break;
          }
          case "route":
          case "r": {
            targetPath = join(currentDir, "src", "routes", `${name}.tsx`);
            content = `/**
 * ${name} 路由页面
 */

export default function ${name}Page() {
  return (
    <div>
      <h1>${name}</h1>
      <p>这是 ${name} 页面</p>
    </div>
  );
}
`;
            break;
          }
          default: {
            error(`不支持的生成类型: ${type}`);
            error(`支持的类型: service, controller, model, route`);
            return;
          }
        }

        // 确保目录存在
        await mkdir(dirname(targetPath), { recursive: true });

        // 检查文件是否已存在
        try {
          await stat(targetPath);
          error(`文件已存在: ${targetPath}`);
          return;
        } catch {
          // 文件不存在，可以创建
        }

        // 写入文件
        await writeTextFile(targetPath, content);

        success(`${type} ${name} 生成完成！`);
        info(`文件路径: ${targetPath}`);
      } catch (err) {
        error(
          `生成 ${type} 失败: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    });

  // 为生成命令添加别名
  cli.subcommandAlias("g", "generate");

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

          const cwd = Deno.cwd();
          const migrationsDir = join(cwd, "migrations");

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
  const cli = createCLI();
  await cli.execute();
}
