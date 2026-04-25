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
  getEnvAll,
  join,
  type SpawnedProcess,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { getDenoExecutableForExamples, getRepoRoot } from "../setup.ts";

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

  beforeAll(() => {
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
    const env = { ...getEnvAll(), PORT: String(E2E_PORT) };
    // 用 Deno 子进程，与 deno test 的依赖图一致，避免 bun 下双 preact
    const cmd = createCommand(getDenoExecutableForExamples(), {
      args: ["run", "-A", "src/main.ts"],
      cwd: exampleDir,
      env,
      stdout: "inherit",
      stderr: "inherit",
    });
    child = cmd.spawn();

    /** 轮询等待服务器就绪，最多 25s，避免固定 8s 在 CI/高负载下不足 */
    const pollIntervalMs = 500;
    const maxWaitMs = 25000;
    const deadline = Date.now() + maxWaitMs;
    let lastErr: unknown;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      try {
        const res = await fetch(`http://127.0.0.1:${E2E_PORT}/`);
        if (res.ok) {
          const html = await res.text();
          if (html.length > 100 && /<html|<!DOCTYPE/i.test(html)) {
            expect(res.ok).toBe(true);
            expect(html.length).toBeGreaterThan(100);
            expect(html).toMatch(/<html|<!DOCTYPE/i);
            if (child) {
              try {
                child.kill(15);
                await child.status;
              } catch {
                // 忽略 kill 时的 Invalid signal 等错误
              }
            }
            return;
          }
        }
      } catch (e) {
        lastErr = e;
      }
    }
    if (child) {
      try {
        child.kill(15);
        await child.status;
        child.unref();
      } catch {
        // ignore
      }
    }
    throw new Error(
      `服务器 ${maxWaitMs}ms 内未就绪: http://127.0.0.1:${E2E_PORT}/. ` +
        (lastErr instanceof Error ? lastErr.message : String(lastErr)),
    );
  }, { timeout: 35000, sanitizeOps: false, sanitizeResources: false });
});
