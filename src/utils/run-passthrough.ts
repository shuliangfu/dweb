/**
 * dweb-cli run 参数透传辅助
 *
 * 命令自己的 `--username` 等选项不能进 @dreamer/console 解析器（未知选项会报错）。
 * 入口先把它们摘出来，位置参数留给解析器，再在 cmd/run.ts 合成
 * ConsoleContext.args / options。
 *
 * 框架选项仍留给解析器：`-a`/`--app`、`-l`/`--list`、`--timeout`、`--help`、`--version`。
 * 裸 `--` 不再作分隔符，出现即拒绝。
 */

export const RUN_PASSTHROUGH_KEY = "__DWEB_RUN_PASSTHROUGH__";

/** `dweb-cli run` 遇到已移除的裸 `--` 分隔符 */
export class RunDoubleDashError extends Error {
  constructor() {
    super("dweb-cli run does not accept --");
    this.name = "RunDoubleDashError";
  }
}

/** run 子命令上由框架消费的长选项 */
const FRAMEWORK_LONG = new Set([
  "app",
  "list",
  "timeout",
  "help",
  "version",
]);

/** run 子命令上由框架消费的短选项 */
const FRAMEWORK_SHORT = new Set(["a", "l", "h", "v"]);

/** 这些框架选项带一个值（`--app console`、`--timeout 5000`） */
const FRAMEWORK_TAKES_VALUE = new Set(["app", "a", "timeout"]);

/** 负号开头但不是选项，例如 `-1`。 */
function isFlagToken(token: string): boolean {
  if (!token.startsWith("-") || token === "-") return false;
  return !/^-?\d/.test(token);
}

/**
 * 从 `run` 之后摘出命令自己的选项，返回给 Command.execute 的 argv。
 * 位置参数保留（`user/add admin admin@qq.com 13800138000`）。
 * 命令选项进透传（`user/add --username admin --email admin@qq.com`）。
 */
export function preprocessCliArgsForRun(args: string[]): string[] {
  const runIdx = args.findIndex((a) => a === "run");
  if (runIdx < 0) return args;

  const afterRun = args.slice(runIdx + 1);
  const kept: string[] = [];
  const user: string[] = [];

  for (let i = 0; i < afterRun.length; i++) {
    const token = afterRun[i]!;
    if (token === "--") {
      throw new RunDoubleDashError();
    }

    if (token.startsWith("--")) {
      const body = token.slice(2);
      const eq = body.indexOf("=");
      const name = eq >= 0 ? body.slice(0, eq) : body;
      if (FRAMEWORK_LONG.has(name)) {
        kept.push(token);
        if (
          eq < 0 && FRAMEWORK_TAKES_VALUE.has(name) &&
          i + 1 < afterRun.length && !isFlagToken(afterRun[i + 1]!)
        ) {
          kept.push(afterRun[++i]!);
        }
      } else {
        user.push(token);
        if (
          eq < 0 && i + 1 < afterRun.length && !isFlagToken(afterRun[i + 1]!)
        ) {
          user.push(afterRun[++i]!);
        }
      }
      continue;
    }

    if (isFlagToken(token)) {
      const name = token.slice(1);
      if (FRAMEWORK_SHORT.has(name)) {
        kept.push(token);
        if (
          FRAMEWORK_TAKES_VALUE.has(name) &&
          i + 1 < afterRun.length && !isFlagToken(afterRun[i + 1]!)
        ) {
          kept.push(afterRun[++i]!);
        }
      } else {
        user.push(token);
      }
      continue;
    }

    kept.push(token);
  }

  if (user.length > 0) {
    (globalThis as Record<string, unknown>)[RUN_PASSTHROUGH_KEY] = user;
  } else {
    clearRunPassthrough();
  }
  return [...args.slice(0, runIdx + 1), ...kept];
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
      throw new RunDoubleDashError();
    }
    if (a.startsWith("--")) {
      const body = a.slice(2);
      if (body.includes("=")) {
        const eq = body.indexOf("=");
        options[body.slice(0, eq)] = body.slice(eq + 1);
      } else if (i + 1 < raw.length && !isFlagToken(raw[i + 1]!)) {
        options[body] = raw[++i]!;
      } else {
        options[body] = true;
      }
      continue;
    }
    if (isFlagToken(a)) {
      // 短选项只作布尔：-f。带值请写 --username admin。
      options[a.slice(1)] = true;
      continue;
    }
    args.push(a);
  }
  return { args, options };
}
