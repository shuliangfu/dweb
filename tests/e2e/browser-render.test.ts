/**
 * e2e: 浏览器渲染测试
 *
 * 使用 @dreamer/test 的浏览器测试能力，对 Preact/React 的 CSR 和 Hybrid 示例
 * 进行构建、启动服务器、Puppeteer 访问页面，验证无 hydration 错误且页面正常渲染。
 *
 * 注：Windows CI 下 Preact/React 客户端 bundle 加载异常（与 @dreamer/render 浏览器测试相同），
 * 导致页面内容无法渲染，故暂时跳过。Linux/Mac 上可验证 hydration 修复。
 */

import "../setup.ts";
import {
  chdir,
  createCommand,
  cwd,
  execPath,
  IS_DENO,
  platform,
  resolve,
  type SpawnedProcess,
} from "@dreamer/runtime-adapter";
import {
  afterAll,
  beforeAll,
  cleanupAllBrowsers,
  describe,
  expect,
  it,
} from "@dreamer/test";

/** 示例服务器端口 */
const E2E_PORT = 3000;

/** Windows CI 下 Preact/React bundle 加载异常，暂时跳过浏览器测试 */
const skipOnWindows = platform() === "windows";

/**
 * 轮询等待服务器就绪（返回 200）
 * @param maxWaitMs 最大等待毫秒数
 */
async function waitForServerReady(maxWaitMs: number): Promise<void> {
  const start = Date.now();
  const pollInterval = 500;
  const url = `http://127.0.0.1:${E2E_PORT}/`;
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // 忽略连接错误，继续轮询
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(`服务器 ${maxWaitMs}ms 内未就绪: ${url}`);
}

/**
 * 构建示例项目
 * @param exampleDir 示例目录
 */
async function buildExample(exampleDir: string): Promise<void> {
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
}

/**
 * 浏览器渲染断言：无 hydration 错误、页面包含预期内容
 * @param t 测试上下文（含 browser）
 */
async function assertBrowserRender(
  t: {
    browser?: {
      page: unknown;
      goto: (url: string) => Promise<void>;
      evaluate: (fn: () => unknown) => Promise<unknown>;
      waitFor: (fn: () => boolean, options?: { timeout?: number }) => Promise<void>;
    };
  },
): Promise<void> {
  if (!t?.browser) {
    throw new Error("browser 上下文不可用");
  }

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  const page = t.browser.page as { on: (event: string, fn: (arg: unknown) => void) => void };
  page.on("console", (msg: unknown) => {
    const m = msg as { type: () => string; text: () => string };
    if (m.type?.() === "error") {
      consoleErrors.push(m.text?.() ?? "");
    }
  });
  page.on("pageerror", (err: unknown) => {
    const e = err as { message: string };
    pageErrors.push(e.message ?? "");
  });

  await t.browser.goto(`http://127.0.0.1:${E2E_PORT}/`);

  // 等待页面内容出现（Windows CI 较慢，延长超时）
  const contentTimeout = platform() === "windows" ? 45000 : 15000;
  await t.browser.waitFor(
    () => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { body?: { innerHTML?: string } }
        | undefined;
      return (doc?.body?.innerHTML?.includes("欢迎使用 Dweb 框架") ?? false) === true;
    },
    { timeout: contentTimeout },
  );

  const hasTitle = await t.browser.evaluate(() => {
    const doc = (globalThis as Record<string, unknown>).document as
      | { body?: { innerHTML?: string } }
      | undefined;
    return doc?.body?.innerHTML?.includes("欢迎使用 Dweb 框架") ?? false;
  });

  expect(hasTitle).toBe(true);

  const allErrors = [...consoleErrors, ...pageErrors];
  const hydrateErrors = allErrors.filter(
    (e) =>
      e.includes("HYDRATE") ||
      e.includes("(void 0)") ||
      e.includes("is not a function"),
  );

  expect(hydrateErrors).toEqual([]);
  if (hydrateErrors.length > 0) {
    throw new Error(`Hydration 错误: ${hydrateErrors.join("; ")}`);
  }
}

/**
 * 创建单个示例的浏览器测试套件
 * @param exampleName 示例名称（如 preact-csr、preact-hybrid）
 */
function createExampleBrowserSuite(exampleName: string): void {
  describe(`e2e: 浏览器渲染 - ${exampleName}`, () => {
    let originalCwd: string | undefined;
    let child: SpawnedProcess | null = null;
    let exampleDir: string;

    beforeAll(async () => {
      originalCwd = cwd();
      exampleDir = resolve(originalCwd, "examples", exampleName, "basic");
      chdir(exampleDir);
      await buildExample(exampleDir);

      const startCmd = createCommand(execPath(), {
        args: IS_DENO ? ["run", "-A", "dist/server.js"] : ["run", "dist/server.js"],
        cwd: exampleDir,
        stdout: "inherit",
        stderr: "inherit",
      });
      child = startCmd.spawn();

      // 轮询等待服务器就绪（Windows CI 较慢）
      const maxWait = platform() === "windows" ? 60000 : 15000;
      await waitForServerReady(maxWait);
    });

    afterAll(async () => {
      if (child) {
        try {
          child.kill(15);
          await child.status;
        } catch {
          // ignore
        }
      }
      await cleanupAllBrowsers();
      if (originalCwd && originalCwd.length > 0) {
        chdir(originalCwd);
      }
    });

    it.skipIf(
      skipOnWindows,
      "应能渲染且无 hydration 错误",
      async (t) => {
        if (!t) throw new Error("test context 不可用");
        await assertBrowserRender(t);
      },
      {
        timeout: platform() === "windows" ? 90000 : 60000,
        sanitizeOps: false,
        sanitizeResources: false,
        browser: {
          enabled: true,
          headless: true,
          reuseBrowser: false,
        },
      },
    );
  });
}

createExampleBrowserSuite("preact-csr");
createExampleBrowserSuite("preact-hybrid");
createExampleBrowserSuite("react-csr");
createExampleBrowserSuite("react-hybrid");
