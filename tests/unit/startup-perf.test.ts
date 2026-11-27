/**
 * 官方示例 `examples/app-kinds/multi-web-api-console` 的启动性能预算。
 * 覆盖 `dweb-cli run` / `--list`、开发服务器听到端口并可请求、build、生产 start。
 * 阈值对 CI 机器噪声留有余量，但多秒级回归仍会失败。
 */

import "../setup.ts";
import {
  createCommand,
  exists,
  getEnv,
  getEnvAll,
  join,
  type SpawnedProcess,
} from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import {
  exampleBuildArgs,
  exampleRunArgs,
  getExampleChildProcessExecutable,
  getRepoRoot,
  getSpawnCwd,
  SKIP_WINDOWS_BUN_CHILD_PROCESS,
} from "../setup.ts";

const REPO_ROOT = getRepoRoot();
const EXAMPLE_DIR = join(
  REPO_ROOT,
  "examples",
  "app-kinds",
  "multi-web-api-console",
);
const CLI_ENTRY = join(REPO_ROOT, "src", "cli.ts");
const WEB_ENTRY = "web/main.ts";
const WEB_PORT = 3410;

const IN_CI = Boolean(getEnv("CI") || getEnv("GITHUB_ACTIONS"));
/** CI 上放宽；本地也避免贴着实测值导致偶发抖动。 */
const CLI_BUDGET_MS = IN_CI ? 15_000 : 8_000;
const DEV_BUDGET_MS = IN_CI ? 30_000 : 15_000;
const BUILD_BUDGET_MS = IN_CI ? 30_000 : 15_000;
const START_BUDGET_MS = IN_CI ? 20_000 : 10_000;

function nowMs(): number {
  return Date.now();
}

function assertBudget(ms: number, budget: number, label: string): void {
  if (ms >= budget) {
    throw new Error(`${label} took ${ms}ms, budget ${budget}ms`);
  }
  expect(ms).toBeLessThan(budget);
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

async function collectText(
  stream: ReadableStream<Uint8Array> | null,
): Promise<string> {
  if (!stream) return "";
  return await new Response(stream).text();
}

async function runCli(
  args: string[],
): Promise<{ code: number; ms: number; out: string }> {
  const exe = getExampleChildProcessExecutable();
  const cmd = createCommand(exe, {
    args: [...exampleRunArgs(CLI_ENTRY), ...args],
    cwd: getSpawnCwd(EXAMPLE_DIR),
    env: { ...getEnvAll() },
    stdout: "piped",
    stderr: "piped",
  });
  const started = nowMs();
  const child = cmd.spawn();
  const [status, stdout, stderr] = await Promise.all([
    child.status,
    collectText(child.stdout ?? null),
    collectText(child.stderr ?? null),
  ]);
  return {
    code: status.code ?? 1,
    ms: nowMs() - started,
    out: `${stdout}\n${stderr}`,
  };
}

function parseListenPort(text: string, fallback: number): number {
  const m = text.match(
    /(?:Production|Dev) server running at https?:\/\/127\.0\.0\.1:(\d+)/i,
  );
  if (m) return Number(m[1]);
  const zh = text.match(
    /(?:开发|生产)服务器运行在 https?:\/\/127\.0\.0\.1:(\d+)/,
  );
  if (zh) return Number(zh[1]);
  return fallback;
}

async function portBusy(port: number): Promise<boolean> {
  try {
    const resp = await fetch(`http://127.0.0.1:${port}/`, {
      signal: AbortSignal.timeout(300),
    });
    await resp.arrayBuffer();
    return true;
  } catch {
    return false;
  }
}

async function waitListenAndRequest(options: {
  args: string[];
  env?: Record<string, string>;
  port: number;
  path: string;
  budgetMs: number;
}): Promise<{ listenMs: number; requestMs: number; status: number }> {
  const exe = getExampleChildProcessExecutable();
  const cmd = createCommand(exe, {
    args: options.args,
    cwd: getSpawnCwd(EXAMPLE_DIR),
    env: { ...getEnvAll(), ...options.env },
    stdout: "piped",
    stderr: "piped",
  });
  const child = cmd.spawn();
  let stdoutBuf = "";
  let stderrBuf = "";
  const collect = async (
    stream: ReadableStream<Uint8Array> | null,
    into: (chunk: string) => void,
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

  const t0 = nowMs();
  const deadline = t0 + options.budgetMs;
  let listenMs: number | undefined;
  let listenPort = options.port;
  let lastErr = "";
  try {
    // Do not wait for listen-log text: the default i18n logger may not
    // flush "server running at" to a piped stdout. Poll the port instead.
    while (nowMs() < deadline) {
      const text = `${stdoutBuf}\n${stderrBuf}`;
      if (/server running at|服务器运行在|stage=server_listen/.test(text)) {
        listenPort = parseListenPort(text, options.port);
        if (listenMs == null) listenMs = nowMs() - t0;
      }
      try {
        const resp = await fetch(
          `http://127.0.0.1:${listenPort}${options.path}`,
          { signal: AbortSignal.timeout(500) },
        );
        await resp.arrayBuffer();
        const requestMs = nowMs() - t0;
        if (listenMs == null) listenMs = requestMs;
        assertBudget(listenMs, options.budgetMs, "listen");
        assertBudget(requestMs, options.budgetMs, "first request");
        return { listenMs, requestMs, status: resp.status };
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
      }
      const status = await Promise.race([
        child.status.then((s) => s),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 50)),
      ]);
      if (status) {
        throw new Error(
          `process exited ${status.code} before ready.\nstdout:\n${stdoutBuf}\nstderr:\n${stderrBuf}\nlast=${lastErr}`,
        );
      }
    }
    throw new Error(
      `timed out waiting for listen/request (${options.budgetMs}ms). last=${lastErr}\n${
        (stdoutBuf + stderrBuf).slice(-2000)
      }`,
    );
  } finally {
    await killChild(child);
    await Promise.allSettled([stdoutTask, stderrTask]);
  }
}

