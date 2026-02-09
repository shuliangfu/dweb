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
  resolve,
  type SpawnedProcess,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";

/** preact-ssr 示例端口（与 browser-render 中 preact-ssr 端口一致） */
const E2E_PORT = 3005;

describe("e2e: 服务器请求", () => {
  let originalCwd: string | undefined;
  let child: SpawnedProcess | null = null;
  let exampleDir: string;

  beforeAll(async () => {
    originalCwd = cwd();
    exampleDir = resolve(originalCwd, "examples", "preact-ssr", "basic");
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
