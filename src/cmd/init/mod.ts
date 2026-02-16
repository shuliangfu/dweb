/**
 * dweb init 脚手架入口：收集选项、生成项目、主入口
 */

import { confirm, info, success } from "@dreamer/console";
import { basename, cwd, exists } from "@dreamer/runtime-adapter";
import { $t } from "../../utils/i18n.ts";
import { loadDwebDenoJson } from "../../utils/version.ts";
import type { DwebDenoConfig } from "../../utils/version.ts";
import { collectOptions } from "./collect.ts";
import { generate } from "./generate.ts";
import type { InitMainOptions, InitOptions } from "./types.ts";

export { collectOptions, generate };
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

  const targetExists = await exists(opts.targetDir);
  if (targetExists) {
    const go = await confirm(
      $t("init.dirExistsConfirm", { path: opts.targetDir }),
      false,
    );
    if (!go) {
      info($t("init.cancelled"));
      return;
    }
  }

  info($t("init.generatingProject"));
  await generate(opts);

  success($t("init.projectCreated"));
  info($t("init.nextSteps"));
  const isMulti = opts.appMode === "multi" && (opts.appNames?.length ?? 0) > 0;
  if (opts.targetDir !== cwd()) {
    info($t("init.cdDir", { dir: basename(opts.targetDir) }));
  }
  if (isMulti && opts.appNames?.length) {
    for (const app of opts.appNames) {
      info($t("init.runDevApp", { app }));
    }
  } else {
    info($t("init.runDev"));
  }
  console.log("");
}
