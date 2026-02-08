/**
 * e2e: 浏览器渲染测试
 *
 * 使用 @dreamer/test 的浏览器测试能力，对 Preact/React 的 CSR、Hybrid、SSR、SSG 示例
 * 进行构建、启动服务器、Puppeteer 访问页面，验证无 hydration 错误且页面正常渲染。
 * 覆盖 Windows 在内的多平台，CI 中 Windows 需通过 setup-chrome action 配置 Chrome。
 */

import "../setup.ts";
import {
  chdir,
  createCommand,
  cwd,
  exists,
  execPath,
  IS_DENO,
  join,
  platform,
  remove,
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

/**
 * 各示例使用的端口（避免并行测试时端口冲突）
 * preact-csr=3001, preact-hybrid=3002, react-csr=3003, react-hybrid=3004
 * preact-ssr=3005, preact-ssg=3006, react-ssr=3007, react-ssg=3008
 */
const E2E_PORTS: Record<string, number> = {
  "preact-csr": 3001,
  "preact-hybrid": 3002,
  "react-csr": 3003,
  "react-hybrid": 3004,
  "preact-ssr": 3005,
  "preact-ssg": 3006,
  "react-ssr": 3007,
  "react-ssg": 3008,
};

/**
 * 轮询等待服务器就绪（返回 200）
 * @param port 端口号
 * @param maxWaitMs 最大等待毫秒数
 */
async function waitForServerReady(
  port: number,
  maxWaitMs: number,
): Promise<void> {
  const start = Date.now();
  const pollInterval = 500;
  const url = `http://127.0.0.1:${port}/`;
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
 * 构建示例项目（构建前先清空 dist，确保从干净环境开始）
 * @param exampleDir 示例目录
 */
async function buildExample(exampleDir: string): Promise<void> {
  const distDir = join(exampleDir, "dist");
  if (await exists(distDir)) {
    await remove(distDir, { recursive: true });
  }

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
 * @param port 服务器端口
 */
async function assertBrowserRender(
  t: {
    browser?: {
      page: unknown;
      goto: (url: string) => Promise<void>;
      evaluate: (fn: () => unknown) => Promise<unknown>;
      waitFor: (
        fn: () => boolean,
        options?: { timeout?: number },
      ) => Promise<void>;
    };
  },
  port: number,
): Promise<void> {
  if (!t?.browser) {
    throw new Error("browser 上下文不可用");
  }

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  /** 记录 404 的 URL，便于排查 Windows CI 等环境问题 */
  const failedUrls: string[] = [];

  const page = t.browser.page as {
    on: (event: string, fn: (arg: unknown) => void) => void;
  };
  page.on("requestfailed", (req: unknown) => {
    const r = req as { url: () => string };
    if (r?.url) failedUrls.push(`failed:${r.url()}`);
  });
  page.on("response", (res: unknown) => {
    const r = res as { url: () => string; status: () => number };
    if (r?.status?.() === 404) failedUrls.push(`404:${r.url()}`);
  });
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

  const url = `http://127.0.0.1:${port}/`;
  await t.browser.goto(url);

  // 等待页面内容出现（Windows CI 较慢，延长超时）
  const contentTimeout = platform() === "windows" ? 60000 : 15000;
  try {
    await t.browser.waitFor(
      () => {
        const doc = (globalThis as Record<string, unknown>).document as
          | { body?: { innerHTML?: string } }
          | undefined;
        return (doc?.body?.innerHTML?.includes("欢迎使用 Dweb 框架") ??
          false) === true;
      },
      { timeout: contentTimeout },
    );
  } catch (err) {
    // 诊断：获取页面内容、错误 UI 中的错误信息、控制台错误，便于排查 Windows CI 等
    const diag = await t.browser.evaluate(() => {
      const doc = (globalThis as Record<string, unknown>).document as
        | {
          body?: {
            innerHTML?: string;
            querySelector?: (s: string) => { innerText?: string; textContent?: string } | null;
          };
          documentElement?: { innerHTML?: string };
        }
        | undefined;
      const bodyHtml = doc?.body?.innerHTML?.slice(0, 500) ?? "";
      const fullHtml = doc?.documentElement?.innerHTML?.slice(0, 800) ?? "";
      // 从 Render/Hydrate error 红色 UI（background #fef2f2）的 <p> 中提取实际错误信息
      const errDiv = doc?.body?.querySelector?.(
        'div[style*="fef2f2"]',
      ) as { querySelector?: (s: string) => { innerText?: string; textContent?: string } | null } | null;
      const errP = errDiv?.querySelector?.("p");
      const renderErrorMsg = errP?.innerText ?? errP?.textContent ?? null;
      return {
        url: String(
          (globalThis as unknown as { location?: { href?: string } }).location
            ?.href ?? "",
        ),
        bodyLength: doc?.body?.innerHTML?.length ?? 0,
        bodySnippet: bodyHtml,
        fullSnippet: fullHtml,
        renderErrorMsg,
      };
    }).catch(() => null);
    const msg = err instanceof Error ? err.message : String(err);
    const diagObj = diag as { renderErrorMsg?: string } | null;
    throw new Error(
      `页面内容等待超时 (${contentTimeout}ms): ${msg}. ` +
        `URL: ${url}. ` +
        (diagObj?.renderErrorMsg
          ? `Render error: ${diagObj.renderErrorMsg}. `
          : "") +
        `Console errors: ${
          consoleErrors.length > 0 ? consoleErrors.join("; ") : "none"
        }. ` +
        `Page errors: ${
          pageErrors.length > 0 ? pageErrors.join("; ") : "none"
        }. ` +
        (failedUrls.length > 0
          ? `Failed/404 URLs: ${failedUrls.join(", ")}. `
          : "") +
        (diag ? ` Diagnostic: ${JSON.stringify(diag)}` : ""),
    );
  }

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
  const port = E2E_PORTS[exampleName] ?? 3000;

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
        args: IS_DENO
          ? ["run", "-A", "dist/server.js"]
          : ["run", "dist/server.js"],
        cwd: exampleDir,
        stdout: "inherit",
        stderr: "inherit",
      });
      child = startCmd.spawn();

      // 轮询等待服务器就绪（Windows CI 较慢）
      const maxWait = platform() === "windows" ? 60000 : 15000;
      await waitForServerReady(port, maxWait);
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

    it("应能渲染且无 hydration 错误", async (t) => {
      if (!t) throw new Error("test context 不可用");
      await assertBrowserRender(t, port);
    }, {
      timeout: platform() === "windows" ? 90000 : 60000,
      sanitizeOps: false,
      sanitizeResources: false,
      browser: {
        enabled: true,
        headless: true,
        reuseBrowser: false,
      },
    });
  });
}

createExampleBrowserSuite("preact-csr");
createExampleBrowserSuite("preact-hybrid");
createExampleBrowserSuite("preact-ssr");
createExampleBrowserSuite("preact-ssg");
createExampleBrowserSuite("react-csr");
createExampleBrowserSuite("react-hybrid");
createExampleBrowserSuite("react-ssr");
createExampleBrowserSuite("react-ssg");
