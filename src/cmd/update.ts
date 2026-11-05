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
import { $tr } from "../utils/i18n.ts";
import type { ParsedOptions } from "../feature/command.ts";
import { getProjectInfo } from "../utils/project.ts";
import { getRuntime } from "../utils/runtime.ts";

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
    error($tr("common.noDenoJson"));
    return;
  }

  info($tr("update.running"));

  // Deno 默认拒绝「过新」依赖；透传 --min-dep-age=0，便于装上刚发的 JSR（与脚手架 deno.json minimumDependencyAge:0 一致）。
  // 用户仍可在 deno.json 改回更大值，或在本命令后自行收紧。
  const updateArgs = runtime === "deno" &&
      !args.some((a) => a === "--min-dep-age" || a.startsWith("--min-dep-age="))
    ? ["update", "--min-dep-age=0", ...args]
    : ["update", ...args];

  const cmd = createCommand(runtime, {
    args: updateArgs,
    cwd: projectRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const child = cmd.spawn();
  const status = await child.status;

  if (status.success) {
    success($tr("update.complete"));
  } else {
    error($tr("update.exitCode", { code: String(status.code ?? "?") }));
  }
}
