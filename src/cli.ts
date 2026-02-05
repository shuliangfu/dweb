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

/**
 * 构建 CLI 版本展示字符串
 */
function buildVersionStr(version: string): string {
  return `\n${colorize("dweb-cli", "cyan", true)}
${colorize($t("cli.versionLabel"), "cyan", true)} ${colorize(version, "yellow")}

${colorize($t("cli.versionTitle"), "gray")}
${colorize($t("cli.versionDesc"), "gray")} \n`;
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
  const cli = new Command("dweb-cli", $t("cliDesc.toolName"))
    .setVersion(buildVersionStr(version))
    .option({
      name: "verbose",
      alias: "v",
      description: $t("cliDesc.verbose"),
      type: "boolean",
    });

  // ================================================================================
  // init 初始化项目
  // ================================================================================
  cli
    .command("init", $t("cliDesc.init"))
    .option({
      name: "beta",
      description: $t("cliDesc.betaOption"),
      type: "boolean",
      defaultValue: false,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: initMain } = await import("./cmd/init.ts");
        await initMain(args, { beta: options?.beta === true });
      } catch (err) {
        error(
          $t("cli.initFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

  // ================================================================================
  // dev 开发服务器
  // ================================================================================
  const devCmd = cli.command("dev", $t("cliDesc.dev"));
  devCmd
    .option({
      name: "app",
      alias: "a",
      description: $t("cliDesc.appRequired"),
      type: "string",
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: devMain } = await import("./cmd/dev.ts");
        await devMain(args, options);
      } catch (err) {
        error(
          $t("cli.devFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

  // ================================================================================
  // build 构建
  // ================================================================================
  const buildCmd = cli.command("build", $t("cliDesc.build"));
  buildCmd
    .option({
      name: "app",
      alias: "a",
      description: $t("cliDesc.appOptionalBuild"),
      type: "string",
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: buildMain } = await import("./cmd/build.ts");
        await buildMain(args, options);
      } catch (err) {
        error(
          $t("cli.buildFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

  // ================================================================================
  // start 生产启动
  // ================================================================================
  const startCmd = cli.command("start", $t("cliDesc.start"));
  startCmd
    .option({
      name: "app",
      alias: "a",
      description: $t("cliDesc.appRequired"),
      type: "string",
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: startMain } = await import("./cmd/start.ts");
        await startMain(args, options);
      } catch (err) {
        error(
          $t("cli.startFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

  // ================================================================================
  // preview 预览构建结果
  // ================================================================================
  const previewCmd = cli.command("preview", $t("cliDesc.preview"));
  previewCmd.keepAlive();
  previewCmd
    .option({
      name: "port",
      alias: "p",
      description: $t("cliDesc.portOption"),
      type: "number",
      requiresValue: true,
    })
    .option({
      name: "app",
      alias: "a",
      description: $t("cliDesc.appOptional"),
      type: "string",
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: previewMain } = await import("./cmd/preview.ts");
        await previewMain(args, options);
      } catch (err) {
        error(
          $t("cli.previewFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

  // ================================================================================
  // generate 代码生成（别名 g）
  // ================================================================================
  const generateCmd = cli.command("generate", $t("cliDesc.generate"));
  generateCmd.alias("g");
  generateCmd
    .option({
      name: "type",
      alias: "t",
      description: $t("cliDesc.generateTypeOption"),
      type: "string",
      required: true,
      requiresValue: true,
    })
    .option({
      name: "name",
      alias: "n",
      description: $t("cliDesc.nameOption"),
      type: "string",
      required: true,
      requiresValue: true,
    })
    .option({
      name: "app",
      alias: "a",
      description: $t("cliDesc.appOptionalGenerate"),
      type: "string",
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: generateMain } = await import("./cmd/generate.ts");
        await generateMain(args, options);
      } catch (err) {
        error(
          $t("cli.generateFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

  // ================================================================================
  // test 运行测试
  // ================================================================================
  const testCmd = cli.command("test", $t("cliDesc.test"));
  testCmd
    .option({
      name: "app",
      alias: "a",
      description: $t("cliDesc.appOptionalTest"),
      type: "string",
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: testMain } = await import("./cmd/test.ts");
        await testMain(args, options);
      } catch (err) {
        error(
          $t("cli.testFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

  // ================================================================================
  // lint 代码检查
  // ================================================================================
  cli
    .command("lint", $t("cliDesc.lint"))
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: lintMain } = await import("./cmd/lint.ts");
        await lintMain(args, options);
      } catch (err) {
        error(
          $t("cli.lintFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

  // ================================================================================
  // fmt 代码格式化
  // ================================================================================
  cli
    .command("fmt", $t("cliDesc.fmt"))
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: fmtMain } = await import("./cmd/fmt.ts");
        await fmtMain(args, options);
      } catch (err) {
        error(
          $t("cli.fmtFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

  // ================================================================================
  // clean 清理构建产物
  // ================================================================================
  cli
    .command("clean", $t("cliDesc.clean"))
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: cleanMain } = await import("./cmd/clean.ts");
        await cleanMain(args, options);
      } catch (err) {
        error(
          $t("cli.cleanFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

  // ================================================================================
  // db 数据库相关（含 migrate 子命令）
  // ================================================================================
  const dbCmd = cli.command("db", $t("cliDesc.db"));
  const migrateCmd = dbCmd.command("migrate", $t("cliDesc.dbMigrate"));
  migrateCmd.alias("m");
  migrateCmd
    .option({
      name: "action",
      alias: "a",
      description: $t("cliDesc.migrateActionOption"),
      type: "string",
      defaultValue: "up",
      requiresValue: true,
    })
    .option({
      name: "name",
      alias: "n",
      description: $t("cliDesc.migrateNameOption"),
      type: "string",
      requiresValue: true,
    })
    .option({
      name: "db-type",
      description: $t("cliDesc.dbTypeOption"),
      type: "string",
      requiresValue: true,
    })
    .option({
      name: "count",
      alias: "c",
      description: $t("cliDesc.dbCountOption"),
      type: "string",
      requiresValue: true,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { migrate } = await import("./cmd/db.ts");
        await migrate(args, options);
      } catch (err) {
        error(
          $t("cli.dbMigrateFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

  dbCmd
    .command("seed", $t("cliDesc.dbSeed"))
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { seed } = await import("./cmd/db.ts");
        await seed(args, options);
      } catch (err) {
        error(
          $t("cli.dbSeedFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

  dbCmd
    .command("status", $t("cliDesc.dbStatus"))
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { status } = await import("./cmd/db.ts");
        await status(args, options);
      } catch (err) {
        error(
          $t("cli.dbStatusFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

  // ================================================================================
  // upgrade 升级 dweb
  // ================================================================================
  cli
    .command("upgrade", $t("cliDesc.upgrade"))
    .option({
      name: "beta",
      description: $t("cliDesc.upgradeBetaOption"),
      type: "boolean",
      defaultValue: false,
    })
    .action(async (args: string[], options: ParsedOptions) => {
      try {
        const { main: upgradeMain } = await import("./cmd/upgrade.ts");
        await upgradeMain(args, options);
      } catch (err) {
        error(
          $t("cli.upgradeFailedWithMessage", {
            message: err instanceof Error ? err.message : String(err),
          }),
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
