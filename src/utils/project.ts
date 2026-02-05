/**
 * 项目结构检测工具
 *
 * 职责：
 * - 从 deno.json 解析 tasks，判断单应用/多应用
 * - 提取应用列表（多应用时）
 * - 供 dev/build/start 命令使用
 */

import { cwd, join, readTextFile, stat } from "@dreamer/runtime-adapter";

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
 * 从 deno.json 解析项目信息
 *
 * @param projectRoot 项目根目录（默认 cwd）
 * @returns 项目信息，若 deno.json 不存在或解析失败则返回 null
 */
export async function getProjectInfo(
  projectRoot: string = cwd(),
): Promise<ProjectInfo | null> {
  const denoJsonPath = join(projectRoot, "deno.json");
  try {
    await stat(denoJsonPath);
  } catch {
    return null;
  }

  let raw: string;
  try {
    raw = await readTextFile(denoJsonPath);
  } catch {
    return null;
  }

  let data: DenoJson;
  try {
    data = JSON.parse(raw) as DenoJson;
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
