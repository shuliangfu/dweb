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
  getEnv,
  getEnvAll,
  IS_DENO,
  join,
  readdir,
  remove,
  setEnv,
  type SpawnedProcess,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import {
  existsBuildOutput,
  getRepoRoot,
  getSpawnCwd,
} from "../setup.ts";

/** 构建后启动 SSR 服务时使用的端口，与其它 e2e 错开 */
const SSR_BUILD_SERVER_PORT = 39997;

/** 是否在 CI 环境（GitHub Actions 等），用于放宽等待时间与超时 */
const IS_CI = getEnv("CI") === "true" || getEnv("GITHUB_ACTIONS") === "true";

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
      throw new Error(`build 失败: ${stderrText}`);
    }

    const serverJs = join(exampleDir, "dist", "server.js");
    expect(await existsBuildOutput(serverJs)).toBe(true);

    const clientDir = join(exampleDir, "dist", "client");
    expect(await existsBuildOutput(clientDir)).toBe(true);

    const clientFiles = await readdir(clientDir);
    const clientJs = clientFiles.find((f) => f.name.startsWith("_client"));
    expect(clientJs).toBeDefined();

    const assetsDir = join(clientDir, "assets");
    const hasAssets = await existsBuildOutput(assetsDir);
    expect(hasAssets).toBe(true);
  }, { sanitizeOps: false, sanitizeResources: false, timeout: 90000 });

  it(
    "构建后启动服务器，首页 HTML 应包含客户端激活脚本与 __DATA__",
    async () => {
      const distDir = join(exampleDir, "dist");
      const serverJs = join(distDir, "server.js");
      if (!(await existsBuildOutput(serverJs))) {
        throw new Error("请先运行上一用例完成构建，或 dist 已被清理");
      }

      setEnv("PORT", String(SSR_BUILD_SERVER_PORT));
      const args = IS_DENO
        ? ["run", "-A", join(exampleDir, "dist", "server.js")]
        : ["run", join(exampleDir, "dist", "server.js")];
      const cmd = createCommand(execPath(), {
        args,
        cwd: getSpawnCwd(exampleDir),
        stdout: "piped",
        stderr: "piped",
        env: { ...getEnvAll(), PORT: String(SSR_BUILD_SERVER_PORT) },
      });
      const child: SpawnedProcess = cmd.spawn();

      const baseUrl = `http://127.0.0.1:${SSR_BUILD_SERVER_PORT}`;
      const pollIntervalMs = 500;
      // CI 环境启动较慢，延长初始等待与总轮询次数
      const initialDelayMs = IS_CI ? 5000 : 2000;
      const maxAttempts = IS_CI ? 150 : 90;
      let lastErr: unknown = null;
      await new Promise((r) => setTimeout(r, initialDelayMs));
      try {
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((r) => setTimeout(r, pollIntervalMs));
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
        // 收集进程退出码与 stdout/stderr 便于排查 CI 下服务器未就绪原因
        const exitStatus = await Promise.race([
          child.status,
          new Promise<undefined>((r) => setTimeout(() => r(undefined), 500)),
        ]);
        const stdoutText = child.stdout
          ? await new Response(child.stdout).text()
          : "";
        const stderrText = child.stderr
          ? await new Response(child.stderr).text()
          : "";
        const exitInfo =
          exitStatus !== undefined
            ? ` (进程已退出 code=${exitStatus.code})`
            : "";
        throw new Error(
          `SSR 服务器在 ${maxAttempts} 次内未就绪 (${(maxAttempts * pollIntervalMs) / 1000}s)${exitInfo}: ${lastErr}${
            stdoutText ? `\nstdout: ${stdoutText.slice(0, 600)}` : ""
          }${stderrText ? `\nstderr: ${stderrText.slice(0, 600)}` : ""}`,
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
      timeout: IS_CI ? 120000 : 100000,
    },
  );
});
