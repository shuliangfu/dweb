/**
 * integration: Console（kind=console）运行时
 *
 * 1) 手写 fixture：进程内 App console 模式 + invoke hello/world + shutdown（防挂死）
 * 2) init generate：子进程 `dweb-cli run hello/world`，断言退出码 0、输出、进程退出
 *
 * 临时目录落在 tests/data/dweb-integration-*（workspace 成员）。
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
import { getConfig } from "../../src/core/config.ts";
import { createConsoleContext } from "../../src/feature/console-context.ts";
import {
  invokeConsoleAction,
  resolveConsoleRoute,
} from "../../src/feature/console-router.ts";
import { isConsoleKind } from "../../src/types/app.ts";
import {
  exampleRunArgs,
  getExampleChildProcessExecutable,
  getRepoRoot,
  getSpawnCwd,
} from "../setup.ts";

const REPO_ROOT = getRepoRoot();

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
  // Only pin @dreamer/dweb to this checkout. Use jsr: for router/render/… (not
  // monorepo file: siblings) so CI matches published dependency resolution.
  resolvedImports["@dreamer/dweb"] = toFileUrl(
    join(REPO_ROOT, "src", "mod.ts"),
  );
  await writeTextFile(
    join(testDir, "deno.json"),
    JSON.stringify(
      {
        imports: resolvedImports,
        minimumDependencyAge: 0,
      },
      null,
      2,
    ),
  );
}

async function readStream(
  stream: ReadableStream<Uint8Array> | null,
): Promise<string> {
  if (!stream) return "";
  return await new Response(stream).text();
}

describe("integration: console kind — 手写 fixture（进程内）", () => {
  let testDir: string;
  let originalCwd: string;
  let app: App | null = null;

  beforeAll(async () => {
    const dataParent = join(REPO_ROOT, "tests", "data");
    await ensureDir(dataParent);
    testDir = await makeTempDir({
      prefix: "dweb-integration-console-fixture-",
      dir: dataParent,
    });
    originalCwd = cwd();

    await ensureDir(join(testDir, "src", "config"));
    await ensureDir(join(testDir, "src", "routes"));
    await writeTextFile(
      join(testDir, "src", "config", "main.ts"),
      `export default {
  name: "console-fixture",
  kind: "console",
  version: "1.0.0",
  router: { routesDir: "./src/routes" },
  logger: { level: "warn", format: "text", output: { console: false } },
};
`,
    );
    await writeTextFile(
      join(testDir, "src", "routes", "hello.ts"),
      `export async function world() {
  return 0;
}
`,
    );
  });

  afterAll(async () => {
    if (app) {
      try {
        await app.stop();
        await app.shutdown();
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

  it(
    "console 模式应不 listen，执行 hello/world 后能 shutdown 退出",
    async () => {
      chdir(testDir);
      setEnv("RUNTIME_ENV", "start");

      app = new App(
        { kind: "console", hotReload: false },
        {
          mode: "console",
          configDirectories: [join(testDir, "src", "config")],
        },
      );
      await app.start({ mode: "console" });

      expect(app.isConsoleMode()).toBe(true);
      expect(isConsoleKind(getConfig(app.container))).toBe(true);

      const routesDir = resolve(testDir, "src/routes");
      const resolved = await resolveConsoleRoute(routesDir, "hello/world");
      const ctx = createConsoleContext({
        app,
        routeName: "hello/world",
        cwd: testDir,
      });
      const code = await invokeConsoleAction(resolved, ctx);
      expect(code).toBe(0);

      await app.stop();
      await app.shutdown();
      app = null;
    },
    {
      timeout: 60_000,
      sanitizeOps: false,
      sanitizeResources: false,
    },
  );
});

describe("integration: console kind — init generate + dweb-cli run（子进程）", () => {
  let testDir: string;
  let parentDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    const dataParent = join(REPO_ROOT, "tests", "data");
    await ensureDir(dataParent);
    parentDir = await makeTempDir({
      prefix: "dweb-console-init-parent-",
      dir: dataParent,
    });
    const stamp = String(Date.now());
    testDir = join(dataParent, `dweb-integration-console-init-${stamp}`);
    originalCwd = cwd();

    const opts: InitOptions = {
      targetDir: testDir,
      projectName: "cli-app",
      appMode: "single",
      kind: "console",
      apps: [{ name: "cli-app", kind: "console" }],
      runtime: "deno",
      engine: "view",
      renderMode: "hybrid",
      style: "none",
      useSrc: true,
      exampleLevel: "minimal",
    };
    await generate(opts);
    await writeLocalDenoJson(testDir);

    expect(await exists(join(testDir, "src", "routes", "hello.ts"))).toBe(
      true,
    );
    expect(await exists(join(testDir, "src", "config", "main.ts"))).toBe(
      true,
    );
  });

  afterAll(async () => {
    if (originalCwd) chdir(originalCwd);
    if (testDir && (await exists(testDir))) {
      await remove(testDir, { recursive: true });
    }
    if (parentDir && (await exists(parentDir))) {
      await remove(parentDir, { recursive: true });
    }
  });

  async function spawnCli(
    cliArgs: string[],
  ): Promise<{
    status: { success: boolean; code: number | null };
    stdout: string;
    stderr: string;
  }> {
    const cliEntry = join(REPO_ROOT, "src", "cli.ts");
    const env = {
      ...getEnvAll(),
      RUNTIME_ENV: "start",
    };
    const cmd = createCommand(getExampleChildProcessExecutable(), {
      args: [...exampleRunArgs(cliEntry), ...cliArgs],
      cwd: getSpawnCwd(testDir),
      env,
      stdout: "piped",
      stderr: "piped",
    });
    const child: SpawnedProcess = cmd.spawn();
    const timeoutMs = 60_000;
    const result = await Promise.race([
      (async () => {
        const [status, stdout, stderr] = await Promise.all([
          child.status,
          readStream(child.stdout),
          readStream(child.stderr),
        ]);
        return { status, stdout, stderr, timedOut: false as const };
      })(),
      new Promise<{ timedOut: true }>((resolvePromise) => {
        setTimeout(() => resolvePromise({ timedOut: true }), timeoutMs);
      }),
    ]);
    if ("timedOut" in result && result.timedOut) {
      try {
        child.kill(15);
      } catch {
        // ignore
      }
      throw new Error(
        `dweb-cli ${cliArgs.join(" ")} hung for ${timeoutMs}ms`,
      );
    }
    return result as {
      status: { success: boolean; code: number | null };
      stdout: string;
      stderr: string;
    };
  }

  it("dweb-cli run hello/world 应退出码 0 并打印问候且进程退出", async () => {
    const { status, stdout, stderr } = await spawnCli(["run", "hello/world"]);
    const combined = `${stdout}\n${stderr}`;
    expect(status.success).toBe(true);
    expect(status.code ?? 0).toBe(0);
    expect(combined).toMatch(/Hello from dweb console/i);
  }, {
    timeout: 90_000,
    sanitizeOps: false,
    sanitizeResources: false,
  });

  it("dweb-cli run --list 应列出 hello/world 且进程退出", async () => {
    const { status, stdout, stderr } = await spawnCli(["run", "--list"]);
    const combined = `${stdout}\n${stderr}`;
    expect(status.success).toBe(true);
    expect(status.code ?? 0).toBe(0);
    expect(combined).toMatch(/hello\/world/);
  }, {
    timeout: 90_000,
    sanitizeOps: false,
    sanitizeResources: false,
  });
});
