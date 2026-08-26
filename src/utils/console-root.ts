/**
 * Console 应用根目录解析
 *
 * - 单应用 kind=console：项目根（或 src/）即 console 根
 * - 多应用：默认 `{prefix}console/`（一项目至多一个）
 */

import { cwd, exists, join } from "@dreamer/runtime-adapter";
import { getProjectInfo } from "./project.ts";

export interface ResolveConsoleRootOptions {
  /** 多应用时的应用目录名，默认 `console` */
  app?: string;
  /** 显式覆盖 console 根（绝对或相对项目根） */
  consoleDir?: string;
}

/**
 * 检测项目是否使用 src/ 布局
 */
export async function detectUseSrc(projectRoot: string): Promise<boolean> {
  return await exists(join(projectRoot, "src"));
}

/**
 * 解析 Console 应用根目录
 *
 * @throws 多应用下找不到 console 目录时抛出 Error
 */
export async function resolveConsoleRoot(
  projectRoot: string = cwd(),
  options: ResolveConsoleRootOptions = {},
): Promise<string> {
  if (options.consoleDir) {
    const explicit = options.consoleDir.startsWith("/") ||
        /^[A-Za-z]:[\\/]/.test(options.consoleDir)
      ? options.consoleDir
      : join(projectRoot, options.consoleDir);
    return explicit;
  }

  const useSrc = await detectUseSrc(projectRoot);
  const base = useSrc ? join(projectRoot, "src") : projectRoot;
  const info = await getProjectInfo(projectRoot);

  if (!info || info.mode === "single") {
    return base;
  }

  const app = options.app ?? "console";
  const root = join(base, app);
  if (
    await exists(join(root, "routes")) ||
    await exists(join(root, "config"))
  ) {
    return root;
  }

  throw new Error(
    `Console app directory not found: ${root} (expected routes/ or config/). ` +
      `Init a multi-app project with kind=console, or pass -a <name>.`,
  );
}
