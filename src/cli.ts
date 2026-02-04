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
  colorize,
  Command,
  error,
  type ParsedOptions,
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

  // 生成命令：委托给 cmd/generate.ts，别名为 g
  const generateCmd = cli.command("generate", "生成代码");
  generateCmd.alias("g");
  generateCmd
    .option({
      name: "type",
      alias: "t",
      description: "生成类型（route 页面、api 接口、model 模型、service 服务）",
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

  // 开发服务器：委托给 cmd/dev.ts
  const devCmd = cli.command("dev", "启动开发服务器（单应用直接启动，多应用需指定应用名）");
  devCmd
    .option({
      name: "app",
      alias: "a",
      description: "应用名（多应用时必填）",
      type: "string",
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: devMain } = await import("./cmd/dev.ts");
        await devMain(args, options);
      } catch (err) {
        error(
          `dev 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

  // 构建：委托给 cmd/build.ts
  const buildCmd = cli.command("build", "构建生产版本（多应用可指定应用名或构建全部）");
  buildCmd
    .option({
      name: "app",
      alias: "a",
      description: "应用名（多应用时可选，不填则构建全部）",
      type: "string",
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: buildMain } = await import("./cmd/build.ts");
        await buildMain(args, options);
      } catch (err) {
        error(
          `build 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

  // 生产启动：委托给 cmd/start.ts
  const startCmd = cli.command("start", "启动生产服务器（多应用需指定应用名）");
  startCmd
    .option({
      name: "app",
      alias: "a",
      description: "应用名（多应用时必填）",
      type: "string",
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: startMain } = await import("./cmd/start.ts");
        await startMain(args, options);
      } catch (err) {
        error(
          `start 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

  // 数据库迁移命令：委托给 cmd/migrate.ts，别名为 m
  const migrateCmd = cli.command("migrate", "数据库迁移");
  migrateCmd.alias("m");
  migrateCmd
    .option({
      name: "action",
      alias: "a",
      description: "操作（up, down, create）",
      type: "string",
      defaultValue: "up",
      requiresValue: true,
    })
    .option({
      name: "name",
      alias: "n",
      description: "迁移名称（用于 create）",
      type: "string",
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: migrateMain } = await import("./cmd/migrate.ts");
        await migrateMain(args, options);
      } catch (err) {
        error(
          `迁移失败: ${err instanceof Error ? err.message : String(err)}`,
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
