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
import { $tr } from "../utils/i18n.ts";
import type { ParsedOptions } from "../feature/command.ts";
import { getProjectInfo } from "../utils/project.ts";
import { getLintArgs, getRuntime } from "../utils/runtime.ts";

/**
 * lint 命令主入口
 *
 * @param _args 命令行参数（未使用）
 * @param _options 解析后的选项（未使用）
 */
/**
 * @param args 额外传给宿主 lint 的路径／参数（与 deno lint 对齐）
 * @param options CLI 选项；`quiet` 透传意图预留
 */
export async function main(
  args: string[],
  _options: ParsedOptions,
): Promise<number> {
  const runtime = getRuntime();
  const projectRoot = cwd();
  const projectInfo = await getProjectInfo(projectRoot);

  if (!projectInfo) {
    error($tr("common.noDenoJson"));
    return 2;
  }

  const taskName = "lint";
  if (projectInfo.tasks[taskName]) {
    info($tr("lint.running"));
    const cmd = createCommand(runtime, {
      args: [...getLintArgs(true), ...args],
      cwd: projectRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    const status = await child.status;
    if (status.success) {
      success($tr("lint.complete"));
      return 0;
    }
    error($tr("lint.exitCode", { code: String(status.code ?? "?") }));
    return status.code ?? 1;
  }

  // 无 lint task，直接运行 lint
  info($tr("lint.running"));
  const cmd = createCommand(runtime, {
    args: [...getLintArgs(false), ...args],
    cwd: projectRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const child = cmd.spawn();
  const status = await child.status;
  if (status.success) {
    success($tr("lint.complete"));
    return 0;
  }
  error($tr("lint.exitCode", { code: String(status.code ?? "?") }));
  return status.code ?? 1;
}
