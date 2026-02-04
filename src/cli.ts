#!/usr/bin/env -S deno run -A

/**
 * dweb-cli 命令行工具入口
 *
 * 提供项目初始化、代码生成、数据库迁移、开发/构建/启动等 CLI 命令。
 * 通过 `deno run -A jsr:@dreamer/dweb/setup` 安装为全局命令 `dweb-cli` 后使用。
 *
 * @module
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
 * 创建 dweb-cli 命令实例
 *
 * 注册 init、dev、build、start、generate、db 等子命令，供 CLI 入口调用。
 *
 * @param version 框架版本号（由 getDwebVersion() 获取）
 * @returns 配置完成的 Command 实例
 */
export function createCLI(version: string): Command {
  const cli = new Command("dweb-cli", "DWEB CLI 工具")
    .setVersion(buildVersionStr(version))
    .option({
      name: "verbose",
      alias: "v",
      description: "显示详细信息",
      type: "boolean",
    });

  // ================================================================================
  // init 初始化项目
  // ================================================================================
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

  // ================================================================================
  // dev 开发服务器
  // ================================================================================
  const devCmd = cli.command(
    "dev",
    "启动开发服务器（单应用直接启动，多应用需指定应用名）",
  );
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

  // ================================================================================
  // build 构建
  // ================================================================================
  const buildCmd = cli.command(
    "build",
    "构建生产版本（多应用可指定应用名或构建全部）",
  );
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

  // ================================================================================
  // start 生产启动
  // ================================================================================
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

  // ================================================================================
  // preview 预览构建结果
  // ================================================================================
  const previewCmd = cli.command("preview", "本地预览构建结果（需先 build）");
  previewCmd.keepAlive();
  previewCmd
    .option({
      name: "port",
      alias: "p",
      description: "端口号（默认 4173）",
      type: "number",
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: previewMain } = await import("./cmd/preview.ts");
        await previewMain(args, options);
      } catch (err) {
        error(
          `preview 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

  // ================================================================================
  // generate 代码生成（别名 g）
  // ================================================================================
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

  // ================================================================================
  // test 运行测试
  // ================================================================================
  const testCmd = cli.command("test", "运行测试");
  testCmd
    .option({
      name: "app",
      alias: "a",
      description: "应用名（多应用时可选）",
      type: "string",
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: testMain } = await import("./cmd/test.ts");
        await testMain(args, options);
      } catch (err) {
        error(
          `test 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

  // ================================================================================
  // lint 代码检查
  // ================================================================================
  cli
    .command("lint", "运行代码检查")
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: lintMain } = await import("./cmd/lint.ts");
        await lintMain(args, options);
      } catch (err) {
        error(
          `lint 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

  // ================================================================================
  // fmt 代码格式化
  // ================================================================================
  cli
    .command("fmt", "运行代码格式化")
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: fmtMain } = await import("./cmd/fmt.ts");
        await fmtMain(args, options);
      } catch (err) {
        error(
          `fmt 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

  // ================================================================================
  // clean 清理构建产物
  // ================================================================================
  cli
    .command("clean", "清理构建产物（dist、.cache 等）")
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: cleanMain } = await import("./cmd/clean.ts");
        await cleanMain(args, options);
      } catch (err) {
        error(
          `clean 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

  // ================================================================================
  // db 数据库相关（含 migrate 子命令）
  // ================================================================================
  const dbCmd = cli.command("db", "数据库相关");
  const migrateCmd = dbCmd.command("migrate", "数据库迁移");
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
        const { migrate } = await import("./cmd/db.ts");
        await migrate(args, options);
      } catch (err) {
        error(
          `迁移失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

  dbCmd
    .command("seed", "执行数据库种子（填充测试数据）")
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { seed } = await import("./cmd/db.ts");
        await seed(args, options);
      } catch (err) {
        error(
          `seed 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

  dbCmd
    .command("status", "查看迁移状态")
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { status } = await import("./cmd/db.ts");
        await status(args, options);
      } catch (err) {
        error(
          `status 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

  // ================================================================================
  // upgrade 升级 dweb
  // ================================================================================
  cli
    .command("upgrade", "检查并升级 dweb 到最新版本")
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: upgradeMain } = await import("./cmd/upgrade.ts");
        await upgradeMain(args, options);
      } catch (err) {
        error(
          `upgrade 失败: ${err instanceof Error ? err.message : String(err)}`,
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
