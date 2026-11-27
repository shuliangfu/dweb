import type { AppPlugin, ConsoleContext } from "@dreamer/dweb";

export const meta = {
  description: "Print the current teammate (single-file plugin command)",
};

/** Usage: dweb-cli run whoami */
export function run(_ctx: ConsoleContext): void {
  console.log("当前用户：张三");
}

/**
 * A single plugin file that provides one command (`dweb-cli run whoami`).
 * Register it in `console/main.ts` or `console/config`.
 * `console.command.file` points at this same module's `run` export.
 */
export function whoamiPlugin(): AppPlugin {
  return {
    name: "whoami",
    version: "1.0.0",
    console: {
      command: {
        name: "whoami",
        file: new URL("./whoami.ts", import.meta.url),
      },
    },
  };
}
