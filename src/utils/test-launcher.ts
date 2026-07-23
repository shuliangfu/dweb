/**
 * dweb-cli test 产品层纯逻辑
 *
 * 职责：
 * - 解析分层（unit / integration / e2e）与路径 argv
 * - 判断是否优先走 deno.json `tasks.test`（无产品 flag 时兼容旧行为）
 * - 不 import `@dreamer/test`（用例框架仍由宿主加载用例文件时使用）
 *
 * @module
 */

/** 与产品契约一致的分层快捷方式 */
export type TestLayer = "unit" | "integration" | "e2e";

/** 分层 → 默认目录（相对项目根） */
export const TEST_LAYER_DIRS: Record<TestLayer, string> = {
  unit: "tests/unit",
  integration: "tests/integration",
  e2e: "tests/e2e",
};

/**
 * 从 CLI 选项解析启用的分层列表（可多选）
 */
export function resolveTestLayers(options: {
  unit?: boolean;
  integration?: boolean;
  e2e?: boolean;
}): TestLayer[] {
  const layers: TestLayer[] = [];
  if (options.unit) layers.push("unit");
  if (options.integration) layers.push("integration");
  if (options.e2e) layers.push("e2e");
  return layers;
}

/**
 * 解析最终测试路径列表
 *
 * 优先级：
 * 1. 显式路径 argv（非空）
 * 2. 分层 flag → `tests/unit` 等
 * 3. 默认 `["tests"]`
 *
 * @param positionalPaths 位置参数中的路径（不含被当作 app 名消费的参数）
 * @param layers 已启用分层
 */
export function resolveTestPaths(
  positionalPaths: string[],
  layers: TestLayer[],
): string[] {
  if (positionalPaths.length > 0) {
    return [...positionalPaths];
  }
  if (layers.length > 0) {
    return layers.map((layer) => TEST_LAYER_DIRS[layer]);
  }
  return ["tests"];
}

/**
 * 是否优先执行 `tasks.test` / `tasks["test:app"]`
 *
 * 规则：仅当用户**未**指定路径、分层、filter、coverage 时使用 task（兼容旧项目自定义脚本）。
 * 一旦有产品层 flag / 路径，始终 spawn 宿主 test，保证 flag 语义生效。
 */
export function shouldPreferTestTask(input: {
  paths: string[];
  layers: TestLayer[];
  filter?: string;
  coverage?: boolean | string;
}): boolean {
  if (input.layers.length > 0) return false;
  if (input.filter) return false;
  if (input.coverage !== undefined && input.coverage !== false) return false;
  // 默认路径 ["tests"] 且无其它 flag → 可走 task
  if (
    input.paths.length === 1 &&
    input.paths[0] === "tests"
  ) {
    return true;
  }
  // 显式其它路径 → 直接宿主
  return false;
}

/**
 * 解析 `--runtime`：仅 `deno` | `bun`；空/未设返回 undefined（跟随当前 CLI）
 *
 * @returns 宿主名，或 invalid 时返回 `{ invalid: string }`
 */
export function parseTestRuntime(
  value: unknown,
): { runtime?: "deno" | "bun"; invalid?: string } {
  if (value === undefined || value === null || value === false) {
    return {};
  }
  const s = String(value).trim().toLowerCase();
  if (!s) return {};
  if (s === "deno" || s === "bun") {
    return { runtime: s };
  }
  return { invalid: s };
}

/**
 * 从位置参数中取出应用名（多应用且未用 `-a` 时，首参可为 app 名）
 *
 * @param args 全部位置参数
 * @param appFromOption `-a/--app` 已解析值
 * @param appNames 项目多应用名列表；单应用传 `[]`
 * @returns app 名与剩余路径参数
 */
export function splitAppAndPaths(
  args: string[],
  appFromOption: string | undefined,
  appNames: string[],
): { app?: string; paths: string[] } {
  if (appFromOption) {
    return { app: appFromOption, paths: [...args] };
  }
  if (appNames.length > 0 && args.length > 0 && appNames.includes(args[0]!)) {
    return { app: args[0], paths: args.slice(1) };
  }
  return { paths: [...args] };
}
