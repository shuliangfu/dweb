/**
 * integration: 纯 API（kind=api）运行时
 *
 * 1) 手写 fixture：进程内 App.start，GET/POST /hello → JSON（无 HTML）
 * 2) init generate：脚手架生成后子进程起服，同样验证
 *
 * 临时目录落在 tests/data/dweb-integration-*（workspace 成员）。
 * 起服后必须用 Server.port（实际监听端口），因占用时会自动 +1。
 */

import "../setup.ts";
import {
  chdir,
  createCommand,
  cwd,
  ensureDir,
  exists,
  getEnvAll,
  join,
  makeTempDir,
  readTextFile,
  remove,
  resolve,
  setEnv,
  type SpawnedProcess,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { generate } from "../../src/cmd/init/generate.ts";
import type { InitOptions } from "../../src/cmd/init/types.ts";
import { App } from "../../src/core/app.ts";
import { getServer } from "../../src/feature/server.ts";
import {
  exampleRunArgs,
  getExampleChildProcessExecutable,
  getRepoRoot,
  getSpawnCwd,
} from "../setup.ts";

const REPO_ROOT = getRepoRoot();

/** fixture 首选端口（占用时 Server 会自动换端口，测试读 actual port） */
const FIXTURE_PORT = 39992;
/** init 子进程端口（写入生成的 main.*.ts，避免与 fixture 冲突） */
const INIT_PORT = 39991;

function resolveImportMapEntryForTempProject(
  spec: string,
  denoJsonDir: string,
): string {
  if (
    spec.startsWith("npm:") ||
    spec.startsWith("jsr:") ||
    spec.startsWith("http://") ||
    spec.startsWith("https://") ||
    spec.startsWith("file:")
  ) {
    return spec;
  }
  if (spec.startsWith(".")) {
    const absPath = resolve(denoJsonDir, spec).replace(/\\/g, "/");
    return absPath.startsWith("/") ? `file://${absPath}` : `file:///${absPath}`;
  }
  return spec;
}

function toFileUrl(absPath: string): string {
  const normalized = absPath.replace(/\\/g, "/");
  return normalized.startsWith("/")
    ? `file://${normalized}`
    : `file:///${normalized}`;
}

async function writeLocalDenoJson(testDir: string): Promise<void> {
  const repoDenoJson = JSON.parse(
    await readTextFile(join(REPO_ROOT, "deno.json")),
  ) as { imports?: Record<string, string> };
  const resolvedImports: Record<string, string> = {};
  for (const [key, val] of Object.entries(repoDenoJson.imports ?? {})) {
    if (typeof val === "string") {
      resolvedImports[key] = resolveImportMapEntryForTempProject(
        val,
        REPO_ROOT,
      );
    }
  }
  resolvedImports["@dreamer/dweb"] = toFileUrl(
    join(REPO_ROOT, "src", "mod.ts"),
  );
  resolvedImports["@dreamer/router"] = toFileUrl(
    join(REPO_ROOT, "..", "router", "src", "mod.ts"),
  );
  // 刚发版的 JSR 包会被 Deno 默认 minimumDependencyAge 挡住，导致 import @dreamer/dweb
  // 解析失败 → 配置加载为空 → kind 丢失 → api 缺 _app。本地源 + age=0 双保险。
  resolvedImports["@dreamer/render"] = toFileUrl(
    join(REPO_ROOT, "..", "render", "src", "mod.ts"),
  );
  await writeTextFile(
    join(testDir, "deno.json"),
    JSON.stringify({
      imports: resolvedImports,
      minimumDependencyAge: 0,
    }, null, 2),
  );
}

async function waitForOkJson(
  url: string,
  opts?: { method?: string; body?: string; timeoutMs?: number },
): Promise<{ status: number; json: Record<string, unknown>; raw: string }> {
  const timeoutMs = opts?.timeoutMs ?? 35_000;
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 400));
    try {
      const res = await fetch(url, {
        method: opts?.method ?? "GET",
        headers: opts?.body
          ? { "content-type": "application/json" }
          : undefined,
        body: opts?.body,
      });
      const raw = await res.text();
      if (res.ok) {
        let json: Record<string, unknown> = {};
        try {
          json = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          // keep empty
        }
        return { status: res.status, json, raw };
      }
      lastErr = new Error(`HTTP ${res.status}: ${raw.slice(0, 200)}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `${timeoutMs}ms 内未就绪: ${url}. ` +
      (lastErr instanceof Error ? lastErr.message : String(lastErr)),
  );
}

async function stopChild(child: SpawnedProcess | null): Promise<void> {
  if (!child) return;
  try {
    child.kill(15);
    await child.status;
  } catch {
    // ignore
  }
}

describe("integration: api kind — 手写 fixture（进程内）", () => {
  let testDir: string;
  let originalCwd: string;
  let app: App | null = null;

  beforeAll(async () => {
    const dataParent = join(REPO_ROOT, "tests", "data");
    await ensureDir(dataParent);
    testDir = await makeTempDir({
      prefix: "dweb-integration-api-fixture-",
      dir: dataParent,
    });
    originalCwd = cwd();
    await ensureDir(join(testDir, "src", "routes"));
    await writeTextFile(
      join(testDir, "src", "routes", "hello.ts"),
      `import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

export async function GET(_ctx: ApiContext) {
  return json({ message: "Hello API" });
}

export async function POST(ctx: ApiContext) {
  const body = (ctx.body as Record<string, unknown> | undefined) ??
    await ctx.req.json().catch(() => ({}));
  return json({ message: "created", data: body });
}
`,
    );
  });

  afterAll(async () => {
    if (app) {
      try {
        await app.stop();
      } catch {
        // ignore
      }
      app = null;
    }
    if (originalCwd) chdir(originalCwd);
    if (testDir && (await exists(testDir))) {
      await remove(testDir, { recursive: true });
    }
  });

  it("应起服并返回 GET/POST /hello JSON（无 HTML 壳）", async () => {
    chdir(testDir);
    setEnv("RUNTIME_ENV", "start");

    app = new App({
      name: "api-fixture",
      kind: "api",
      version: "1.0.0",
      server: { port: FIXTURE_PORT, host: "127.0.0.1" },
      router: { routesDir: "./src/routes" },
      logger: {
        level: "warn",
        format: "text",
        output: { console: "auto" },
      },
    });
    await app.start();
    const port = getServer(app.container).port;
    const base = `http://127.0.0.1:${port}`;

    const getRes = await fetch(`${base}/hello`);
    const getRaw = await getRes.text();
    expect(getRes.status).toBe(200);
    expect(JSON.parse(getRaw).message).toBe("Hello API");
    expect(getRaw).not.toMatch(/<!DOCTYPE|<html/i);

    const postRes = await fetch(`${base}/hello`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "dweb" }),
    });
    const postRaw = await postRes.text();
    expect(postRes.status).toBe(200);
    const postJson = JSON.parse(postRaw) as {
      message: string;
      data: { name: string };
    };
    expect(postJson.message).toBe("created");
    expect(postJson.data.name).toBe("dweb");
    expect(postRaw).not.toMatch(/<!DOCTYPE|<html/i);

    await app.stop();
    app = null;
  }, {
    timeout: 60_000,
    sanitizeOps: false,
    sanitizeResources: false,
  });
});

