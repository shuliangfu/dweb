/**
 * 运行时命令工具
 *
 * 根据当前运行时环境（Deno/Bun）返回对应的命令名称及参数格式，
 * 供 createCommand 等 CLI 命令使用，避免硬编码 "deno"。
 *
 * @module
 */

import { getEnv, IS_BUN, IS_DENO, platform } from "@dreamer/runtime-adapter";
import { DwebErrorCode, throwDwebError } from "./errors.ts";

export { IS_BUN, IS_DENO };

/**
 * 判断当前是否为 Windows 平台
 *
 * 用于路径处理、终端交互等需要区分平台的逻辑。
 *
 * @returns 是否为 Windows
 *
 * @example
 * ```ts
 * if (isWindows()) {
 *   // Windows 特定逻辑
 * }
 * ```
 */
export function isWindows(): boolean {
  return platform() === "windows";
}

/**
 * 获取当前运行时对应的命令名称
 *
 * - IS_DENO 时返回 "deno"
 * - IS_BUN 时返回 "bun"
 * - 其他情况抛出异常
 *
 * @returns "deno" 或 "bun"
 * @throws {Error} 当运行时既不是 Deno 也不是 Bun 时
 *
 * @example
 * ```ts
 * import { createCommand } from "@dreamer/runtime-adapter";
 * import { getRuntime, getTaskArgs } from "../utils/runtime.ts";
 *
 * const cmd = createCommand(getRuntime(), {
 *   args: getTaskArgs("dev"),
 *   cwd: projectRoot,
 * });
 * ```
 */
export function getRuntime(): "deno" | "bun" {
  if (IS_DENO) {
    return "deno";
  }
  if (IS_BUN) {
    return "bun";
  }
  throwDwebError(DwebErrorCode.RUNTIME_UNSUPPORTED);
}

/**
 * 获取执行 task 的参数
 *
 * - Deno: ["task", taskName]
 * - Bun: ["run", taskName]（Bun 使用 bun run 执行 deno.json 中的 tasks）
 *
 * @param taskName 任务名称（如 dev、build、start）
 * @returns 传给 createCommand 的 args 数组
 *
 * @example
 * ```ts
 * const args = getTaskArgs("dev"); // Deno: ["task", "dev"], Bun: ["run", "dev"]
 * ```
 */
export function getTaskArgs(taskName: string): string[] {
  if (IS_DENO) {
    return ["task", taskName];
  }
  if (IS_BUN) {
    return ["run", taskName];
  }
  throwDwebError(DwebErrorCode.RUNTIME_UNSUPPORTED);
}

/**
 * 将 `deno.json` 中 **整条** task 命令字符串（如 `deno run -A src/main.ts --dev`）解析为
 * 传给 `createCommand("deno", { args })` 的参数（**不含**可执行名 `deno`）。
 * 仅当命令以 `deno run` 开头（大小写不敏感、允许多个空格）时成功；否则返回 `null`。
 * 与 `App` 的 `RUNTIME_ENV` 约定配合时，推荐 task 中显式带 `--dev` / `--build` / `--start`。
 *
 * @param taskLine `tasks[dev]` 等对应的字符串
 * @returns 如 `["run", "-A", "src/main.ts", "--dev"]`；无法识别为 `deno run ...` 时返回 `null`
 */
export function getDenoRunArgsFromTaskString(
  taskLine: string,
): string[] | null {
  const s = taskLine.trim();
  const m = s.match(/^deno\s+run\s+(.+)$/i);
  if (!m) return null;
  const rest = m[1]!.trim();
  if (!rest) return null;
  const parts = rest.split(/\s+/).filter(Boolean);
  return ["run", ...parts];
}

/**
 * 为 `dweb dev` / `build` / `start` 子进程选择参数：
 * - **Deno** 且对应 task 为 `deno run ...`：直接 `deno run ...`（不经过 `deno task`），
 *   与手动执行 `deno run -A src/main.ts --dev` 等一致，也避免 `Task <name> deno run ...` 的终端提示。
 * - 否则回退为 {@link getTaskArgs}（`deno task <name>` / `bun run <name>`）。
 *
 * @param taskName 如 `dev`、`build:start`、`dev:backend`
 * @param tasks 项目 `deno.json` 的 `tasks` 表
 */
export function getSpawnArgsForDwebTask(
  taskName: string,
  tasks: Record<string, string | undefined>,
): string[] {
  const line = tasks[taskName];
  if (IS_DENO && line !== undefined) {
    const direct = getDenoRunArgsFromTaskString(line);
    if (direct) return direct;
  }
  return getTaskArgs(taskName);
}

/**
 * dweb-cli 与子应用约定的运行时阶段标识（与 `--dev` / `--build` / `--start` 语义一致）。
 *
 * 通过环境变量 `RUNTIME_ENV` 传入子进程，便于在未重复追加 CLI 参数时仍能区分 dev/build/start。
 */
export type RuntimeEnvKind = "dev" | "build" | "start";

