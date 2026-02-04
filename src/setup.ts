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
} from "@dreamer/console";
import {
  createCommand,
  exit,
  join,
  makeTempFile,
  readTextFile,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { getPackageRoot } from "./utils/version.ts";
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
      throw new Error(`无法读取 ${denoJsonPath}`);
    }
  } else {
    // JSR 运行：deno.json 在包根，setup.ts 在 src/，故 ../deno.json
    const denoJsonUrl = new URL("../deno.json", import.meta.url).href;
    try {
      const res = await fetch(denoJsonUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.text();
      config = JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
      throw new Error(
        `无法读取 ${denoJsonUrl}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
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
 * - JSR 运行：不使用 --config，直接安装 jsr:@dreamer/dweb/cli，由 JSR 包自身配置解析
 * - 本地运行：使用临时 config（去除 workspace）避免解析 examples 等不存在的路径
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
    const tempConfigPath = await createTempCliConfig();
    args.push("--config", tempConfigPath);
    try {
      args.push(cliEntry);
      const cmd = createCommand(runtime, {
        args,
        stdout: "piped",
        stderr: "piped",
        stdin: "inherit",
      });
      startSpinner(`正在安装 ${CLI_NAME} ...`);
      const child = cmd.spawn();
      const status = await child.status;
      if (status.success) {
        succeedSpinner(`${CLI_NAME} 已安装成功`);
        printUsage();
      } else {
        failSpinner(`安装失败，退出码: ${status.code}`);
        exit(status.code ?? 1);
      }
    } finally {
      await remove(tempConfigPath).catch(() => {});
    }
  } else {
    args.push(cliEntry);
    const cmd = createCommand(runtime, {
      args,
      stdout: "piped",
      stderr: "piped",
      stdin: "inherit",
    });
    startSpinner(`正在安装 ${CLI_NAME} ...`);
    const child = cmd.spawn();
    const status = await child.status;
    if (status.success) {
      succeedSpinner(`${CLI_NAME} 已安装成功`);
      printUsage();
    } else {
      failSpinner(`安装失败，退出码: ${status.code}`);
      exit(status.code ?? 1);
    }
  }
}

/** 打印 dweb-cli 使用说明 */
function printUsage(): void {
  console.log("使用方式:");
  console.log(`  ${CLI_NAME} init [appName]   # 初始化新项目`);
  console.log(`  ${CLI_NAME} dev              # 启动开发服务器`);
  console.log(`  ${CLI_NAME} build            # 构建生产版本`);
  console.log(`  ${CLI_NAME} start            # 启动生产服务器`);
  console.log(`  ${CLI_NAME} generate (g)     # 生成代码`);
  console.log(`  ${CLI_NAME} db migrate (m)   # 数据库迁移`);
  console.log(`  ${CLI_NAME} db seed          # 执行数据库种子`);
  console.log(`  ${CLI_NAME} db status        # 查看迁移状态`);
  console.log(`  ${CLI_NAME} test             # 运行测试`);
  console.log(`  ${CLI_NAME} lint             # 代码检查`);
  console.log(`  ${CLI_NAME} fmt              # 代码格式化`);
  console.log(`  ${CLI_NAME} clean            # 清理构建产物`);
  console.log(`  ${CLI_NAME} preview          # 预览构建结果`);
  console.log(`  ${CLI_NAME} upgrade          # 升级 dweb`);
  console.log(`  ${CLI_NAME} --help           # 查看完整帮助`);
  console.log("");
}

// 主入口
if (import.meta.main) {
  installGlobalCli().catch((err) => {
    console.error("安装失败:", err);
    exit(1);
  });
}
