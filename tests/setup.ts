/**
 * 测试前置初始化
 *
 * 在运行测试前初始化 dweb i18n（不挂全局），
 * 各模块通过 import { $tr } 使用框架翻译。
 *
 * 测试环境固定使用 en-US，并设置 LANGUAGE 环境变量，确保错误消息断言与 locale 一致。
 *
 * 需在测试脚本中通过 `import "../setup.ts"` 或 `import "./setup.ts"` 导入。
 */
import {
  createCommand,
  cwd,
  dirname,
  execPath,
  exists,
  IS_BUN,
  join,
  platform,
  resolve,
  setEnv,
} from "@dreamer/runtime-adapter";
import { setDwebLocale } from "../src/utils/i18n.ts";

setEnv("LANGUAGE", "en-US");
setDwebLocale("en-US");

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
 * 子进程 spawn 时使用的 cwd（对传入路径做 Windows 反斜杠规范化）。
 * Windows 上 Bun 需要反斜杠路径才能正确设置工作目录，否则构建可能写到错误目录。
 */
export function getSpawnCwd(dir: string): string {
  if (platform() === "windows") {
    return dir.replace(/\//g, "\\");
  }
  return dir;
}

/**
 * 集成/e2e 中 spawn 子进程时使用的 **Deno 可执行文件**路径。
 *
 * 在 dweb 仓库中同时存在 Bun 的 `node_modules/.bun` 与 Deno 的 `node_modules/.deno` 时，若
 * 用 `bun run` 启动示例，用户侧 `react` / `preact` 与渲染链中的
 * `react-dom` / `preact-render-to-string` 等可能解到**不同物理副本**，
 * 出现 `Invalid hook call`、Preact `r.__H` 等。子进程复用与 `deno test` 相同的
 * **Deno** + 示例内 `deno.json`，可保证单一依赖图。
 *
 * 在 `deno test` 下复用 `Deno.execPath()`；否则从 PATH 解析 `deno`（须已安装并可用）。
 *
 * @returns 绝对路径，或当无法取得当前解释器路径时为 `"deno"`
 */
export function getDenoExecutableForExamples(): string {
  const d = (globalThis as { Deno?: { execPath: () => string } }).Deno;
  if (d && typeof d.execPath === "function") {
    return d.execPath();
  }
  return "deno";
}

/**
 * 在 **Bun** 下为示例目录安装 `node_modules`（`package.json` 中
 * `"@dreamer/dweb": "file:../../.."` 等需解析到磁盘路径）。
 * **Deno** 下示例通过 `deno.json` 的 `imports` 直链 `../../../src/mod.ts`，无需本步骤。
 *
 * 未执行时集成/e2e 子进程会报 `ENOENT .../node_modules/@dreamer/dweb`。
 * 若已存在已链接的 `@dreamer/dweb` 则立即返回，不重复 `bun install`。
 *
 * @param exampleDir 示例根目录（含 `package.json`）
 */
export async function ensureExampleDependenciesInstalled(
  exampleDir: string,
): Promise<void> {
  if (!IS_BUN) {
    return;
  }
  const marker = join(exampleDir, "node_modules", "@dreamer", "dweb");
  if (await exists(marker)) {
    return;
  }
  const cmd = createCommand(execPath(), {
    args: ["install"],
    cwd: getSpawnCwd(exampleDir),
    stdout: "piped",
    stderr: "piped",
  });
  const proc = cmd.spawn();
  const [status, stderrText] = await Promise.all([
    proc.status,
    proc.stderr ? new Response(proc.stderr).text() : Promise.resolve(""),
  ]);
  if (!status.success) {
    throw new Error(
      `bun install failed in ${exampleDir}: ${stderrText || "(no stderr)"}`,
    );
  }
}

/**
 * 集成测试中 spawn 子进程时应使用的 cwd。
 * 使用当前进程 cwd()（beforeAll 已 chdir 到 exampleDir），
 * 避免 Windows Bun 下传入由 getRepoRoot() 推导的路径时 spawn 未正确应用 cwd，导致构建写到错误目录。
 */
export function getSpawnCwdForIntegration(): string {
  return getSpawnCwd(cwd());
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
