/**
 * dweb clean 命令
 *
 * 职责：
 * - 清理构建产物和缓存
 * - 删除 dist、.cache、node_modules/.cache 等目录
 *
 * 运行方式：
 * - dweb clean
 */

import { info, success } from "@dreamer/console";
import { cwd, join, remove, stat } from "@dreamer/runtime-adapter";
import { $tr } from "../utils/i18n.ts";
import type { ParsedOptions } from "../feature/command.ts";

/** 要清理的目录列表（相对于项目根） */
const CLEAN_DIRS = ["dist", ".cache", "node_modules/.cache", ".esbuild"];

/**
 * clean 命令主入口
 *
 * @param _args 命令行参数（未使用）
 * @param _options 解析后的选项（未使用）
 */
export async function main(
  _args: string[],
  _options: ParsedOptions,
): Promise<void> {
  const projectRoot = cwd();
  let removedCount = 0;

  info($tr("clean.running"));

  for (const dir of CLEAN_DIRS) {
    const fullPath = join(projectRoot, dir);
    try {
      await stat(fullPath);
      await remove(fullPath, { recursive: true });
      info($tr("clean.removed", { dir }));
      removedCount++;
    } catch {
      // 目录不存在，忽略
    }
  }

  if (removedCount > 0) {
    success($tr("clean.complete", { count: String(removedCount) }));
  } else {
    info($tr("clean.nothingToClean"));
  }
}
