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
    error($t("common.noDenoJsonOrTasks"));
    return;
  }

  const app = (options.app as string) ?? args[0];

  if (projectInfo.mode === "single") {
    if (app) {
      info($t("build.singleIgnore"));
    }
    const taskName = "build";
    if (!projectInfo.tasks[taskName]) {
      error($t("common.taskNotDefined", { task: taskName }));
      error($t("common.ensureInit", { task: taskName }));
      return;
    }
    try {
      const config = await loadProjectConfig(projectRoot);
      const buildConfig = config.build as
        | { server?: { output?: string } }
        | undefined;
      if (buildConfig?.server?.output) {
        info($t("build.outputDir", { path: buildConfig.server.output }));
      }
    } catch {
      // 配置加载失败时忽略
    }
    info($t("build.building"));
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
      success($t("build.complete"));
    } else {
      error($t("build.exitCode", { code: String(status.code ?? "?") }));
    }
    return;
  }

  // 多应用
  const appsToBuild = app
    ? (projectInfo.appNames.includes(app) ? [app] : [])
    : projectInfo.appNames;

  if (appsToBuild.length === 0) {
    if (app) {
      error($t("common.appNotFound", { app }));
      error(
        $t("common.availableApps", { apps: projectInfo.appNames.join(", ") }),
      );
    } else {
      error($t("build.noAppsToBuild"));
    }
    return;
  }

  for (const appName of appsToBuild) {
    const taskName = `build:${appName}`;
    if (!projectInfo.tasks[taskName]) {
      error($t("common.taskNotDefined", { task: taskName }));
      continue;
    }
    try {
      const config = await loadProjectConfig(projectRoot, appName);
      const buildConfig = config.build as
        | { server?: { output?: string } }
        | undefined;
      if (buildConfig?.server?.output) {
        info($t("build.outputDir", { path: buildConfig.server.output }));
      }
    } catch {
      // 配置加载失败时忽略
    }
    info($t("build.building"));
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
      success($t("build.appComplete", { app: appName }));
    } else {
      error($t("build.appBuildFailed", {
        app: appName,
        code: String(status.code ?? "?"),
      }));
      return;
    }
  }
  success($t("build.allComplete"));
}
