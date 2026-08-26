/**
 * 运行时命令工具
 *
 * 根据当前运行时环境（Deno/Bun/Node）返回对应的命令名称及参数格式，
 * 供 createCommand 等 CLI 命令使用，避免硬编码 "deno"。
 *
 * @module
 */

import {
  getEnv,
  getEnvAll,
  IS_BUN,
  IS_DENO,
  IS_NODE,
  platform,
} from "@dreamer/runtime-adapter";
import { DwebErrorCode, throwDwebError } from "./errors.ts";

export { IS_BUN, IS_DENO, IS_NODE };

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
 * - IS_NODE 时返回 "node"
 * - 其他情况抛出异常
 *
 * @returns "deno"、"bun" 或 "node"
 * @throws {Error} 当运行时既不是 Deno、Bun 也不是 Node 时
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
export function getRuntime(): "deno" | "bun" | "node" {
  if (IS_DENO) {
    return "deno";
  }
  if (IS_BUN) {
    return "bun";
  }
  if (IS_NODE) {
    return "node";
  }
  throwDwebError(DwebErrorCode.RUNTIME_UNSUPPORTED);
}

/**
 * 获取执行 task 的参数
 *
 * - Deno: ["task", taskName]
 * - Bun: ["run", taskName]（Bun 使用 bun run 执行 deno.json 中的 tasks）
 * - Node: ["run", taskName]（Node 经 npm run / package.json scripts 执行；dweb 子进程实际由
 *   {@link getSpawnArgsForDwebTask} 的 Node 分支覆盖为 `--import tsx <file>`，此处仅兜底）
 *
 * @param taskName 任务名称（如 dev、build、start）
 * @returns 传给 createCommand 的 args 数组
 *
 * @example
 * ```ts
 * const args = getTaskArgs("dev"); // Deno: ["task", "dev"], Bun/Node: ["run", "dev"]
 * ```
 */
