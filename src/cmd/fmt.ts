/**
 * dweb fmt 命令
 *
 * 职责：
 * - 运行代码格式化
 * - 优先执行 deno task fmt，若不存在则执行 deno fmt
 *
 * 运行方式：
 * - dweb fmt
 */

import { error, info, success } from "@dreamer/console";
import { createCommand, cwd } from "@dreamer/runtime-adapter";
import { $t } from "../utils/i18n.ts";
import type { ParsedOptions } from "../feature/command.ts";
import { getProjectInfo } from "../utils/project.ts";
import { getFmtArgs, getRuntime } from "../utils/runtime.ts";

/**
 * fmt 命令主入口
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

  const taskName = "fmt";
  if (projectInfo.tasks[taskName]) {
    info($t("fmt.running"));
    const cmd = createCommand(runtime, {
      args: getFmtArgs(true),
      cwd: projectRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    const status = await child.status;
    if (status.success) {
      success($t("fmt.complete"));
    } else {
      error($t("fmt.exitCode", { code: String(status.code ?? "?") }));
    }
    return;
  }

  // 无 fmt task，直接运行 fmt
  info($t("fmt.running"));
  const cmd = createCommand(runtime, {
    args: getFmtArgs(false),
    cwd: projectRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const child = cmd.spawn();
  const status = await child.status;
  if (status.success) {
    success($t("fmt.complete"));
  } else {
    error($t("fmt.exitCode", { code: String(status.code ?? "?") }));
  }
}
