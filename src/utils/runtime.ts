/**
 * 运行时命令工具
 *
 * 根据当前运行时环境（Deno/Bun）返回对应的命令名称及参数格式，
 * 供 createCommand 等 CLI 命令使用，避免硬编码 "deno"。
 *
 * @module
 */

import { IS_BUN, IS_DENO } from "@dreamer/runtime-adapter";

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
  throw new Error("仅支持 Deno 或 Bun 运行时环境");
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
  throw new Error("仅支持 Deno 或 Bun 运行时环境");
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
  throw new Error("仅支持 Deno 或 Bun 运行时环境");
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
  throw new Error("仅支持 Deno 或 Bun 运行时环境");
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
  throw new Error("仅支持 Deno 或 Bun 运行时环境");
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
  throw new Error("仅支持 Deno 或 Bun 运行时环境");
}
