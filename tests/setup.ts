/**
 * 测试前置初始化
 *
 * 在运行测试前初始化 dweb i18n，将 $t 挂载到 globalThis，
 * 使各模块可直接使用 $t("key") 而无需显式导入。
 *
 * 测试环境固定使用 zh-CN，确保错误消息断言与 locale 一致。
 *
 * 需在测试脚本中通过 `import "../setup.ts"` 或 `import "./setup.ts"` 导入。
 */
import { dirname, resolve } from "@dreamer/runtime-adapter";
import { initDwebI18n, setDwebLocale } from "../src/utils/i18n.ts";

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

setDwebLocale("zh-CN");
await initDwebI18n();
