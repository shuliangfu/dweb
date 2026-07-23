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
  IS_NODE,
  join,
  platform,
  remove,
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
 * 子进程 spawn 时使用的**可执行文件**路径。
 *
 * - **`bun test`（CI 常见仅装 Bun、PATH 无 `deno`）**：必须返回当前 **Bun**（`execPath()`），
 *   子进程为 `bun run …`，不可写死为 `deno`。
 * - **`deno test`**：用 `Deno.execPath()` 或回退为 `"deno"`，子进程为 `deno run -A …`。
 * - **Node（`node --import tsx`）**：返回当前 **Node**（`execPath()`），子进程为
 *   `node --import tsx <entry> …`（args 由 exampleRunArgs/exampleBuildArgs 构造）。
 */
export function getExampleChildProcessExecutable(): string {
  if (IS_BUN || IS_NODE) {
    return execPath();
  }
  const d = (globalThis as { Deno?: { execPath: () => string } }).Deno;
  if (d && typeof d.execPath === "function") {
    return d.execPath();
  }
  return "deno";
}

/**
 * 子进程里执行 `build` 的 argv：
 * - `bun`：`["run", entry, "--build"]`
 * - Node：`["--import", "tsx", entry, "--build"]`（无 `run`/`-A`，tsx 处理 TS）
 * - Deno：`["run", "-A", entry, "--build"]`
 *
 * @param entry - 相对 `cwd` 的入口，如 `src/main.ts` 或 `main.ts`（无 src 的 flat 示例）
 */
export function exampleBuildArgs(entry: string): string[] {
  if (IS_BUN) {
    return ["run", entry, "--build"];
  }
  if (IS_NODE) {
    return ["--import", "tsx", entry, "--build"];
  }
  return ["run", "-A", entry, "--build"];
}

/**
 * 子进程里执行 `dev` / 直接跑入口 的 argv：
 * - `bun`：`["run", entry]`
 * - Node：`["--import", "tsx", entry]`
 * - Deno：`["run", "-A", entry]`
 */
export function exampleRunArgs(entry: string): string[] {
  if (IS_BUN) {
    return ["run", entry];
  }
  if (IS_NODE) {
    return ["--import", "tsx", entry];
  }
  return ["run", "-A", entry];
}

/**
 * Bun workspace 安装会在示例目录下为 `react` / `preact` 等创建 `.bun` 链接，
 * 但本仓库本地 `@dreamer/dweb -> @dreamer/render` 仍从根 `node_modules/.deno`
 * 解析 renderer（react-dom / preact-render-to-string）。
 *
 * SSG 会在同一进程内同时加载页面组件与 renderer；若页面组件来自 `.bun/react`
 * 而 renderer 来自 `.deno/react-dom`，就会出现 React/Preact 双份实例导致的
 * “Invalid hook call” / `r.__H` 等 hook 错误。
 *
 * 因此 Bun 测试下删除示例局部 renderer 相关链接，让页面组件向上解析到 dweb 根
 * `node_modules` 中与 `@dreamer/render` 同源的依赖。这里不影响 Deno 测试。
 *
 * @param exampleDir 示例根目录（含 node_modules）
 */
async function removeExampleLocalRendererLinks(
  exampleDir: string,
): Promise<void> {
  if (!IS_BUN) {
    return;
  }
  const packages = [
    "react",
    "react-dom",
    "scheduler",
    "preact",
    "preact-render-to-string",
  ];
  for (const pkg of packages) {
    await remove(join(exampleDir, "node_modules", pkg), { recursive: true });
  }
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
    await removeExampleLocalRendererLinks(exampleDir);
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
  await removeExampleLocalRendererLinks(exampleDir);
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
