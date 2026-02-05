/**
 * dweb build 命令
 *
 * 职责：
 * - 构建生产版本
 * - 单应用：执行 deno task build
 * - 多应用：可指定应用名构建单个，或不指定则构建全部
 * - 使用 loadProjectConfig 获取 config.build 等配置
 *
 * 运行方式：
 * - dweb build              # 单应用 或 多应用构建全部
 * - dweb build backend      # 多应用，仅构建 backend
 * - dweb build -a frontend   # 多应用，仅构建 frontend
 */

import { error, info, success } from "@dreamer/console";
import { createCommand, cwd } from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";
import { loadProjectConfig } from "../utils/config-loader.ts";
import { getProjectInfo } from "../utils/project.ts";
import { getRuntime, getTaskArgs } from "../utils/runtime.ts";

/**
 * build 命令主入口
 *
 * @param args 命令行参数，多应用时第一个参数可为应用名
 * @param options 解析后的选项，可含 app
 */
export async function main(
  args: string[],
  options: ParsedOptions,
): Promise<void> {
  const runtime = getRuntime();
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
    const taskName = "build";
    if (!projectInfo.tasks[taskName]) {
      error(`deno.json 中未定义 "build" task`);
      error("请确保项目由 dweb init 初始化，或手动添加 build task");
      return;
    }
    try {
      const config = await loadProjectConfig(projectRoot);
      const buildConfig = config.build as
        | { server?: { output?: string } }
        | undefined;
      if (buildConfig?.server?.output) {
        info(`构建输出目录: ${buildConfig.server.output}（来自 config.build）`);
      }
    } catch {
      // 配置加载失败时忽略
    }
    info("正在构建...");
    const cmd = createCommand(runtime, {
      args: getTaskArgs(taskName),
      cwd: projectRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    const status = await child.status;
    if (status.success) {
      success("构建完成");
    } else {
      error(`build 命令退出码: ${status.code ?? "未知"}`);
    }
    return;
  }

  // 多应用
  const appsToBuild = app
    ? (projectInfo.appNames.includes(app) ? [app] : [])
    : projectInfo.appNames;

  if (appsToBuild.length === 0) {
    if (app) {
      error(`未找到应用 "${app}"`);
      error(`可用应用: ${projectInfo.appNames.join(", ")}`);
    } else {
      error("未找到可构建的应用");
    }
    return;
  }

  for (const appName of appsToBuild) {
    const taskName = `build:${appName}`;
    if (!projectInfo.tasks[taskName]) {
      error(`deno.json 中未定义 "${taskName}" task`);
      continue;
    }
    info(`正在构建 ${appName}...`);
    const cmd = createCommand(runtime, {
      args: getTaskArgs(taskName),
      cwd: projectRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    const status = await child.status;
    if (status.success) {
      success(`${appName} 构建完成`);
    } else {
      error(`${appName} 构建失败，退出码: ${status.code ?? "未知"}`);
      return;
    }
  }
  success("全部构建完成");
}
