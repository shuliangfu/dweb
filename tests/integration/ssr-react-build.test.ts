/**
 * 集成测试：SSR + React 构建
 *
 * 使用 react-ssr/basic 示例项目，通过子进程执行 build 任务，
 * 验证 SSR 模式构建输出：dist/server.js、dist/client 客户端资源。
 *
 * 注：必须通过子进程执行，因 getInferredBuildOutputDirs 依赖 main 模块路径。
 */

import "../setup.ts";
import {
  chdir,
  createCommand,
  cwd,
  execPath,
  exists,
  getEnvAll,
  IS_DENO,
  join,
  readdir,
  remove,
  setEnv,
  type SpawnedProcess,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { getRepoRoot } from "../setup.ts";

/** 构建后启动 SSR 服务时使用的端口，与其它 e2e 错开 */
const SSR_BUILD_SERVER_PORT = 39997;

/** 仓库根目录，不依赖 cwd，避免上一套件 chdir 导致路径错误 */
const REPO_ROOT = getRepoRoot();

describe("integration: SSR + React 构建", () => {
  let originalCwd: string;
  let exampleDir: string;

  beforeAll(() => {
    originalCwd = cwd();
    exampleDir = join(REPO_ROOT, "examples", "react-ssr", "basic");
    chdir(exampleDir);
  });

  afterAll(() => {
    chdir(originalCwd);
  });

  it("build 任务应成功执行并生成 server.js 与 client 资源", async () => {
    // 构建前清空 dist，确保从干净环境开始
    const distDir = join(exampleDir, "dist");
    if (await exists(distDir)) {
      await remove(distDir, { recursive: true });
    }

    // -A 为 Deno 权限参数，Bun 不支持，需根据运行时判断
    const args = IS_DENO
      ? ["run", "-A", "src/main.ts", "--build"]
      : ["run", "src/main.ts", "--build"];
    const cmd = createCommand(execPath(), {
      args,
      cwd: exampleDir,
      stdout: "piped",
      stderr: "piped",
    });
    const proc = cmd.spawn();

    const [status, stderrText] = await Promise.all([
      proc.status,
      proc.stderr ? new Response(proc.stderr).text() : Promise.resolve(""),
    ]);
    if (!status.success) {
      throw new Error(`build 失败: ${stderrText}`);
    }

    const serverJs = join(exampleDir, "dist", "server.js");
    expect(await exists(serverJs)).toBe(true);

    const clientDir = join(exampleDir, "dist", "client");
    expect(await exists(clientDir)).toBe(true);

    const clientFiles = await readdir(clientDir);
    const clientJs = clientFiles.find((f) => f.name.startsWith("_client"));
    expect(clientJs).toBeDefined();

    const assetsDir = join(clientDir, "assets");
    const hasAssets = await exists(assetsDir);
    expect(hasAssets).toBe(true);
  }, { sanitizeOps: false, sanitizeResources: false, timeout: 90000 });

  it(
    "构建后启动服务器，首页 HTML 应包含客户端激活脚本与 __DATA__",
    async () => {
      const distDir = join(exampleDir, "dist");
      const serverJs = join(distDir, "server.js");
      if (!(await exists(serverJs))) {
        throw new Error("请先运行上一用例完成构建，或 dist 已被清理");
      }

      setEnv("PORT", String(SSR_BUILD_SERVER_PORT));
      const args = IS_DENO
        ? ["run", "-A", join(exampleDir, "dist", "server.js")]
        : ["run", join(exampleDir, "dist", "server.js")];
      const cmd = createCommand(execPath(), {
        args,
        cwd: exampleDir,
        stdout: "piped",
        stderr: "piped",
        env: { ...getEnvAll(), PORT: String(SSR_BUILD_SERVER_PORT) },
      });
      const child: SpawnedProcess = cmd.spawn();

      const baseUrl = `http://127.0.0.1:${SSR_BUILD_SERVER_PORT}`;
      const maxAttempts = 50;
      let lastErr: unknown = null;
      try {
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((r) => setTimeout(r, 500));
          try {
            const res = await fetch(baseUrl + "/");
            if (res.ok) {
              const html = await res.text();
              expect(html).toContain("globalThis.__DATA__");
              expect(html).toContain("__DWEB_MODE__");
              expect(html).toContain('src="/_client.js"');
              expect(html).toContain("计数器示例");
              expect(html).toContain("data-counter-value");
              return;
            }
          } catch (e) {
            lastErr = e;
          }
        }
        const stderrText = child.stderr
          ? await new Response(child.stderr).text()
          : "";
        throw new Error(
          `SSR 服务器在 ${maxAttempts} 次内未就绪: ${lastErr}${
            stderrText ? `\nstderr: ${stderrText.slice(0, 500)}` : ""
          }`,
        );
      } finally {
        try {
          child.kill(9);
          await Promise.race([
            child.status,
            new Promise<void>((r) => setTimeout(r, 2000)),
          ]);
        } catch {
          // ignore
        }
      }
    },
    {
      sanitizeOps: false,
      sanitizeResources: false,
      timeout: 90000,
    },
  );
});
