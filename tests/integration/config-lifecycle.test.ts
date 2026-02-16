/**
 * integration: 配置与生命周期集成测试
 *
 * 测试 config 加载 + lifecycle 钩子 + middleware 的协作。
 * 通过子进程执行临时目录中的 src/main.ts，使框架以该入口推断 config/build 路径，避免 DWEB_E20。
 */

import {
  chdir,
  createCommand,
  cwd,
  ensureDir,
  execPath,
  IS_DENO,
  join,
  makeTempDir,
  readTextFile,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { getRepoRoot } from "../setup.ts";

const REPO_ROOT = getRepoRoot();

describe("integration: 配置与生命周期", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-integration-" });
    originalCwd = cwd();
    chdir(testDir);

    // testDir/deno.json：复用仓库 import map，并将 @dreamer/dweb 指向本地，子进程用本地代码且不卡在 JSR 解析
    const repoDenoJson = JSON.parse(
      await readTextFile(join(REPO_ROOT, "deno.json")),
    ) as { imports?: Record<string, string> };
    const dwebLocal = join(REPO_ROOT, "src", "mod.ts").replace(/\\/g, "/");
    await writeTextFile(
      join(testDir, "deno.json"),
      JSON.stringify(
        {
          imports: {
            ...repoDenoJson.imports,
            "@dreamer/dweb": dwebLocal,
          },
        },
        null,
        2,
      ),
    );

    // 入口为 src/main.ts 时，框架推断 config 目录为 src/config
    await ensureDir(join(testDir, "src", "config"));
    // 不配置 server，仅测 config 加载与 init 生命周期，避免初始化服务器/渲染/路由导致子进程卡住
    await writeTextFile(
      join(testDir, "src", "config", "main.ts"),
      `export default {
  name: "integration-test",
  version: "1.0.0",
  render: { engine: "preact", mode: "ssr" },
  router: { routesDir: "./src/routes" },
  build: { client: { output: "dist/client", engine: "preact" } },
};`,
    );

    // 入口文件：创建 App、注册 init/start、等待 _initPromise 后输出结果行并强制退出，避免事件循环被占用导致子进程不退出
    await writeTextFile(
      join(testDir, "src", "main.ts"),
      `import { App } from "@dreamer/dweb";

const stages: string[] = [];
const app = new App();

app.on("init", () => stages.push("init"));
app.on("start", () => stages.push("start"));

await (app as unknown as { _initPromise: Promise<void> })._initPromise;

console.log("APP_NAME:" + app.name);
console.log("APP_VERSION:" + app.version);
console.log("STAGES:" + stages.join(","));

const g = globalThis as { Deno?: { exit: (code: number) => never }; process?: { exit: (code: number) => never } };
if (g.Deno?.exit) g.Deno.exit(0);
if (g.process?.exit) g.process.exit(0);
`,
    );

    await ensureDir(join(testDir, "src", "routes"));
    await writeTextFile(
      join(testDir, "src", "routes", "index.tsx"),
      `export default function Page() { return "Integration"; }`,
    );
    await writeTextFile(
      join(testDir, "src", "routes", "_app.tsx"),
      `export default function App({ children }: { children: unknown }) { return <>{children}</>; }`,
    );
    await writeTextFile(
      join(testDir, "src", "routes", "_layout.tsx"),
      `export default function Layout({ children }: { children: unknown }) { return <>{children}</>; }`,
    );
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  it("App 应能加载 config 并注册生命周期钩子", async () => {
    // cwd=testDir 时子进程使用 testDir/deno.json（@dreamer/dweb 指向本地），入口为 src/main.ts
    const args = IS_DENO
      ? ["run", "-A", "src/main.ts"]
      : ["run", "src/main.ts"];
    const cmd = createCommand(execPath(), {
      args,
      cwd: testDir,
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
      throw new Error(`子进程执行失败: ${stderrText}`);
    }

    // 配置已加载：banner 会打印应用名（[应用名称] 或 [App name]，依 locale）；断言配置中的名称与 init 阶段
    expect(stdoutText).toContain("integration-test");
    expect(stdoutText).toContain("STAGES:init");
  }, { sanitizeOps: false, sanitizeResources: false });
});
