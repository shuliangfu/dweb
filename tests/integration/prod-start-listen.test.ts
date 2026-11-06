/**
 * 集成测试：生产 `dist/server.js` 启动必须听口
 *
 * 回归：生产 bundle 在 i18n 顶层 await 下，静态环会变成 TLA 死锁
 * （`Top-level await promise never resolved`，`deno task start` 秒退）。
 * 已拆：builder⇄middleware 再导出、config-loader→config-infer（经 config）、
 * App⇄routes-middleware（getApp 值导入）。本测对 hybrid 示例 build→start，
 * 断言端口可连后杀进程。
 *
 * 端口与 e2e（39995 等）及 DIG（18765–18767）错开。
 */

import "../setup.ts";
import {
  chdir,
  createCommand,
  cwd,
  exists,
  getEnvAll,
  IS_BUN,
  IS_NODE,
  join,
  remove,
  type SpawnedProcess,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import {
  ensureExampleDependenciesInstalled,
  exampleBuildArgs,
  existsBuildOutput,
  getExampleChildProcessExecutable,
  getRepoRoot,
  getSpawnCwdForIntegration,
  resolveExampleEntry,
  SKIP_WINDOWS_BUN_CHILD_PROCESS,
} from "../setup.ts";

const REPO_ROOT = getRepoRoot();

/** view-hybrid / preact-hybrid 生产 start 专用口，避免与 e2e／其它 integration 冲突 */
const VIEW_HYBRID_START_PORT = 39811;
const PREACT_HYBRID_START_PORT = 39812;

function exampleProdStartArgs(serverJsRel: string): string[] {
  // Deno：`deno run -A dist/server.js --start`；Bun：`bun run dist/server.js`
  // （与各示例 deno.json / package.json 的 start task 对齐）
  if (IS_BUN) {
    return ["run", serverJsRel];
  }
  if (IS_NODE) {
    return [serverJsRel];
  }
  return ["run", "-A", serverJsRel, "--start"];
}

async function killChild(child: SpawnedProcess | null): Promise<void> {
  if (!child) return;
  try {
    child.kill(15);
    await child.status;
  } catch {
    try {
      child.kill(9);
    } catch {
      // ignore
    }
  }
}

async function buildExample(exampleDir: string): Promise<void> {
  const distDir = join(exampleDir, "dist");
  if (await exists(distDir)) {
    await remove(distDir, { recursive: true });
  }
  const cmd = createCommand(getExampleChildProcessExecutable(), {
    args: exampleBuildArgs(resolveExampleEntry(exampleDir, "src/main.ts")),
    cwd: getSpawnCwdForIntegration(exampleDir),
    stdout: "piped",
    stderr: "piped",
  });
  const proc = cmd.spawn();
  const [status, stdoutText, stderrText] = await Promise.all([
    proc.status,
    proc.stdout ? new Response(proc.stdout).text() : Promise.resolve(""),
    proc.stderr ? new Response(proc.stderr).text() : Promise.resolve(""),
  ]);
  if (!status.success) {
    throw new Error(
      `build 失败: ${stderrText || "(no stderr)"}\nstdout: ${
        stdoutText || "(empty)"
      }`,
    );
  }
  const serverJs = join(exampleDir, "dist", "server.js");
  if (!(await existsBuildOutput(serverJs))) {
    throw new Error(
      `build 退出 0 但缺少 ${serverJs}。stderr: ${stderrText || "(empty)"}`,
    );
  }
}

async function assertProdStartListens(
  exampleDir: string,
  port: number,
): Promise<void> {
  const env = { ...getEnvAll(), PORT: String(port) };
  const cmd = createCommand(getExampleChildProcessExecutable(), {
    args: exampleProdStartArgs("dist/server.js"),
    cwd: getSpawnCwdForIntegration(exampleDir),
    env,
    stdout: "piped",
    stderr: "piped",
  });
  const child = cmd.spawn();
  let stdoutBuf = "";
  let stderrBuf = "";
  const collect = async (
    stream: ReadableStream<Uint8Array> | null,
    into: (s: string) => void,
  ) => {
    if (!stream) return;
    const reader = stream.getReader();
    const dec = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        into(dec.decode(value, { stream: true }));
      }
    } catch {
      // ignore
    }
  };
  const stdoutTask = collect(child.stdout ?? null, (s) => {
    stdoutBuf += s;
  });
  const stderrTask = collect(child.stderr ?? null, (s) => {
    stderrBuf += s;
  });

  const pollIntervalMs = 400;
  const maxWaitMs = 25000;
  const deadline = Date.now() + maxWaitMs;
  let lastErr: unknown;
  let ready = false;
  try {
    while (Date.now() < deadline) {
      // 子进程若因 TLA 秒退，尽早失败
      const early = await Promise.race([
        child.status.then((st) => st),
        new Promise<null>((r) => setTimeout(() => r(null), pollIntervalMs)),
      ]);
      if (early && !early.success) {
        await Promise.all([stdoutTask, stderrTask]);
        throw new Error(
          `生产 start 提前退出 code=${early.code}。` +
            `若含 Top-level await promise never resolved 则为 TLA 回归。\n` +
            `stderr: ${stderrBuf || "(empty)"}\nstdout: ${
              stdoutBuf || "(empty)"
            }`,
        );
      }
      try {
        const res = await fetch(`http://127.0.0.1:${port}/`);
        if (res.ok) {
          const html = await res.text();
          if (html.length > 50) {
            expect(res.ok).toBe(true);
            ready = true;
            break;
          }
        }
      } catch (e) {
        lastErr = e;
      }
    }
    if (!ready) {
      throw new Error(
        `生产 start ${maxWaitMs}ms 内未听口 http://127.0.0.1:${port}/。` +
          (lastErr instanceof Error ? lastErr.message : String(lastErr)) +
          `\nstderr: ${stderrBuf || "(empty)"}\nstdout: ${
            stdoutBuf || "(empty)"
          }`,
      );
    }
  } finally {
    await killChild(child);
    await Promise.all([stdoutTask, stderrTask]).catch(() => {});
  }
}

describe("integration: 生产 start 听口（TLA 回归）", () => {
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = cwd();
  });

  afterAll(() => {
    chdir(originalCwd);
  });

  it.skipIf(
    SKIP_WINDOWS_BUN_CHILD_PROCESS,
    "view-hybrid/basic：build 后 dist/server.js --start 应听口可连",
    async () => {
      const exampleDir = join(REPO_ROOT, "examples", "view-hybrid", "basic");
      await ensureExampleDependenciesInstalled(exampleDir);
      chdir(exampleDir);
      await buildExample(exampleDir);
      await assertProdStartListens(exampleDir, VIEW_HYBRID_START_PORT);
    },
    { sanitizeOps: false, sanitizeResources: false, timeout: 120000 },
  );

  it.skipIf(
    SKIP_WINDOWS_BUN_CHILD_PROCESS,
    "preact-hybrid/basic：build 后 dist/server.js --start 应听口可连",
    async () => {
      const exampleDir = join(REPO_ROOT, "examples", "preact-hybrid", "basic");
      await ensureExampleDependenciesInstalled(exampleDir);
      chdir(exampleDir);
      await buildExample(exampleDir);
      await assertProdStartListens(exampleDir, PREACT_HYBRID_START_PORT);
    },
    { sanitizeOps: false, sanitizeResources: false, timeout: 120000 },
  );
});
