/**
 * dweb lint 命令
 *
 * 职责：
 * - 运行代码检查
 * - 优先执行 deno task lint，若不存在则执行 deno lint
 *
 * 运行方式：
 * - dweb lint
 */

import { error, info, success } from "@dreamer/console";
import { createCommand, cwd } from "@dreamer/runtime-adapter";
import { $t } from "../utils/i18n.ts";
import type { ParsedOptions } from "../feature/command.ts";
import { getProjectInfo } from "../utils/project.ts";
import { getLintArgs, getRuntime } from "../utils/runtime.ts";

/**
 * lint 命令主入口
 *
 * @param _args 命令行参数（未使用）
 * @param _options 解析后的选项（未使用）
 */
export async function main(
  _args: string[],
  _options: ParsedOptions,
): Promise<void> {
  const runtime = getRuntime();
  const projectRoot = cwd();
  const projectInfo = await getProjectInfo(projectRoot);

  if (!projectInfo) {
    error($t("common.noDenoJson"));
    return;
  }

  const taskName = "lint";
  if (projectInfo.tasks[taskName]) {
    info($t("lint.running"));
    const cmd = createCommand(runtime, {
      args: getLintArgs(true),
      cwd: projectRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    const status = await child.status;
    if (status.success) {
      success($t("lint.complete"));
    } else {
      error($t("lint.exitCode", { code: String(status.code ?? "?") }));
    }
    return;
  }

  // 无 lint task，直接运行 lint
  info($t("lint.running"));
  const cmd = createCommand(runtime, {
    args: getLintArgs(false),
    cwd: projectRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const child = cmd.spawn();
  const status = await child.status;
  if (status.success) {
    success($t("lint.complete"));
  } else {
    error($t("lint.exitCode", { code: String(status.code ?? "?") }));
  }
}
