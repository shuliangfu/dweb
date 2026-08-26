/**
 * dweb init 脚手架入口：收集选项、生成项目、主入口
 */

import { info, success } from "@dreamer/console";
import { basename, cwd } from "@dreamer/runtime-adapter";
import { $tr } from "../../utils/i18n.ts";
import { loadDwebDenoJson } from "../../utils/version.ts";
import type { DwebDenoConfig } from "../../utils/version.ts";
import { collectOptions } from "./collect.ts";
import { generate, InitCancelledError } from "./generate.ts";
import { resolveApps } from "./helpers.ts";
import type { InitMainOptions, InitOptions } from "./types.ts";

export { collectOptions, generate, InitCancelledError };
export type { InitMainOptions, InitOptions };
export { loadDwebDenoJson };
export type { DwebDenoConfig };

/**
 * 主入口
 *
 * @param argv 可选，由 CLI 传入的子命令参数（如 ["my-app"]），会传给 collectOptions 作为项目名称
 * @param options 可选，CLI 选项（如 { beta: true } 来自 --beta）
 */
export async function main(
  argv?: string[],
  options?: InitMainOptions,
): Promise<void> {
  const opts = await collectOptions(argv, options?.beta);

  info($tr("init.generatingProject"));
  try {
    await generate(opts);
  } catch (err) {
    if (err instanceof InitCancelledError) {
      return;
    }
    throw err;
  }

  success($tr("init.projectCreated"));
  info($tr("init.nextSteps"));
  const apps = resolveApps(opts);
  const isMulti = opts.appMode === "multi" && apps.length > 0;
  if (opts.targetDir !== cwd()) {
    info($tr("init.cdDir", { dir: basename(opts.targetDir) }));
  }
  if (isMulti) {
    for (const app of apps) {
      if (app.kind === "console") {
        info($tr("init.runConsoleApp", { app: app.name }));
      } else {
        info($tr("init.runDevApp", { app: app.name }));
      }
    }
  } else if (apps[0]?.kind === "console") {
    info($tr("init.runConsole"));
  } else {
    info($tr("init.runDev"));
  }
  console.log("");
}
