/**
 * 集成测试：SSG + View 构建
 *
 * 使用 view-ssg/basic 示例项目，通过子进程执行 build 任务，
 * 验证 SSG 模式构建完整流程（含 headInject、客户端激活注入）。
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
  readTextFile,
  remove,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import {
  existsBuildOutput,
  getRepoRoot,
  getSpawnCwd,
} from "../setup.ts";

/** 仓库根目录，不依赖 cwd，避免上一套件 chdir 导致路径错误 */
const REPO_ROOT = getRepoRoot();

describe("integration: SSG + View 构建", () => {
  let originalCwd: string;
  let exampleDir: string;

  beforeAll(() => {
    originalCwd = cwd();
    exampleDir = join(REPO_ROOT, "examples", "view-ssg", "basic");
    chdir(exampleDir);
  });

  afterAll(() => {
    chdir(originalCwd);
  });

  it(
    "build 任务应成功执行并生成 HTML（含 headInject 与客户端激活）",
    async () => {
      const distDir = join(exampleDir, "dist");
      if (await exists(distDir)) {
        await remove(distDir, { recursive: true });
      }

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

      const indexPath = join(exampleDir, "dist", "client", "index.html");
      expect(await existsBuildOutput(indexPath)).toBe(true);

      const html = await readTextFile(indexPath);
      expect(html).toContain("<head>");
      expect(html).toContain("</head>");
      expect(html).toMatch(/<link[^>]*href="[^"]*\/assets\/[^"]*\.css"[^>]*>/);

      // 客户端激活：构建后注入的 hydration 数据与客户端脚本
      expect(html).toContain("globalThis.__DATA__");
      expect(html).toContain("__DWEB_MODE__");
      expect(html).toContain('src="/_client.js"');
      expect(html).toContain("欢迎使用 Dweb 框架");
      expect(html).toContain("View");
    },
    { sanitizeOps: false, sanitizeResources: false, timeout: 90000 },
  );
});
