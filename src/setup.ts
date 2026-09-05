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
  createCommand,
  exit,
  join,
  makeTempFile,
  readTextFile,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { failSpinner, startSpinner, succeedSpinner } from "@dreamer/console";
import { DwebErrorCode, throwDwebError } from "./utils/errors.ts";
import { $tr } from "./utils/i18n.ts";
import { isMainModule } from "./utils/main-module.ts";
import { getRuntime } from "./utils/runtime.ts";
import {
  getPackageRoot,
  loadDwebDenoJson,
  writeVersionCache,
} from "./utils/version.ts";

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
 * 获取本地调试用的 CLI 入口：项目内 `src/cli.ts` 的绝对路径
 */
function getLocalCliEntry(): string {
  const root = getPackageRoot();
  return join(root, "src", "cli.ts");
}

/**
 * 解析从 JSR 安装全局 `dweb-cli` 时使用的 **带版本** 的 CLI 说明符
 *
 * 未带版本时写 `jsr:@dreamer/dweb/cli` 在部分 Deno/缓存 场景下会固定到**旧次解析**，
 * 与当前本次实际执行的 setup 包版本无关，导致 `dweb-cli -v` / 缓存 显示新版而
 * `init` 仍跑旧模板（如 `postcss@8.4.39`、tasks 无 `--dev`）。此处用包根
 * `deno.json` 的 `version` 与**当前进程**为同一 dweb 包，保证与 `deno run` 的 setup
 * 次一致。
 *
 * @returns 如 `jsr:@dreamer/dweb@3.4.7/cli`；读版本失败时回退无版本说明符
 */
async function getRemoteJsrCliEntry(): Promise<string> {
  const config = await loadDwebDenoJson();
  const v = config?.version?.trim();
  if (v) {
    return `jsr:@dreamer/dweb@${v}/cli`;
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
 * - JSR 远程安装：不使用 --config，安装与当前包版本一致的 `jsr:@dreamer/dweb@x.y.z/cli`
 * - 本地调试安装：使用 --config 临时 config（去除 workspace），避免解析 examples 等不存在的路径
 */
async function installGlobalCli(): Promise<void> {
  const runtime = getRuntime();
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
      args.push(getLocalCliEntry());
      const cmd = createCommand(runtime, {
        args,
        stdout: "null",
        stderr: "null",
        stdin: "null", // 避免 deno install 继承终端 stdin 导致卡住
      });

      console.log("");

      startSpinner($tr("cli.installing", { name: CLI_NAME }));
      const child = cmd.spawn();
      child.unref(); // 立即 unref，避免子进程句柄阻止当前进程自动退出
      const status = await child.status;
      if (status.success) {
        const version = await writeVersionCacheOnInstall();
        succeedSpinner(
          version
            ? $tr("cli.installSuccessWithVersion", {
              name: CLI_NAME,
              version,
            })
            : $tr("cli.installSuccess", { name: CLI_NAME }),
        );
        printUsage();
      } else {
        failSpinner(
          $tr("cli.installFailedExit", { code: String(status.code ?? "") }),
        );
        exit(status.code ?? 1);
      }
    } finally {
      await remove(tempConfigPath).catch(() => {});
    }
  } else {
    const remoteEntry = await getRemoteJsrCliEntry();
    args.push(remoteEntry);
    const cmd = createCommand(runtime, {
      args,
      stdout: "null",
      stderr: "null",
      stdin: "null", // 避免 deno install 继承终端 stdin 导致卡住
    });
    console.log("");
    startSpinner($tr("cli.installing", { name: CLI_NAME }));
    const child = cmd.spawn();
    child.unref(); // 立即 unref，避免子进程句柄阻止当前进程自动退出
    const status = await child.status;
    if (status.success) {
      const version = await writeVersionCacheOnInstall();
      succeedSpinner(
        version
          ? $tr("cli.installSuccessWithVersion", {
            name: CLI_NAME,
            version,
          })
          : $tr("cli.installSuccess", { name: CLI_NAME }),
      );
      printUsage();
    } else {
      failSpinner(
        $tr("cli.installFailedExit", { code: String(status.code ?? "") }),
      );
      exit(status.code ?? 1);
    }
  }
}

/**
 * 安装成功后写入版本缓存，供 dweb-cli -v 等快速读取
 * @returns 已安装的版本号（若可获取），否则 undefined
 */
async function writeVersionCacheOnInstall(): Promise<string | undefined> {
  try {
    const config = await loadDwebDenoJson();
    if (config?.version) {
      await writeVersionCache(config.version);
      return config.version;
    }
  } catch {
    // 忽略，不影响安装成功
  }
  return undefined;
}

/** 打印 dweb-cli 使用说明 */
function printUsage(): void {
  console.log("");
  console.log($tr("cli.usage"));
  console.log(`  ${CLI_NAME} init [appName]   # ${$tr("cli.commands.init")}`);
  console.log(`  ${CLI_NAME} dev              # ${$tr("cli.commands.dev")}`);
  console.log(`  ${CLI_NAME} build            # ${$tr("cli.commands.build")}`);
  console.log(`  ${CLI_NAME} start            # ${$tr("cli.commands.start")}`);
  console.log(
    `  ${CLI_NAME} generate (g)     # ${$tr("cli.commands.generate")}`,
  );
  console.log(
    `  ${CLI_NAME} db migrate (m)   # ${$tr("cli.commands.dbMigrate")}`,
  );
  console.log(`  ${CLI_NAME} db seed          # ${$tr("cli.commands.dbSeed")}`);
  console.log(
    `  ${CLI_NAME} db status        # ${$tr("cli.commands.dbStatus")}`,
  );
  console.log(`  ${CLI_NAME} test             # ${$tr("cli.commands.test")}`);
  console.log(`  ${CLI_NAME} lint             # ${$tr("cli.commands.lint")}`);
  console.log(`  ${CLI_NAME} fmt              # ${$tr("cli.commands.fmt")}`);
  console.log(`  ${CLI_NAME} clean            # ${$tr("cli.commands.clean")}`);
  console.log(
    `  ${CLI_NAME} preview          # ${$tr("cli.commands.preview")}`,
  );
  console.log(
    `  ${CLI_NAME} upgrade          # ${$tr("cli.commands.upgrade")}`,
  );
  console.log(`  ${CLI_NAME} --help           # ${$tr("cli.commands.help")}`);
  console.log("");
}

// 主入口：此处直接执行安装（兼容 Deno、Bun 和 Node）
if (isMainModule(import.meta.url)) {
  installGlobalCli()
    .then(() => exit(0))
    .catch((err: unknown) => {
      console.error($tr("cli.installFailed"), err);
      exit(1);
    });
}