/**
 * 读取当前进程完整环境变量表，供 spawn 子进程时做合并（避免仅传入部分键导致其它变量丢失）。
 *
 * @returns 当前进程 env 的快照
 */
function getInheritedEnvForSpawn(): Record<string, string> {
  if (IS_DENO) {
    // Deno 1.x+ 提供 toObject() 快照进程环境（较 entries() 兼容性更好）
    return { ...Deno.env.toObject() };
  }
  if (IS_BUN) {
    const procEnv = (
      globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env ?? {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(procEnv)) {
      if (typeof value === "string") {
        out[key] = value;
      }
    }
    return out;
  }
  throwDwebError(DwebErrorCode.RUNTIME_UNSUPPORTED);
}

/**
 * 构造传给 `createCommand(..., { env })` 的环境变量：继承当前进程 env，并设置 `RUNTIME_ENV`。
 *
 * @param runtime 对应 dweb dev / build / start 命令
 * @returns 可用于子进程的完整 env 对象
 *
 * @example
 * ```ts
 * createCommand(runtime, {
 *   args: getTaskArgs("dev"),
 *   env: envWithRuntime("dev"),
 * });
 * ```
 */
export function envWithRuntime(
  runtime: RuntimeEnvKind,
): Record<string, string> {
  return { ...getInheritedEnvForSpawn(), RUNTIME_ENV: runtime };
}

/**
 * 获取执行 deno test / bun test 的参数
 *
 * - Deno: ["test", "-A", path]
 * - Bun: ["test", path]
 *
 * @param path 测试路径（如 tests）
 * @returns args 数组
 *
 * @example
 * ```ts
 * const args = getTestArgs("tests"); // Deno: ["test", "-A", "tests"]
 * ```
 */
export function getTestArgs(path: string = "tests"): string[] {
  if (IS_DENO) {
    return ["test", "-A", path];
  }
  if (IS_BUN) {
    return ["test", path];
  }
  throwDwebError(DwebErrorCode.RUNTIME_UNSUPPORTED);
}

/**
 * 获取执行 lint 的参数
 *
 * - Deno: useTask 时 ["task", "lint"]，否则 ["lint"]
 * - Bun: ["run", "lint"]（Bun 无内置 lint，需通过 task）
 *
 * @param useTask 是否使用 task
 * @returns args 数组
 *
 * @example
 * ```ts
 * const args = getLintArgs(true); // Deno: ["task", "lint"]
 * ```
 */
export function getLintArgs(useTask: boolean = false): string[] {
  if (IS_DENO) {
    return useTask ? ["task", "lint"] : ["lint"];
  }
  if (IS_BUN) {
    return ["run", "lint"];
  }
  throwDwebError(DwebErrorCode.RUNTIME_UNSUPPORTED);
}

/**
 * 获取执行 fmt 的参数
 *
 * - Deno: useTask 时 ["task", "fmt"]，否则 ["fmt"]
 * - Bun: ["run", "fmt"]
 *
 * @param useTask 是否使用 task
 * @returns args 数组
 *
 * @example
 * ```ts
 * const args = getFmtArgs(); // Deno: ["fmt"]
 * ```
 */
export function getFmtArgs(useTask: boolean = false): string[] {
  if (IS_DENO) {
    return useTask ? ["task", "fmt"] : ["fmt"];
  }
  if (IS_BUN) {
    return ["run", "fmt"];
  }
  throwDwebError(DwebErrorCode.RUNTIME_UNSUPPORTED);
}

/**
 * 获取执行 run 的参数（运行脚本文件）
 *
 * - Deno: ["run", "-A", filePath]
 * - Bun: ["run", filePath]
 *
 * @param filePath 要运行的脚本路径
 * @returns args 数组
 *
 * @example
 * ```ts
 * const args = getRunArgs("src/main.ts"); // Deno: ["run", "-A", "src/main.ts"]
 * ```
 */
export function getRunArgs(filePath: string): string[] {
  if (IS_DENO) {
    return ["run", "-A", filePath];
  }
  if (IS_BUN) {
    return ["run", filePath];
  }
  throwDwebError(DwebErrorCode.RUNTIME_UNSUPPORTED);
}

/**
 * 供 `main.{env}.ts`、`params.{env}.ts` 及 `preloadDotEnvSync` 选层等使用的 profile 名，
 * **仅**与进程 `RUNTIME_ENV`（`dev` | `build` | `start`）一致；未设置或非法时默认 `dev`。
 *
 * 与 `main.prod.ts` 的约定：在 `loadMainConfig` 中，当本函数返回 `build` 或 `start` 时会**额外**
 * 先合并 `main.prod.ts`（再合并 `main.build.ts` / `main.start.ts` 若存在），以兼容只维护生产覆盖文件的项目。
 */
export function configProfileFromRuntimeEnv(): string {
  const r = getEnv("RUNTIME_ENV");
  if (r === "dev" || r === "build" || r === "start") {
    return r;
  }
  return "dev";
}
