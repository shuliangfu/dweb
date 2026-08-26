/**
 * dweb-cli run 参数透传辅助
 *
 * JSR 版 @dreamer/console 未必支持裸 `--`；在 cli 入口预处理并暂存，
 * 供 cmd/run.ts 合并进 ConsoleContext.args / options。
 */

export const RUN_PASSTHROUGH_KEY = "__DWEB_RUN_PASSTHROUGH__";

/**
 * 从 argv 中剥离 `run` 之后的裸 `--` 及其后参数，存到 globalThis，
 * 返回给 Command.execute 的干净 argv（避免 unknown option）。
 */
export function preprocessCliArgsForRun(args: string[]): string[] {
  const runIdx = args.findIndex((a) => a === "run");
  if (runIdx < 0) return args;
  const afterRun = args.slice(runIdx + 1);
  const dd = afterRun.indexOf("--");
  if (dd < 0) {
    clearRunPassthrough();
    return args;
  }
  const passthrough = afterRun.slice(dd + 1);
  (globalThis as Record<string, unknown>)[RUN_PASSTHROUGH_KEY] = passthrough;
  return [
    ...args.slice(0, runIdx + 1),
    ...afterRun.slice(0, dd),
  ];
}

export function takeRunPassthrough(): string[] {
  const g = globalThis as Record<string, unknown>;
  const v = g[RUN_PASSTHROUGH_KEY];
  delete g[RUN_PASSTHROUGH_KEY];
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

export function clearRunPassthrough(): void {
  delete (globalThis as Record<string, unknown>)[RUN_PASSTHROUGH_KEY];
}

/**
 * 把透传段解析为位置参数 + 简易选项（--foo / --foo=bar / --foo bar）
 */
export function parseTrailingCommandArgs(raw: string[]): {
  args: string[];
  options: Record<string, string | boolean | number>;
} {
  const args: string[] = [];
  const options: Record<string, string | boolean | number> = {};
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i]!;
    if (a === "--") {
      args.push(...raw.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const body = a.slice(2);
      if (body.includes("=")) {
        const eq = body.indexOf("=");
        options[body.slice(0, eq)] = body.slice(eq + 1);
      } else if (i + 1 < raw.length && !raw[i + 1]!.startsWith("-")) {
        options[body] = raw[++i]!;
      } else {
        options[body] = true;
      }
      continue;
    }
    if (a.startsWith("-") && a.length > 1 && !a.startsWith("--")) {
      // 短选项：-f → boolean；-f value 不在此严格支持
      options[a.slice(1)] = true;
      continue;
    }
    args.push(a);
  }
  return { args, options };
}
