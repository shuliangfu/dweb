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
  IS_DENO,
  join,
  readdir,
  remove,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";

describe("integration: SSR + React 构建", () => {
  let originalCwd: string;
  let exampleDir: string;

  beforeAll(() => {
    originalCwd = cwd();
    exampleDir = join(originalCwd, "examples", "react-ssr", "basic");
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
});