describe("integration: api kind — init generate（子进程）", () => {
  let testDir: string;
  let parentDir: string;
  let originalCwd: string;
  let child: SpawnedProcess | null = null;

  beforeAll(async () => {
    const dataParent = join(REPO_ROOT, "tests", "data");
    await ensureDir(dataParent);
    // 父目录仅作容器；targetDir 必须尚不存在，否则 generate 会 confirm 覆盖
    parentDir = await makeTempDir({
      prefix: "dweb-api-init-parent-",
      dir: dataParent,
    });
    const stamp = String(Date.now());
    testDir = join(dataParent, `dweb-integration-api-init-${stamp}`);
    originalCwd = cwd();

    const opts: InitOptions = {
      targetDir: testDir,
      projectName: "api-app",
      appMode: "single",
      kind: "api",
      apps: [{ name: "api-app", kind: "api" }],
      runtime: "deno",
      engine: "view",
      renderMode: "hybrid",
      style: "none",
      useSrc: true,
      exampleLevel: "minimal",
    };
    await generate(opts);
    await writeLocalDenoJson(testDir);

    for (const name of ["main.dev.ts", "main.prod.ts"]) {
      const p = join(testDir, "src", "config", name);
      if (await exists(p)) {
        let text = await readTextFile(p);
        text = text.replace(/port:\s*\d+/, `port: ${INIT_PORT}`);
        // 子进程固定本机，避免 0.0.0.0 在部分环境上的差异
        text = text.replace(/host:\s*"[^"]+"/, 'host: "127.0.0.1"');
        await writeTextFile(p, text);
      }
    }

    expect(await exists(join(testDir, "src", "routes", "hello.ts"))).toBe(
      true,
    );
    expect(await exists(join(testDir, "src", "routes", "_app.tsx"))).toBe(
      false,
    );
  });

  afterAll(async () => {
    await stopChild(child);
    child = null;
    if (originalCwd) chdir(originalCwd);
    if (testDir && (await exists(testDir))) {
      await remove(testDir, { recursive: true });
    }
    if (parentDir && (await exists(parentDir))) {
      await remove(parentDir, { recursive: true });
    }
  });

  it("init 生成的 API 项目 GET/POST /hello 应返回 JSON", async () => {
    chdir(testDir);
    const env = {
      ...getEnvAll(),
      PORT: String(INIT_PORT),
      RUNTIME_ENV: "start",
    };

    const cmd = createCommand(getExampleChildProcessExecutable(), {
      args: exampleRunArgs("src/main.ts"),
      cwd: getSpawnCwd(testDir),
      env,
      stdout: "inherit",
      stderr: "inherit",
    });
    child = cmd.spawn();

    const getRes = await waitForOkJson(`http://127.0.0.1:${INIT_PORT}/hello`);
    expect(getRes.status).toBe(200);
    expect(typeof getRes.json.message).toBe("string");
    expect(getRes.raw).not.toMatch(/<!DOCTYPE|<html/i);

    const postRes = await waitForOkJson(`http://127.0.0.1:${INIT_PORT}/hello`, {
      method: "POST",
      body: JSON.stringify({ from: "init" }),
    });
    expect(postRes.status).toBe(200);
    expect(typeof postRes.json.message).toBe("string");
    expect(postRes.json.data).toEqual({ from: "init" });

    await stopChild(child);
    child = null;
  }, {
    timeout: 90_000,
    sanitizeOps: false,
    sanitizeResources: false,
  });
});
