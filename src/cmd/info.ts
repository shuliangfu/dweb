/**
 * dweb-cli info — 打印项目／框架摘要（加法）。
 *
 * 退出码：0 成功；2 无项目。
 */

import { error, info } from "@dreamer/console";
import { cwd, exit, readTextFile } from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";
import { $tr } from "../utils/i18n.ts";
import { getProjectInfo } from "../utils/project.ts";
import { getDwebVersion } from "../utils/version.ts";
import { getRuntime } from "../utils/runtime.ts";

export async function main(
  _args: string[],
  _options: ParsedOptions,
): Promise<void> {
  const projectRoot = cwd();
  const projectInfo = await getProjectInfo(projectRoot);
  const version = await getDwebVersion();
  const runtime = getRuntime();

  info(`dweb-cli ${version}`);
  info(`runtime: ${runtime}`);
  info(`cwd: ${projectRoot}`);

  if (!projectInfo) {
    error($tr("common.noDenoJson"));
    exit(2);
  }

  let denoJson: Record<string, unknown> = {};
  try {
    denoJson = JSON.parse(await readTextFile(`${projectRoot}/deno.json`));
  } catch {
    /* ignore */
  }
  info(`name: ${denoJson.name ?? "(unnamed)"}`);
  info(`version: ${denoJson.version ?? "(none)"}`);
  const tasks = Object.keys(
    (denoJson.tasks as Record<string, string> | undefined) ?? {},
  );
  if (tasks.length) info(`tasks: ${tasks.join(", ")}`);
  const imports = (denoJson.imports as Record<string, string> | undefined) ??
    {};
  const dreamer = Object.entries(imports)
    .filter(([k]) => k.startsWith("@dreamer/"))
    .map(([k, v]) => `${k}@${v.replace(/^jsr:@dreamer\/[^@]+@/, "")}`)
    .slice(0, 20);
  if (dreamer.length) {
    info("dreamer deps:");
    for (const line of dreamer) info(`  ${line}`);
  }
}
