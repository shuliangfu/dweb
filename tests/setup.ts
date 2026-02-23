/**
 * 测试前置初始化
 *
 * 在运行测试前初始化 dweb i18n（不挂全局），
 * 各模块通过 import { $tr } 使用框架翻译。
 *
 * 测试环境固定使用 zh-CN，确保错误消息断言与 locale 一致。
 *
 * 需在测试脚本中通过 `import "../setup.ts"` 或 `import "./setup.ts"` 导入。
 */
import { dirname, exists, platform, resolve } from "@dreamer/runtime-adapter";
import { setDwebLocale } from "../src/utils/i18n.ts";

/**
 * 从当前文件（setup.ts 在 tests/）解析 dweb 仓库根目录，
 * 不依赖 cwd()，避免多套件并行或顺序执行时 cwd 被上一套件改变导致路径错误。
 */
export function getRepoRoot(): string {
  const u = new URL(import.meta.url);
  let p = u.pathname;
  if (typeof p === "string" && p.length > 1 && /^\/[A-Za-z]:/.test(p)) {
    p = p.slice(1);
  }
  const fileDir = dirname(decodeURIComponent(p as string));
  return resolve(fileDir, "..");
}

/**
 * 子进程 spawn 时使用的 cwd。
 * Windows 上 Bun 需要反斜杠路径才能正确设置工作目录，否则构建可能写到错误目录。
 */
export function getSpawnCwd(dir: string): string {
  if (platform() === "windows") {
    return dir.replace(/\//g, "\\");
  }
  return dir;
}

/**
 * 检查路径是否存在（用于构建产物断言）。
 * Windows 上构建可能写出正斜杠或反斜杠路径，两种都尝试以便通过断言。
 */
export async function existsBuildOutput(path: string): Promise<boolean> {
  if (await exists(path)) return true;
  if (platform() === "windows") {
    return await exists(path.replace(/\//g, "\\"));
  }
  return false;
}

setDwebLocale("zh-CN");
