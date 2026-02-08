/**
 * e2e: 浏览器渲染测试
 *
 * 使用 @dreamer/test 的浏览器测试能力，对 Preact/React 的 CSR 和 Hybrid 示例
 * 进行构建、启动服务器、Puppeteer 访问页面，验证无 hydration 错误且页面正常渲染。
 * 覆盖 Windows 在内的多平台，用于验证 hydration 修复。
 */

import "../setup.ts";
import {
  chdir,
  createCommand,
  cwd,
  execPath,
  IS_DENO,
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
  t: { browser?: { page: any; goto: (url: string) => Promise<void>; evaluate: (fn: () => unknown) => Promise<unknown> } },
): Promise<void> {
  if (!t?.browser) {
    throw new Error("browser 上下文不可用");
  }

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  t.browser.page.on("console", (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  t.browser.page.on("pageerror", (err: { message: string }) => {
    pageErrors.push(err.message);
  });

  await t.browser.goto(`http://127.0.0.1:${E2E_PORT}/`);

  // 等待 hydration 完成
  await new Promise((r) => setTimeout(r, 3000));

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

      await new Promise((r) => setTimeout(r, 6000));
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

    it("应能渲染且无 hydration 错误",
      async (t) => {
        if (!t) throw new Error("test context 不可用");
        await assertBrowserRender(t);
      },
      {
        timeout: 60000,
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
