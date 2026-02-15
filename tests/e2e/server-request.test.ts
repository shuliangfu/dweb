/**
 * e2e: 服务器请求测试
 *
 * 使用 preact-ssr basic 示例启动服务器，发起 HTTP 请求，验证响应。
 */

import "../setup.ts";
import {
  chdir,
  createCommand,
  cwd,
  execPath,
  IS_DENO,
  join,
  setEnv,
  type SpawnedProcess,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { getRepoRoot } from "../setup.ts";

/**
 * server-request 专用端口，与 browser-render 中 preact-ssr basic（3005）错开，
 * 避免 CI（尤其 Windows）并行或同机多任务时端口冲突
 */
const E2E_PORT = 39995;

/** 仓库根目录，由 setup 的 getRepoRoot 得到，不依赖 cwd，避免上一套件 chdir 导致路径错误 */
const REPO_ROOT = getRepoRoot();

describe("e2e: 服务器请求", () => {
  let originalCwd: string | undefined;
  let child: SpawnedProcess | null = null;
  let exampleDir: string;

  beforeAll(async () => {
    originalCwd = cwd();
    exampleDir = join(REPO_ROOT, "examples", "preact-ssr", "basic");
    chdir(exampleDir);
  });

  afterAll(async () => {
    if (child) {
      try {
        child.kill(15); // SIGTERM，数值在部分环境可能无效，故捕获
        await child.status;
      } catch {
        // ignore
      }
    }
    if (originalCwd && originalCwd.length > 0) {
      chdir(originalCwd);
    }
  });

  it("应能启动服务器并返回 HTML", async () => {
    setEnv("PORT", String(E2E_PORT));
    const entry = join(exampleDir, "src", "main.ts");
    const args = IS_DENO ? ["run", "-A", entry] : ["run", entry];
    const cmd = createCommand(execPath(), {
      args,
      cwd: exampleDir,
      stdout: "inherit",
      stderr: "inherit",
    });
    child = cmd.spawn();

    await new Promise((r) => setTimeout(r, 8000));

    try {
      const res = await fetch(`http://127.0.0.1:${E2E_PORT}/`);
      expect(res.ok).toBe(true);
      const html = await res.text();
      expect(html.length).toBeGreaterThan(100);
      expect(html).toMatch(/<html|<!DOCTYPE/i);
    } finally {
      if (child) {
        try {
          child.kill(15);
          await child.status;
        } catch {
          // 忽略 kill 时的 Invalid signal 等错误，避免掩盖真实断言失败
        }
      }
    }
  }, { timeout: 20000, sanitizeOps: false, sanitizeResources: false });
});
