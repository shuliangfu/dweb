/**
 * dweb dev 命令
 *
 * 职责：
 * - 启动开发服务器
 * - 单应用：执行 deno task dev
 * - 多应用：需指定应用名，执行 deno task dev:xxx
 * - 使用 loadProjectConfig 获取 config.server 等配置（端口、主机等）
 *
 * 运行方式：
 * - dweb dev              # 单应用
 * - dweb dev backend      # 多应用，启动 backend
 * - dweb dev -a frontend  # 多应用，启动 frontend
 */

import { $t } from "@dreamer/i18n";
import { error, info } from "@dreamer/console";
import { createCommand, cwd } from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";
import { loadProjectConfig } from "../utils/config-loader.ts";
import { getProjectInfo } from "../utils/project.ts";
import { getRuntime, getTaskArgs } from "../utils/runtime.ts";

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
      info($t("common.singleAppIgnore"));
    }
    const taskName = "dev";
    if (!projectInfo.tasks[taskName]) {
      error($t("common.taskNotDefined", { task: taskName }));
      error($t("common.ensureInit", { task: taskName }));
      return;
    }
    try {
      const config = await loadProjectConfig(projectRoot);
      const serverConfig = config.server as
        | { port?: number; host?: string }
        | undefined;
      if (serverConfig?.port) {
        info($t("common.portFromConfig", { port: String(serverConfig.port) }));
      }
    } catch {
      // 配置加载失败时忽略
    }
    const cmd = createCommand(runtime, {
      args: getTaskArgs(taskName),
      cwd: projectRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    const status = await child.status;
    if (!status.success) {
      error($t("dev.exitCode", { code: String(status.code ?? "?") }));
    }
    return;
  }

  // 多应用
  if (!app) {
    error($t("common.multiAppNeedApp"));
    error($t("common.availableApps", { apps: projectInfo.appNames.join(", ") }));
    error($t("common.exampleApp", { cmd: "dev", app: "backend" }));
    return;
  }

  if (!projectInfo.appNames.includes(app)) {
    error($t("common.appNotFound", { app }));
    error($t("common.availableApps", { apps: projectInfo.appNames.join(", ") }));
    return;
  }

  const taskName = `dev:${app}`;
  if (!projectInfo.tasks[taskName]) {
    error($t("common.taskNotDefined", { task: taskName }));
    return;
  }

  try {
    const config = await loadProjectConfig(projectRoot);
    const serverConfig = config.server as
      | { port?: number; host?: string }
      | undefined;
    if (serverConfig?.port) {
      info($t("common.portFromConfig", { port: String(serverConfig.port) }));
    }
  } catch {
    // 配置加载失败时忽略
  }
  info($t("dev.starting", { app }));
  const cmd = createCommand(runtime, {
    args: getTaskArgs(taskName),
    cwd: projectRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const child = cmd.spawn();
  const status = await child.status;
  if (!status.success) {
    error($t("dev.exitCodeApp", { app, code: String(status.code ?? "?") }));
  }
}
