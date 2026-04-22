/**
 * dweb dev 命令
 *
 * 职责：
 * - 启动开发服务器
 * - 单应用：执行 deno task dev
 * - 多应用：需指定应用名，执行 deno task dev:xxx
 * - 使用 loadProjectConfig 获取 config.server 等配置（端口、主机等）
 * - 子进程环境变量设置 RUNTIME_ENV=dev（与任务脚本中的 `--dev` 语义一致）
 *
 * 运行方式：
 * - dweb dev              # 单应用
 * - dweb dev backend      # 多应用，启动 backend
 * - dweb dev -a frontend  # 多应用，启动 frontend
 */

import { error, info } from "@dreamer/console";
import { createCommand, cwd } from "@dreamer/runtime-adapter";
import { $tr } from "../utils/i18n.ts";
import type { ParsedOptions } from "../feature/command.ts";
import { loadProjectConfig } from "../utils/config-loader.ts";
import { getProjectInfo } from "../utils/project.ts";
import { envWithRuntime, getRuntime, getTaskArgs } from "../utils/runtime.ts";

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
    error($tr("common.noDenoJsonOrTasks"));
    return;
  }

  const app = (options.app as string) ?? args[0];

  if (projectInfo.mode === "single") {
    if (app) {
      info($tr("common.singleAppIgnore"));
    }
    const taskName = "dev";
    if (!projectInfo.tasks[taskName]) {
      error($tr("common.taskNotDefined", { task: taskName }));
      error($tr("common.ensureInit", { task: taskName }));
      return;
    }
    try {
      const config = await loadProjectConfig(projectRoot);
      const serverConfig = config.server as
        | { port?: number; host?: string }
        | undefined;
      if (serverConfig?.port) {
        info($tr("common.portFromConfig", { port: String(serverConfig.port) }));
      }
    } catch {
      // 配置加载失败时忽略
    }
    const cmd = createCommand(runtime, {
      args: getTaskArgs(taskName),
      cwd: projectRoot,
      env: envWithRuntime("dev"),
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });

    const child = cmd.spawn();
    const status = await child.status;
    if (!status.success) {
      error($tr("dev.exitCode", { code: String(status.code ?? "?") }));
    }
    return;
  }

  // 多应用
  if (!app) {
    error($tr("common.multiAppNeedApp"));
    error(
      $tr("common.availableApps", { apps: projectInfo.appNames.join(", ") }),
    );
    error($tr("common.exampleApp", { cmd: "dev", app: "backend" }));
    return;
  }

  if (!projectInfo.appNames.includes(app)) {
    error($tr("common.appNotFound", { app }));
    error(
      $tr("common.availableApps", { apps: projectInfo.appNames.join(", ") }),
    );
    return;
  }

  const taskName = `dev:${app}`;
  if (!projectInfo.tasks[taskName]) {
    error($tr("common.taskNotDefined", { task: taskName }));
    return;
  }

  try {
    const config = await loadProjectConfig(projectRoot, app);
    const serverConfig = config.server as
      | { port?: number; host?: string }
      | undefined;
    if (serverConfig?.port) {
      info($tr("common.portFromConfig", { port: String(serverConfig.port) }));
    }
  } catch {
    // 配置加载失败时忽略
  }
  info($tr("dev.starting", { app }));
  const cmd = createCommand(runtime, {
    args: getTaskArgs(taskName),
    cwd: projectRoot,
    env: envWithRuntime("dev"),
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const child = cmd.spawn();
  const status = await child.status;
  if (!status.success) {
    error($tr("dev.exitCodeApp", { app, code: String(status.code ?? "?") }));
  }
}
