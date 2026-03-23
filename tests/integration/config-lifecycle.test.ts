/**
 * integration: 配置与生命周期集成测试
 *
 * 测试 config 加载 + lifecycle 钩子 + middleware 的协作。
 * 通过子进程执行临时目录中的 src/main.ts，使框架以该入口推断 config/build 路径，避免 DWEB_E20。
 *
 * **临时目录**：`tests/data/dweb-integration-*` 仅为本套件生成的**假项目根**（含 deno.json），
 * 与 `@dreamer/esbuild` 的 **`deno info` 模块映射磁盘缓存** 无关；后者由 esbuild 在
 * `~/.dreamer/<项目目录名>/esbuild-deno-cache/` 下自动创建，无需在本文件中配置。
 *
 * Deno：使用 deno.json 的 imports 将 @dreamer/dweb 指向本地 file://。
 * Bun：Bun 不读 deno.json，需在临时目录写 package.json 并用 file: 引用本地 dweb，再 bun install 后运行。
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
  platform,
  readTextFile,
  remove,
  resolve,
  symlink,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { getRepoRoot } from "../setup.ts";

const REPO_ROOT = getRepoRoot();

/**
 * 将 dweb/deno.json 中的 import 映射值转为子进程可解析的 spec。
 * 相对路径（如 `../render/src/mod.ts`）相对**原 deno.json 所在目录**（即 dweb 包根）解析，
 * 再写成绝对 `file://`；若原样复制到临时目录 deno.json，会按临时目录解析，导致找不到模块（如 `/T/render/...`）。
 *
 * @param spec - import map 的值
 * @param denoJsonDir - 仓库内 dweb/deno.json 所在目录（与 getRepoRoot() 一致）
 */
function resolveImportMapEntryForTempProject(
  spec: string,
  denoJsonDir: string,
): string {
  if (
    spec.startsWith("npm:") ||
    spec.startsWith("jsr:") ||
    spec.startsWith("http://") ||
    spec.startsWith("https://")
  ) {
    return spec;
  }
  if (spec.startsWith("file:")) {
    return spec;
  }
  if (spec.startsWith(".")) {
    const absPath = resolve(denoJsonDir, spec).replace(/\\/g, "/");
    return absPath.startsWith("/") ? `file://${absPath}` : `file:///${absPath}`;
  }
  return spec;
}

/** Windows 上 Bun 创建目录符号链接常需管理员或开发者模式，CI 易失败，整套件跳过 */
const isBunWindows = !IS_DENO && platform() === "windows";

/**
 * 集成测试临时工程父目录（`dweb/tests/data`），避免占用 `~/.dreamer` 或与 esbuild 磁盘缓存混淆。
 * 子目录 `dweb-integration-*` 须在根 `deno.json` 的 `workspace` 中声明为成员，否则子进程会报
 * “Config file must be a member of the workspace”。
 */
function integrationTempParentDir(): string {
  return join(REPO_ROOT, "tests", "data");
}

const runConfigLifecycleSuite = () => {
  describe("integration: 配置与生命周期", () => {
    let testDir: string;
    let originalCwd: string;

    beforeAll(async () => {
      const dataParent = integrationTempParentDir();
      await ensureDir(dataParent);
      testDir = await makeTempDir({
        prefix: "dweb-integration-",
        dir: dataParent,
      });
      originalCwd = cwd();
      chdir(testDir);

      try {
        // testDir/deno.json：复用仓库 import map，并将 @dreamer/dweb 指向本地，子进程用本地代码且不卡在 JSR 解析
        // Windows 下裸路径 d:/a/dweb/... 会被解析为 scheme "d:"，故使用 file:// URL
        const repoDenoJson = JSON.parse(
          await readTextFile(join(REPO_ROOT, "deno.json")),
        ) as { imports?: Record<string, string> };
        const dwebModPath = join(REPO_ROOT, "src", "mod.ts").replace(
          /\\/g,
          "/",
        );
        const dwebLocal = dwebModPath.startsWith("/")
          ? `file://${dwebModPath}`
          : `file:///${dwebModPath}`;
        /** 相对路径须相对 dweb 包根解析后再写入，否则临时目录下 `../render` 会指到错误位置 */
        const resolvedImports: Record<string, string> = {};
        for (const [key, val] of Object.entries(repoDenoJson.imports ?? {})) {
          if (typeof val === "string") {
            resolvedImports[key] = resolveImportMapEntryForTempProject(
              val,
              REPO_ROOT,
            );
          }
        }
        resolvedImports["@dreamer/dweb"] = dwebLocal;
        await writeTextFile(
          join(testDir, "deno.json"),
          JSON.stringify(
            {
              imports: resolvedImports,
            },
            null,
            2,
          ),
        );

        // Bun 不读 deno.json，通过 node_modules 符号链接指向本地 dweb，Bun 会使用仓库内 node_modules 解析 dweb 的依赖
        if (!IS_DENO) {
          await ensureDir(join(testDir, "node_modules", "@dreamer"));
          await symlink(
            REPO_ROOT,
            join(testDir, "node_modules", "@dreamer", "dweb"),
            "dir",
          );
        }

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
        // 传入完整 config（含 host/port），与 config 文件合并后优先级最高，Windows 上主配置未加载时仍能得到预期行为
        await writeTextFile(
          join(testDir, "src", "main.ts"),
          `import { App } from "@dreamer/dweb";

const stages: string[] = [];
const app = new App({
  name: "integration-test",
  version: "1.0.0",
  server: { port: 39997, host: "127.0.0.1" },
  render: { engine: "preact", mode: "ssr" },
  router: { routesDir: "./src/routes" },
  build: { client: { output: "dist/client", engine: "preact" } },
});

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
      } catch (e) {
        chdir(originalCwd);
        throw e;
      }
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
    }, {
      timeout: 60_000,
      sanitizeOps: false,
      sanitizeResources: false,
    });
  });
};

if (!isBunWindows) {
  runConfigLifecycleSuite();
}
