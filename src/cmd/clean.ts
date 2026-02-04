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

  info("正在清理构建产物...");

  for (const dir of CLEAN_DIRS) {
    const fullPath = join(projectRoot, dir);
    try {
      await stat(fullPath);
      await remove(fullPath, { recursive: true });
      info(`已删除: ${dir}`);
      removedCount++;
    } catch {
      // 目录不存在，忽略
    }
  }

  if (removedCount > 0) {
    success(`清理完成，已删除 ${removedCount} 个目录`);
  } else {
    info("无需清理，构建产物目录不存在");
  }
}
