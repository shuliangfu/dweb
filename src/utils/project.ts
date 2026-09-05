/**
 * 项目结构检测工具
 *
 * 职责：
 * - 从 deno.json 解析 tasks，判断单应用/多应用
 * - 提取应用列表（多应用时）
 * - 供 dev/build/start 命令使用
 */

import {
  cwd,
  dirname,
  exists,
  existsSync,
  join,
  readTextFile,
  resolve,
} from "@dreamer/runtime-adapter";

/**
 * 移除 JSONC 文本中的单行和多行注释
 * @param jsonc 带注释的 JSON 文本
 * @returns 移除注释后的纯 JSON 文本
 */
export function stripJsonComments(jsonc: string): string {
  return jsonc.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")|(\/\/.*)|(\/\*[\s\S]*?\*\/)/g,
    (match, str) => (str ? match : ""),
  );
}

/**
 * 递归向上查找项目根目录（包含 deno.json、deno.jsonc 或 package.json 的目录）
 *
 * @param startDir 起始目录，默认为当前工作目录 cwd()
 * @returns 查找到的项目根目录绝对路径，若未找到则返回当前目录
 */
export async function findProjectRoot(
  startDir: string = cwd(),
): Promise<string> {
  let current = resolve(startDir);
  while (true) {
    if (
      (await exists(join(current, "deno.json"))) ||
      (await exists(join(current, "deno.jsonc"))) ||
      (await exists(join(current, "package.json")))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return resolve(startDir);
}

/**
 * 同步递归向上查找项目根目录
 *
 * @param startDir 起始目录，默认为当前工作目录 cwd()
 * @returns 查找到的项目根目录绝对路径，若未找到则返回当前目录
 */
export function findProjectRootSync(startDir: string = cwd()): string {
  let current = resolve(startDir);
  while (true) {
    if (
      existsSync(join(current, "deno.json")) ||
      existsSync(join(current, "deno.jsonc")) ||
      existsSync(join(current, "package.json"))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return resolve(startDir);
}

/**
 * deno.json 的 tasks 结构
 * 键为任务名（如 dev、build、dev:backend），值为执行的命令
 */
export interface DenoJsonTasks {
  [key: string]: string;
}

/**
 * deno.json 根结构
 * 包含 tasks 等字段，供项目结构检测使用
 */
export interface DenoJson {
  tasks?: DenoJsonTasks;
}

/**
 * 项目类型
 * - single: 单应用
 * - multi: 多应用（存在 dev:xxx、build:xxx 等任务）
 */
export type ProjectMode = "single" | "multi";

/**
 * 项目信息
 * 由 getProjectInfo 解析 deno.json 得到
 */
export interface ProjectInfo {
  /** 单应用或多应用 */
  mode: ProjectMode;
  /** 应用名称列表（多应用时为 backend、frontend 等；单应用为空数组） */
  appNames: string[];
  /** deno.json 中的 tasks */
  tasks: DenoJsonTasks;
}

/**
 * 从 deno.json 或 deno.jsonc 解析项目信息
 *
 * @param projectRoot 项目根目录（默认 cwd，支持子目录自动向上查找）
 * @returns 项目信息，若未找到配置文件或解析失败则返回 null
 */
export async function getProjectInfo(
  projectRoot: string = cwd(),
): Promise<ProjectInfo | null> {
  let root = resolve(projectRoot);
  let raw: string | null = null;

  // 1. 优先检查当前指定目录
  let candidatePath = join(root, "deno.json");
  try {
    raw = await readTextFile(candidatePath);
  } catch {
    candidatePath = join(root, "deno.jsonc");
    try {
      raw = await readTextFile(candidatePath);
    } catch {
      // 2. 若当前目录没有，向上递归查找项目根
      const foundRoot = await findProjectRoot(root);
      if (foundRoot !== root) {
        root = foundRoot;
        candidatePath = join(root, "deno.json");
        try {
          raw = await readTextFile(candidatePath);
        } catch {
          candidatePath = join(root, "deno.jsonc");
          try {
            raw = await readTextFile(candidatePath);
          } catch {
            return null;
          }
        }
      } else {
        return null;
      }
    }
  }

  if (!raw) return null;

  let data: DenoJson;
  try {
    data = JSON.parse(stripJsonComments(raw)) as DenoJson;
  } catch {
    return null;
  }

  const tasks = data.tasks ?? {};
  const devKeys = Object.keys(tasks).filter((k) =>
    k === "dev" || k.startsWith("dev:")
  );
  const buildKeys = Object.keys(tasks).filter((k) =>
    k === "build" || k.startsWith("build:")
  );
  const startKeys = Object.keys(tasks).filter((k) =>
    k === "start" || k.startsWith("start:")
  );

  // 多应用：存在 dev:xxx、build:xxx、start:xxx 形式
  const isMulti = devKeys.some((k) => k.startsWith("dev:")) ||
    buildKeys.some((k) => k.startsWith("build:")) ||
    startKeys.some((k) => k.startsWith("start:"));

  if (isMulti) {
    const appNames = new Set<string>();
    for (const k of [...devKeys, ...buildKeys, ...startKeys]) {
      const match = k.match(/^(?:dev|build|start):(.+)$/);
      if (match) appNames.add(match[1]);
    }
    return {
      mode: "multi",
      appNames: Array.from(appNames).sort(),
      tasks,
    };
  }

  // 单应用：存在 dev、build、start（无冒号）
  return {
    mode: "single",
    appNames: [],
    tasks,
  };
}
