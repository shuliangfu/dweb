/**
 * dweb-cli 实际启动逻辑（命令树、参数预处理、执行）。
 *
 * 由精简入口 `src/cli.ts` 在 import-map 重跑完成或确认可跳过之后再加载，
 * 避免 Deno 在解析 `cli.ts` 时把 `@dreamer/runtime-adapter` / 命令树预装进
 * 第一个进程的模块图。
 *
 * @module
 */

import { isMainModule } from "./utils/main-module.ts";
import {
  preprocessCliArgsForRun,
  RunDoubleDashError,
} from "./utils/run-passthrough.ts";
import { perfDump, perfEnabled, perfMark } from "./utils/perf-trace.ts";
import { args as getArgs, exit } from "@dreamer/runtime-adapter";
import { runCli } from "./cli-factory.ts";

/** Run the full CLI command tree. Safe to call after a reexec skip. */
export async function bootCli(): Promise<void> {
  if (perfEnabled) {
    perfMark("cli_boot_start");
  }
  let argv: string[];
  try {
    argv = preprocessCliArgsForRun(getArgs());
  } catch (err) {
    if (err instanceof RunDoubleDashError) {
      const { error } = await import("./feature/command.ts");
      const { $tr } = await import("./utils/i18n.ts");
      error($tr("run.doubleDashRemoved"));
      exit(2);
      return;
    }
    throw err;
  }

  if (perfEnabled) perfMark("cli_factory_imported");
  await runCli(argv);
  if (perfEnabled) {
    perfMark("cli_execute_done");
    perfDump("cli");
  }
  exit(0);
}

if (isMainModule(import.meta)) {
  await bootCli();
}