export function getTaskArgs(taskName: string): string[] {
  if (IS_DENO) {
    return ["task", taskName];
  }
  if (IS_BUN || IS_NODE) {
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
 * Deno 专有标志集合——在 Node 下运行 `deno run` 任务行时需过滤掉这些标志，
 * 因为 `node --import tsx` 不识别它们（权限标志无意义、`--no-check` 由 tsx 接管类型）。
 *
 * 【Why 根源】Node 无 Deno 的权限模型（`-A`/`--allow-*`），且类型检查由 tsx 在转换期处理，
 * 保留这些标志会导致 node 报 "bad option"。
 */
const DENO_ONLY_FLAGS = new Set([
  "-A",
  "--allow-all",
  "--allow-read",
  "--allow-write",
  "--allow-net",
  "--allow-env",
  "--allow-run",
  "--allow-ffi",
  "--allow-sys",
  "--allow-hrtime",
  "--no-check",
  "--no-check=remote",
  "--cached-only",
  "--inspect",
  "--inspect-brk",
  "--reload",
  "--lock",
  "--v8-flags",
  "--seed",
]);

/**
 * 将 `deno run ...` 任务行转换为 Node 兼容的 `node` 参数（**不含**可执行名 `node`）。
 *
 * 解析 `deno run -A src/main.ts --dev` → `["--import", "tsx", "src/main.ts", "--dev"]`：
 * - 前置 `--import tsx` 加载 TypeScript 转换器
 * - 过滤 Deno 专有标志（权限/类型/调试相关，见 {@link DENO_ONLY_FLAGS}）
 * - 保留文件路径与业务参数（`--dev`/`--build`/`--start` 等）
 *
 * @param taskLine `tasks[dev]` 等对应的字符串
 * @returns Node 参数数组；无法识别为 `deno run ...` 时返回 `null`
 */
export function getNodeRunArgsFromTaskString(
  taskLine: string,
): string[] | null {
  const s = taskLine.trim();
  const m = s.match(/^deno\s+run\s+(.+)$/i);
  if (!m) return null;
  const rest = m[1]!.trim();
  if (!rest) return null;
  const parts = rest.split(/\s+/).filter(Boolean);
  // 过滤 Deno 专有标志，保留文件路径与业务参数
  const passthrough = parts.filter((p) => !DENO_ONLY_FLAGS.has(p));
  if (passthrough.length === 0) return null;
  return ["--import", "tsx", ...passthrough];
}

/**
 * 为 `dweb dev` / `build` / `start` 子进程选择参数：
 * - **Deno** 且对应 task 为 `deno run ...`：直接 `deno run ...`（不经过 `deno task`），
 *   与手动执行 `deno run -A src/main.ts --dev` 等一致，也避免 `Task <name> deno run ...` 的终端提示。
 * - **Node** 且对应 task 为 `deno run ...`：转为 `node --import tsx <file> <args>`，
 *   过滤 Deno 专有标志（Node 无权限模型，类型检查由 tsx 接管）。
 * - 否则回退为 {@link getTaskArgs}（`deno task <name>` / `bun run <name>` / `npm run <name>`）。
 *
 * @param taskName 如 `dev`、`build:start`、`dev:backend`
 * @param tasks 项目 `deno.json` 的 `tasks` 表
 */
export function getSpawnArgsForDwebTask(
  taskName: string,
  tasks: Record<string, string | undefined>,
): string[] {
  const line = tasks[taskName];
  if (line !== undefined) {
    if (IS_DENO) {
      const direct = getDenoRunArgsFromTaskString(line);
      if (direct) return direct;
    }
    if (IS_NODE) {
      const nodeArgs = getNodeRunArgsFromTaskString(line);
      if (nodeArgs) return nodeArgs;
    }
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
 * 经 runtime-adapter 的 `getEnvAll()` 统一三端：Deno 用 `Deno.env.toObject()`，
 * Bun/Node 用 `process.env`（已过滤 undefined 值）。
 *
 * @returns 当前进程 env 的快照
 */
function getInheritedEnvForSpawn(): Record<string, string> {
  return getEnvAll();
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
 * 宿主测试运行时（与 `getRuntime()` 一致；供 `dweb-cli test --runtime` 覆盖）
 */
export type HostTestRuntime = "deno" | "bun" | "node";

/** 宿主测试 reporter（L1.5-a 透传） */
export type HostTestReporter = "junit" | "tap" | "dot";

/**
 * `getTestArgs` 选项：路径、filter、coverage 等产品层统一 flag
 */
export interface GetTestArgsOptions {
  /** 测试路径列表；默认 `["tests"]` */
  paths?: string[];
  /**
   * 用例名过滤
   * - Deno: `--filter=<pattern>`
   * - Bun: `-t <pattern>`
   */
  filter?: string;
  /**
   * 覆盖率
   * - `true`：Deno `--coverage=coverage`，Bun `--coverage`
   * - `string`：Deno 用作覆盖率目录；Bun 仍为 `--coverage`（Bun 不接受自定义 dir 于此映射）
   */
  coverage?: boolean | string;
  /**
   * 宿主 reporter：`junit` | `tap` | `dot`
   * - Deno：`--reporter=`；junit 可配合 `--junit-path=`
   * - Bun：仅可靠支持 `junit`（+ `--reporter-outfile`）；`tap`/`dot` 显式失败
   */
  reporter?: HostTestReporter;
  /** 报告输出路径（junit）；Deno → `--junit-path=`，Bun → `--reporter-outfile=` */
  reportOut?: string;
}

/**
 * 解析 `getTestArgs` 的 path 或 options 入参为规范化选项。
 *
 * @param pathOrOptions 路径字符串，或完整选项对象
 */
function normalizeTestArgsOptions(
  pathOrOptions: string | GetTestArgsOptions = "tests",
):
  & Required<Pick<GetTestArgsOptions, "paths">>
  & Omit<GetTestArgsOptions, "paths"> {
  if (typeof pathOrOptions === "string") {
    return { paths: [pathOrOptions] };
  }
  const paths = pathOrOptions.paths?.length ? pathOrOptions.paths : ["tests"];
  return {
    paths,
    filter: pathOrOptions.filter,
    coverage: pathOrOptions.coverage,
    reporter: pathOrOptions.reporter,
    reportOut: pathOrOptions.reportOut,
  };
}

/**
 * 校验并规范化 `--reporter` 值；非法返回 invalid。
 */
export function parseTestReporter(
  value: unknown,
): { reporter?: HostTestReporter; invalid?: string } {
  if (value === undefined || value === null || value === false) {
    return {};
  }
  const s = String(value).trim().toLowerCase();
  if (!s) return {};
  if (s === "junit" || s === "tap" || s === "dot") {
    return { reporter: s };
  }
  return { invalid: s };
}

/**
 * 获取执行 deno test / bun test / node test 的参数（产品层统一入口拼装）
 *
 * - Deno: `["test", "-A", ...paths, --filter=?, --coverage=?]`
 * - Bun: `["test", ...paths, -t?, --coverage?]`
 * - Node: `["--import", "tsx", "--test-force-exit", ...paths]`（Node 无 `test` 子命令，
 *   以 node 参数直接运行测试文件，node:test 在主进程自动执行；filter/coverage 暂不支持）
 *
 * @param pathOrOptions 测试路径（如 `"tests"`）或 {@link GetTestArgsOptions}
 * @param host 可选显式宿主；默认跟随当前 CLI 运行时（`IS_DENO` / `IS_BUN` / `IS_NODE`）
 * @returns 传给 `createCommand(host, { args })` 的 args（不含可执行名）
 *
 * @example
 * ```ts
 * getTestArgs("tests"); // Deno: ["test", "-A", "tests"]
 * getTestArgs({ paths: ["tests/unit"], filter: "chunk", coverage: true });
 * getTestArgs({ paths: ["tests"] }, "bun");
 * ```
 */
export function getTestArgs(
  pathOrOptions: string | GetTestArgsOptions = "tests",
  host?: HostTestRuntime,
): string[] {
  const opts = normalizeTestArgsOptions(pathOrOptions);
  const runtime: HostTestRuntime = host ??
    (IS_DENO ? "deno" : IS_BUN ? "bun" : IS_NODE ? "node" : (() => {
      throwDwebError(DwebErrorCode.RUNTIME_UNSUPPORTED);
    })());

  if (opts.reporter) {
    const unsupported = describeUnsupportedTestReporter(
      opts.reporter,
      opts.reportOut,
      runtime,
    );
    if (unsupported) {
      throw new Error(unsupported);
    }
  } else if (opts.reportOut) {
    throw new Error("--report-out requires --reporter junit");
  }

  // Node：无 test 子命令，直接以 node 参数运行测试文件（主进程执行，避免 IPC 序列化 bug）
  if (runtime === "node") {
    return ["--import", "tsx", "--test-force-exit", ...opts.paths];
  }

  const args: string[] = ["test"];
  if (runtime === "deno") {
    args.push("-A");
  }
  args.push(...opts.paths);

  if (opts.filter) {
    if (runtime === "deno") {
      args.push(`--filter=${opts.filter}`);
    } else {
      args.push("-t", opts.filter);
    }
  }

  if (opts.coverage !== undefined && opts.coverage !== false) {
    if (runtime === "deno") {
      const dir = typeof opts.coverage === "string" && opts.coverage.length > 0
        ? opts.coverage
        : "coverage";
      args.push(`--coverage=${dir}`);
    } else {
      args.push("--coverage");
    }
  }

  if (opts.reporter) {
    if (runtime === "deno") {
      args.push(`--reporter=${opts.reporter}`);
      if (opts.reportOut) {
        args.push(`--junit-path=${opts.reportOut}`);
      }
    } else {
      args.push("--reporter=junit");
      if (opts.reportOut) {
        args.push(`--reporter-outfile=${opts.reportOut}`);
      }
    }
  }

  return args;
}

/**
 * 返回不支持的 reporter 组合说明；支持则返回 undefined。
 */
export function describeUnsupportedTestReporter(
  reporter: HostTestReporter,
  reportOut: string | undefined,
  host: HostTestRuntime,
): string | undefined {
  if (reportOut && reporter !== "junit") {
    return `--report-out is only valid with --reporter junit (got ${reporter})`;
  }
  if (host === "bun" && reporter !== "junit") {
    return `Bun test only supports --reporter junit (got ${reporter})`;
  }
  if (host === "node") {
    return "Node test does not support --reporter yet";
  }
  return undefined;
}

/**
 * 获取执行 lint 的参数
 *
 * - Deno: useTask 时 ["task", "lint"]，否则 ["lint"]
 * - Bun/Node: ["run", "lint"]（经 package.json scripts 执行）
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
  if (IS_BUN || IS_NODE) {
    return ["run", "lint"];
  }
  throwDwebError(DwebErrorCode.RUNTIME_UNSUPPORTED);
}

/**
 * 获取执行 fmt 的参数
 *
 * - Deno: useTask 时 ["task", "fmt"]，否则 ["fmt"]
 * - Bun/Node: ["run", "fmt"]
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
  if (IS_BUN || IS_NODE) {
    return ["run", "fmt"];
  }
  throwDwebError(DwebErrorCode.RUNTIME_UNSUPPORTED);
}

/**
 * 获取执行 run 的参数（运行脚本文件）
 *
 * - Deno: ["run", "-A", filePath]
 * - Bun: ["run", filePath]
 * - Node: ["--import", "tsx", filePath]（经 tsx 转换 TypeScript）
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
  if (IS_NODE) {
    return ["--import", "tsx", filePath];
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
