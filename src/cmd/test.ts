/**
 * dweb test 命令
 *
 * 职责：
 * - 运行测试
 * - 优先执行 deno task test，若不存在则执行 deno test -A tests
 *
 * 运行方式：
 * - dweb test              # 单应用
 * - dweb test -a backend   # 多应用，运行 backend 测试
 */

import { error, info, success } from "@dreamer/console";
import { createCommand, cwd } from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";
import { getProjectInfo } from "../utils/project.ts";
import { getRuntime, getTaskArgs, getTestArgs } from "../utils/runtime.ts";

/**
 * test 命令主入口
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
    error($t("common.noDenoJson"));
    return;
  }

  const app = (options.app as string) ?? args[0];

  if (projectInfo.mode === "single" || !app) {
    const taskName = "test";
    if (projectInfo.tasks[taskName]) {
      info($t("test.running"));
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
        success($t("test.complete"));
      } else {
        error($t("test.exitCode", { code: String(status.code ?? "?") }));
      }
      return;
    }
    // 无 test task，直接运行测试
    info($t("test.running"));
    const cmd = createCommand(runtime, {
      args: getTestArgs("tests"),
      cwd: projectRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    const status = await child.status;
    if (status.success) {
      success($t("test.complete"));
    } else {
      error($t("test.exitCode", { code: String(status.code ?? "?") }));
    }
    return;
  }

  // 多应用，指定了 app
  if (!projectInfo.appNames.includes(app)) {
    error($t("common.appNotFound", { app }));
    error($t("common.availableApps", { apps: projectInfo.appNames.join(", ") }));
    return;
  }

  const taskName = `test:${app}`;
  if (projectInfo.tasks[taskName]) {
    info($t("test.runningWithApp", { app }));
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
      success($t("test.appComplete", { app }));
    } else {
      error($t("test.appFailed", {
        app,
        code: String(status.code ?? "?"),
      }));
    }
  } else {
    error($t("common.taskNotDefined", { task: taskName }));
    error($t("test.addTaskHint"));
  }
}