describe("startup performance (official multi-web-api-console example)", () => {
  it("dweb-cli run --list 应在预算内退出并列出 host 与插件命令", async () => {
    const result = await runCli(["run", "--list", "-a", "console"]);
    if (result.code !== 0) {
      throw new Error(`run --list failed (${result.code}):\n${result.out}`);
    }
    expect(result.code).toBe(0);
    expect(result.out).toMatch(/team\/hello/);
    expect(result.out).toMatch(/staff\/hello/);
    expect(result.out).toMatch(/whoami/);
    assertBudget(result.ms, CLI_BUDGET_MS, "run --list");
  });

  it("dweb-cli run team/hello 应在预算内完成命令体", async () => {
    const result = await runCli([
      "run",
      "team/hello",
      "--name",
      "张三",
      "-a",
      "console",
    ]);
    if (result.code !== 0) {
      throw new Error(`run team/hello failed (${result.code}):\n${result.out}`);
    }
    expect(result.code).toBe(0);
    expect(result.out).toMatch(/张三/);
    assertBudget(result.ms, CLI_BUDGET_MS, "run team/hello");
  });

  it.skipIf(
    SKIP_WINDOWS_BUN_CHILD_PROCESS,
    "web --build 应在预算内完成并写出 server.js",
    async () => {
      const exe = getExampleChildProcessExecutable();
      const cmd = createCommand(exe, {
        args: exampleBuildArgs(WEB_ENTRY),
        cwd: getSpawnCwd(EXAMPLE_DIR),
        env: { ...getEnvAll(), RUNTIME_ENV: "build" },
        stdout: "piped",
        stderr: "piped",
      });
      const started = nowMs();
      const child = cmd.spawn();
      const [status, stdout, stderr] = await Promise.all([
        child.status,
        collectText(child.stdout ?? null),
        collectText(child.stderr ?? null),
      ]);
      const ms = nowMs() - started;
      const out = `${stdout}\n${stderr}`;
      if (!status.success) {
        throw new Error(`web --build failed (${status.code}):\n${out}`);
      }
      expect(status.success).toBe(true);
      expect(await exists(join(EXAMPLE_DIR, "dist", "web", "server.js"))).toBe(
        true,
      );
      assertBudget(ms, BUILD_BUDGET_MS, "web --build");
    },
  );

  it.skipIf(
    SKIP_WINDOWS_BUN_CHILD_PROCESS,
    "web --start 应在预算内听口并响应 GET /",
    async () => {
      const serverJs = join(EXAMPLE_DIR, "dist", "web", "server.js");
      if (!(await exists(serverJs))) {
        throw new Error(
          "dist/web/server.js missing; build test should run first",
        );
      }
      if (await portBusy(WEB_PORT)) {
        throw new Error(
          `port ${WEB_PORT} already in use; not killing unrelated processes`,
        );
      }
      const started = await waitListenAndRequest({
        args: [...exampleRunArgs("dist/web/server.js"), "--start"],
        env: { RUNTIME_ENV: "start" },
        port: WEB_PORT,
        path: "/",
        budgetMs: START_BUDGET_MS,
      });
      expect(started.status).toBeGreaterThanOrEqual(200);
      expect(started.status).toBeLessThan(500);
    },
  );

  it.skipIf(
    SKIP_WINDOWS_BUN_CHILD_PROCESS,
    "web --dev 应在预算内听口并响应 GET /",
    async () => {
      if (await portBusy(WEB_PORT)) {
        throw new Error(
          `port ${WEB_PORT} already in use; not killing unrelated processes`,
        );
      }
      const started = await waitListenAndRequest({
        args: [...exampleRunArgs(WEB_ENTRY), "--dev"],
        env: { RUNTIME_ENV: "dev" },
        port: WEB_PORT,
        path: "/",
        budgetMs: DEV_BUDGET_MS,
      });
      expect(started.status).toBeGreaterThanOrEqual(200);
      expect(started.status).toBeLessThan(500);
    },
  );
});
