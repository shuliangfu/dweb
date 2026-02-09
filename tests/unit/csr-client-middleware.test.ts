/**
 * CSR 客户端脚本服务中间件测试
 *
 * 测试 src/feature/csr-client-middleware.ts 的功能：
 * - createClientScriptMiddleware 返回中间件函数
 * - 中间件对 /_client.js 以外路径调用 next
 * - 生产模式下从静态目录读取
 */

import "../setup.ts";
import {
  chdir,
  cwd,
  ensureDir,
  join,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { createClientScriptMiddleware } from "../../src/feature/csr-client-middleware.ts";
import type { AppConfig } from "../../src/types/app.ts";
import { initializeLogger } from "../../src/utils/logger.ts";

/** 模拟 HttpContext */
function mockContext(pathname: string) {
  const nextCalled: boolean[] = [];
  return {
    url: new URL(`http://localhost${pathname}`),
    path: pathname,
    response: undefined as Response | undefined,
    next: () => {
      nextCalled.push(true);
      return Promise.resolve();
    },
    nextCalled: () => nextCalled.length > 0,
  };
}

describe("CSR 客户端脚本中间件 (csr-client-middleware.ts)", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-csr-middleware-" });
    originalCwd = cwd();
    chdir(testDir);
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  it("createClientScriptMiddleware 应返回函数", () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      name: "test",
      build: { client: { output: "dist/client", engine: "preact" } },
      server: { mode: "prod" },
    };
    initializeLogger(container, config);

    const middleware = createClientScriptMiddleware(container, config);
    expect(typeof middleware).toBe("function");
  });

  it("非 /_client 路径应调用 next", async () => {
    const container = initializeServiceContainer();
    const config: AppConfig = {
      name: "test",
      build: { client: { output: "dist/client", engine: "preact" } },
      server: { mode: "prod" },
    };
    initializeLogger(container, config);

    const middleware = createClientScriptMiddleware(container, config);
    const ctx = mockContext("/api/users");

    await middleware(ctx as never, ctx.next);

    expect(ctx.nextCalled()).toBe(true);
  });

  it("生产模式且存在 _client.js 时应返回文件内容", async () => {
    const clientDir = join(testDir, "dist", "client");
    await ensureDir(clientDir);
    await writeTextFile(
      join(clientDir, "_client.js"),
      "console.log('client');",
    );

    const container = initializeServiceContainer();
    const config: AppConfig = {
      name: "test",
      build: { client: { output: "dist/client", engine: "preact" } },
      server: { mode: "prod" },
    };
    initializeLogger(container, config);

    const middleware = createClientScriptMiddleware(container, config);
    const ctx = mockContext("/_client.js");

    await middleware(ctx as never, ctx.next);

    expect(ctx.response).toBeDefined();
    expect(ctx.response?.status).toBe(200);
    const body = await ctx.response?.text();
    expect(body).toContain("client");
  });

  it("生产模式且 _client.js 不存在时应返回 500", async () => {
    const emptyClientDir = join(testDir, "dist-empty", "client");
    await ensureDir(emptyClientDir);
    // 不创建 _client.js，使用独立 output 避免与其它用例冲突

    const container = initializeServiceContainer();
    const config: AppConfig = {
      name: "test",
      build: { client: { output: "dist-empty/client", engine: "preact" } },
      server: { mode: "prod" },
    };
    initializeLogger(container, config);

    const middleware = createClientScriptMiddleware(container, config);
    const ctx = mockContext("/_client.js");

    await middleware(ctx as never, ctx.next);

    expect(ctx.response).toBeDefined();
    expect(ctx.response?.status).toBe(500);
    const body = await ctx.response?.text();
    expect(body).toMatch(/预构建的客户端脚本不存在|clientScriptNotFound/);
  });

  it("生产模式且存在 chunk 文件时应返回 chunk 内容", async () => {
    const clientDir = join(testDir, "dist", "client");
    await ensureDir(clientDir);
    await writeTextFile(
      join(clientDir, "chunk-abc123.js"),
      "// chunk content",
    );

    const container = initializeServiceContainer();
    const config: AppConfig = {
      name: "test",
      build: { client: { output: "dist/client", engine: "preact" } },
      server: { mode: "prod" },
    };
    initializeLogger(container, config);

    const middleware = createClientScriptMiddleware(container, config);
    const ctx = mockContext("/_client/chunk-abc123.js");

    await middleware(ctx as never, ctx.next);

    expect(ctx.response).toBeDefined();
    expect(ctx.response?.status).toBe(200);
    const body = await ctx.response?.text();
    expect(body).toContain("// chunk content");
  });
});
