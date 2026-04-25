/**
 * 集成测试：Hybrid + React 构建
 *
 * 使用 react-hybrid/basic 示例项目，通过子进程执行 build 任务，
 * 验证 Hybrid 模式构建输出：dist/server.js、dist/client 客户端资源及 assets。
 *
 * 注：必须通过子进程执行，因 getInferredBuildOutputDirs 依赖 main 模块路径。
 */

import "../setup.ts";
import {
  chdir,
  createCommand,
  cwd,
  exists,
  join,
  readdir,
  remove,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import {
  existsBuildOutput,
  getDenoExecutableForExamples,
  getRepoRoot,
  getSpawnCwd,
} from "../setup.ts";

/** 仓库根目录，不依赖 cwd，避免上一套件 chdir 导致路径错误 */
const REPO_ROOT = getRepoRoot();

describe("integration: Hybrid + React 构建", () => {
  let originalCwd: string;
  let exampleDir: string;

  beforeAll(() => {
    originalCwd = cwd();
    exampleDir = join(REPO_ROOT, "examples", "react-hybrid", "basic");
    chdir(exampleDir);
  });

  afterAll(() => {
    chdir(originalCwd);
  });

  it("build 任务应成功执行并生成 server.js、client 资源及 assets", async () => {
    // 构建前清空 dist，确保从干净环境开始
    const distDir = join(exampleDir, "dist");
    if (await exists(distDir)) {
      await remove(distDir, { recursive: true });
    }

    const cmd = createCommand(getDenoExecutableForExamples(), {
      args: ["run", "-A", "src/main.ts", "--build"],
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
});
