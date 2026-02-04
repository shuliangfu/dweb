#!/usr/bin/env -S deno run -A

/**
 * dweb-cli 全局命令安装脚本
 *
 * 职责：
 * - 执行 deno install 将 dweb CLI 安装为全局命令 dweb-cli
 * - 支持从本地开发或 JSR 包运行
 *
 * 使用方式：
 * - 从 JSR：deno run -A jsr:@dreamer/dweb/setup
 * - 本地开发：deno run -A src/setup.ts
 *
 * 安装后可在任意目录执行：dweb-cli init、dweb-cli generate 等
 */

import { createCommand, exit, join } from "@dreamer/runtime-adapter";
import { getPackageRoot } from "./utils/version.ts";

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
 * 执行 deno install 安装全局命令
 */
async function installGlobalCli(): Promise<void> {
  const cliEntry = getCliEntry();
  console.log(`正在安装全局命令: ${CLI_NAME}`);
  console.log("");

  const args: string[] = [
    "install",
    "--global",
    "-f",
    "-q", // 静默模式，不输出 Deno 默认的 "Successfully installed" 等提示
    "-n",
    CLI_NAME,
    "-A",
  ];

  // 本地安装时指定 config，避免 "discovered config file will be ignored" 警告
  if (isLocalRun()) {
    args.push("--config", join(getPackageRoot(), "deno.json"));
  }

  args.push(cliEntry);

  const cmd = createCommand("deno", {
    args,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const child = cmd.spawn();
  const status = await child.status;

  if (status.success) {
    console.log("");
    console.log(`✅ ${CLI_NAME} 已安装成功`);
    console.log("使用方式:");
    console.log(`  ${CLI_NAME} init [项目名]     # 初始化新项目`);
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
  } else {
    console.error(`\n❌ 安装失败，退出码: ${status.code}`);
    exit(status.code ?? 1);
  }
}

// 主入口
if (import.meta.main) {
  installGlobalCli().catch((err) => {
    console.error("安装失败:", err);
    exit(1);
  });
}
