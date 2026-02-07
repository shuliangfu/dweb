/**
 * dweb update 命令
 *
 * 职责：
 * - 执行 deno update 或 bun update，更新项目依赖与 lockfile
 * - 兼容 Deno 与 Bun 运行时
 *
 * 运行方式：
 * - dweb update
 * - dweb update --latest
 * - dweb update --interactive
 */

import { error, info, success } from "@dreamer/console";
import { createCommand, cwd } from "@dreamer/runtime-adapter";
import { $t } from "../utils/i18n.ts";
import type { ParsedOptions } from "../feature/command.ts";
import { getProjectInfo } from "../utils/project.ts";
import { getRuntime, getUpdateArgs } from "../utils/runtime.ts";

/**
 * update 命令主入口
 *
 * @param args 命令行参数（会透传给 deno update / bun update，如 --latest、--interactive）
 * @param _options 解析后的选项（未使用）
 */
export async function main(
  args: string[],
  _options: ParsedOptions,
): Promise<void> {
  const runtime = getRuntime();
  const projectRoot = cwd();
  const projectInfo = await getProjectInfo(projectRoot);

  if (!projectInfo) {
    error($t("common.noDenoJson"));
    return;
  }

  info($t("update.running"));

  const cmd = createCommand(runtime, {
    args: getUpdateArgs(args),
    cwd: projectRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const child = cmd.spawn();
  const status = await child.status;

  if (status.success) {
    success($t("update.complete"));
  } else {
    error($t("update.exitCode", { code: String(status.code ?? "?") }));
  }
}
