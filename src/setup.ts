#!/usr/bin/env -S deno run -A

/**
 * dweb-cli 全局命令安装脚本
 *
 * 执行 `deno install` 将 dweb CLI 安装为全局命令 `dweb-cli`，
 * 支持从 JSR 或本地运行。安装后可在任意目录执行 `dweb-cli init`、`dweb-cli dev` 等。
 *
 * @example
 * ```bash
 * deno run -A jsr:@dreamer/dweb/setup
 * ```
 *
 * @module
 */

import {
  failSpinner,
  startSpinner,
  succeedSpinner,
} from "./feature/command.ts";
import { $t } from "./utils/i18n.ts";
import {
  createCommand,
  exit,
  join,
  makeTempFile,
  readTextFile,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { DwebErrorCode, throwDwebError } from "./utils/errors.ts";
import {
  getPackageRoot,
  loadDwebDenoJson,
  writeVersionCache,
} from "./utils/version.ts";
import { getRuntime } from "./utils/runtime.ts";

/** CLI 全局命令名称 */
const CLI_NAME = "dweb-cli";

/**
 * 判断当前是否从本地文件运行（非 JSR/远程）
 */
function isLocalRun(): boolean {
  try {
    const url = import.meta.url;
    return url.startsWith("file:");
  } catch {
    return false;
  }
}

/**
 * 获取 CLI 入口路径或 JSR 说明符
 * - 本地：返回项目内 src/cli.ts 的绝对路径
 * - JSR：返回 jsr:@dreamer/dweb/cli
 */
function getCliEntry(): string {
  if (isLocalRun()) {
    const root = getPackageRoot();
    return join(root, "src", "cli.ts");
  }
  return "jsr:@dreamer/dweb/cli";
}

/**
 * 生成无 workspace 的临时 config，避免 JSR 发布包中 examples 缺失导致的解析错误
 * - 本地运行：从包根 deno.json 读取
 * - JSR 运行：通过 fetch 从包根 URL 获取 deno.json
 */
async function createTempCliConfig(): Promise<string> {
  let config: Record<string, unknown>;
  if (isLocalRun()) {
    const root = getPackageRoot();
    const denoJsonPath = join(root, "deno.json");
    try {
      const raw = await readTextFile(denoJsonPath);
      config = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throwDwebError(DwebErrorCode.FILE_READ_FAILED, { path: denoJsonPath });
    }
  } else {
    // JSR 运行：deno.json 在包根，setup.ts 在 src/，故 ../deno.json
    const denoJsonUrl = new URL("../deno.json", import.meta.url).href;
    try {
      const res = await fetch(denoJsonUrl);
      if (!res.ok) {
        throwDwebError(DwebErrorCode.HTTP_REQUEST_FAILED, {
          status: String(res.status),
        });
      }
      const raw = await res.text();
      config = JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
      throwDwebError(DwebErrorCode.FILE_READ_PARSE_FAILED, {
        path: denoJsonUrl,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  // 移除 workspace、tasks、publish、lint 等仅开发时需要的字段，保留 exports（CLI 解析 ./cli 需要）
  const { workspace: _w, tasks: _t, publish: _p, lint: _l, ...cliConfig } =
    config;
  const tempPath = await makeTempFile({ prefix: "dweb-cli-", suffix: ".json" });
  await writeTextFile(tempPath, JSON.stringify(cliConfig, null, 2));
  return tempPath;
}

/**
 * 执行 deno install 安装全局命令
 *
 * - JSR 远程安装：不使用 --config，直接安装 jsr:@dreamer/dweb/cli，由 JSR 包自身配置解析
 * - 本地调试安装：使用 --config 临时 config（去除 workspace），避免解析 examples 等不存在的路径
 */
async function installGlobalCli(): Promise<void> {
  const runtime = getRuntime();
  const cliEntry = getCliEntry();
  const args: string[] = [
    "install",
    "--global",
    "-f",
    "-q", // 静默模式，不输出 Deno 默认的 "Successfully installed" 等提示
    "-n",
    CLI_NAME,
    "-A",
  ];

  if (isLocalRun()) {
    // 仅本地调试时使用 --config，远程安装无需
    const tempConfigPath = await createTempCliConfig();
    args.push("--config", tempConfigPath);
    try {
      args.push(cliEntry);
      const cmd = createCommand(runtime, {
        args,
        stdout: "null",
        stderr: "null",
        stdin: "null", // 避免 deno install 继承终端 stdin 导致卡住
      });
      startSpinner($t("cli.installing", { name: CLI_NAME }));
      const child = cmd.spawn();
      child.unref(); // 立即 unref，避免子进程句柄阻止当前进程自动退出
      const status = await child.status;
      if (status.success) {
        succeedSpinner($t("cli.installSuccess", { name: CLI_NAME }));
        await writeVersionCacheOnInstall();
        printUsage();
      } else {
        failSpinner(
          $t("cli.installFailedExit", { code: String(status.code ?? "") }),
        );
        exit(status.code ?? 1);
      }
    } finally {
      await remove(tempConfigPath).catch(() => {});
    }
  } else {
    args.push(cliEntry);
    const cmd = createCommand(runtime, {
      args,
      stdout: "null",
      stderr: "null",
      stdin: "null", // 避免 deno install 继承终端 stdin 导致卡住
    });
    startSpinner($t("cli.installing", { name: CLI_NAME }));
    const child = cmd.spawn();
    child.unref(); // 立即 unref，避免子进程句柄阻止当前进程自动退出
    const status = await child.status;
    if (status.success) {
      succeedSpinner($t("cli.installSuccess", { name: CLI_NAME }));
      await writeVersionCacheOnInstall();
      printUsage();
    } else {
      failSpinner(
        $t("cli.installFailedExit", { code: String(status.code ?? "") }),
      );
      exit(status.code ?? 1);
    }
  }
}

/**
 * 安装成功后写入版本缓存，供 dweb-cli -v 等快速读取
 */
async function writeVersionCacheOnInstall(): Promise<void> {
  try {
    const config = await loadDwebDenoJson();
    if (config?.version) {
      await writeVersionCache(config.version);
    }
  } catch {
    // 忽略，不影响安装成功
  }
}

/** 打印 dweb-cli 使用说明 */
function printUsage(): void {
  console.log($t("cli.usage"));
  console.log(`  ${CLI_NAME} init [appName]   # ${$t("cli.commands.init")}`);
  console.log(`  ${CLI_NAME} dev              # ${$t("cli.commands.dev")}`);
  console.log(`  ${CLI_NAME} build            # ${$t("cli.commands.build")}`);
  console.log(`  ${CLI_NAME} start            # ${$t("cli.commands.start")}`);
  console.log(
    `  ${CLI_NAME} generate (g)     # ${$t("cli.commands.generate")}`,
  );
  console.log(
    `  ${CLI_NAME} db migrate (m)   # ${$t("cli.commands.dbMigrate")}`,
  );
  console.log(`  ${CLI_NAME} db seed          # ${$t("cli.commands.dbSeed")}`);
  console.log(
    `  ${CLI_NAME} db status        # ${$t("cli.commands.dbStatus")}`,
  );
  console.log(`  ${CLI_NAME} test             # ${$t("cli.commands.test")}`);
  console.log(`  ${CLI_NAME} lint             # ${$t("cli.commands.lint")}`);
  console.log(`  ${CLI_NAME} fmt              # ${$t("cli.commands.fmt")}`);
  console.log(`  ${CLI_NAME} clean            # ${$t("cli.commands.clean")}`);
  console.log(`  ${CLI_NAME} preview          # ${$t("cli.commands.preview")}`);
  console.log(`  ${CLI_NAME} upgrade          # ${$t("cli.commands.upgrade")}`);
  console.log(`  ${CLI_NAME} --help           # ${$t("cli.commands.help")}`);
  console.log("");
}

// 主入口：主流程结束后显式退出，否则 Deno 会因子进程等 ref 一直不退出
if (import.meta.main) {
  installGlobalCli()
    .then(() => exit(0))
    .catch((err) => {
      const msg = (globalThis as { $t?: (k: string) => string }).$t
        ? $t("cli.installFailed")
        : "安装失败";
      console.error(msg, err);
      exit(1);
    });
}
