/**
 * dweb dev 命令
 *
 * 职责：
 * - 启动开发服务器
 * - 单应用：执行 deno task dev
 * - 多应用：需指定应用名，执行 deno task dev:xxx
 *
 * 运行方式：
 * - dweb dev              # 单应用
 * - dweb dev backend      # 多应用，启动 backend
 * - dweb dev -a frontend  # 多应用，启动 frontend
 */

import { error, info } from "@dreamer/console";
import { createCommand, cwd } from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";
import { getProjectInfo } from "../utils/project.ts";

/**
 * dev 命令主入口
 *
 * @param args 命令行参数，多应用时第一个参数可为应用名
 * @param options 解析后的选项，可含 app
 */
export async function main(
  args: string[],
  options: ParsedOptions,
): Promise<void> {
  const projectRoot = cwd();
  const projectInfo = await getProjectInfo(projectRoot);

  if (!projectInfo) {
    error("未找到 deno.json 或 tasks 配置，请在 dweb 项目根目录执行");
    return;
  }

  const app = (options.app as string) ?? args[0];

  if (projectInfo.mode === "single") {
    if (app) {
      info("单应用模式，忽略应用名参数");
    }
    const taskName = "dev";
    if (!projectInfo.tasks[taskName]) {
      error(`deno.json 中未定义 "dev" task`);
      error("请确保项目由 dweb init 初始化，或手动添加 dev task");
      return;
    }
    const cmd = createCommand("deno", {
      args: ["task", taskName],
      cwd: projectRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    const status = await child.status;
    if (!status.success) {
      error(`dev 命令退出码: ${status.code ?? "未知"}`);
    }
    return;
  }

  // 多应用
  if (!app) {
    error("多应用模式需指定应用名");
    error(`可用应用: ${projectInfo.appNames.join(", ")}`);
    error("示例: dweb dev backend  或  dweb dev -a frontend");
    return;
  }

  if (!projectInfo.appNames.includes(app)) {
    error(`未找到应用 "${app}"`);
    error(`可用应用: ${projectInfo.appNames.join(", ")}`);
    return;
  }

  const taskName = `dev:${app}`;
  if (!projectInfo.tasks[taskName]) {
    error(`deno.json 中未定义 "${taskName}" task`);
    return;
  }

  info(`正在启动 ${app} 开发服务器...`);
  const cmd = createCommand("deno", {
    args: ["task", taskName],
    cwd: projectRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const child = cmd.spawn();
  const status = await child.status;
  if (!status.success) {
    error(`dev:${app} 命令退出码: ${status.code ?? "未知"}`);
  }
}
