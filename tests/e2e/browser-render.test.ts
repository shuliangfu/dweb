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
  dirname,
  execPath,
  exists,
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
 * 从本测试文件路径解析出的 dweb 项目根目录（不依赖 cwd，避免多套件顺序执行时 cwd 被上一套件改变导致路径错误）
 */
const DWEB_ROOT = (() => {
  const u = new URL(import.meta.url);
  let p = u.pathname;
  if (typeof p === "string" && p.length > 1 && /^\/[A-Za-z]:/.test(p)) {
    p = p.slice(1);
  }
  const testFileDir = dirname(decodeURIComponent(p));
  return resolve(testFileDir, "..", "..");
})();

/**
 * 各示例使用的端口（避免并行测试时端口冲突）
 * preact-csr=3001, preact-hybrid=3002, react-csr=3003, react-hybrid=3004
 * preact-ssr=3005, preact-ssg=3006, react-ssr=3007, react-ssg=3008
 * preact-hybrid-flat=3009, react-hybrid-flat=3010
 * view-csr=3011, view-hybrid=3012, view-ssr=3013, view-ssg=3014
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
  "preact-hybrid-flat": 3009,
  "react-hybrid-flat": 3010,
  "view-csr": 3011,
  "view-hybrid": 3012,
  "view-ssr": 3013,
  "view-ssg": 3014,
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
 * @param entry 入口文件：有 src 目录用 "src/main.ts"，无 src 用 "main.ts"
 */
async function buildExample(
  exampleDir: string,
  entry: string = "src/main.ts",
): Promise<void> {
  const distDir = join(exampleDir, "dist");
  if (await exists(distDir)) {
    await remove(distDir, { recursive: true });
  }

  const args = IS_DENO
    ? ["run", "-A", entry, "--build"]
    : ["run", entry, "--build"];
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
  const browser = t.browser;

  /** 整段断言硬超时，避免 SSG 等场景下 goto/waitFor 卡死导致测试一直挂起 */
  const hardTimeoutMs = 55000;
  await Promise.race([
    (async () => {
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];
      const pageErrors: string[] = [];
      /** 记录 404 的 URL，便于排查 Windows CI 等环境问题 */
      const failedUrls: string[] = [];

      const page = browser.page as {
        on: (event: string, fn: (arg: unknown) => void) => void;
        goto?: (
          url: string,
          options?: { waitUntil?: string; timeout?: number },
        ) => Promise<unknown>;
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
        const text = m.text?.() ?? "";
        const type = m.type?.() ?? "log";
        if (type === "error") {
          consoleErrors.push(text);
        } else if (type === "warning") {
          consoleWarnings.push(text);
        }
        // 转发浏览器控制台到 CI/stdout，便于查看 router/render 等 debug 日志
        const prefix = `[browser ${type}]`;
        if (type === "error") {
          console.error(prefix, text);
        } else {
          console.log(prefix, text);
        }
      });
      page.on("pageerror", (err: unknown) => {
        const e = err as { message: string };
        pageErrors.push(e.message ?? "");
      });

      const url = `http://127.0.0.1:${port}/`;
      // 使用 page.goto + waitUntil: "load" 替代默认的 networkidle0，避免 WebSocket 等长连接导致永不到达
      if (typeof page.goto === "function") {
        await page.goto(url, { waitUntil: "load", timeout: 60000 });
      } else {
        await browser.goto(url);
      }

      // 等待页面内容出现（CSR/Hybrid 需等待 JS 执行和 hydration，Windows CI 较慢）
      const contentTimeout = platform() === "windows" ? 60000 : 30000;
      try {
        await browser.waitFor(
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
        // 诊断：获取页面内容、错误 UI、控制台、readyState、#app 等，便于排查 Windows CI 等
        // 对 evaluate 加超时，避免页面卡死时 evaluate 永不返回导致测试一直挂起
        const diagTimeoutMs = 5000;
        const diag = await Promise.race([
          browser.evaluate(() => {
            const doc = (globalThis as Record<string, unknown>).document as
              | {
                body?: {
                  innerHTML?: string;
                  querySelector?: (
                    s: string,
                  ) => { innerText?: string; textContent?: string } | null;
                };
                documentElement?: { innerHTML?: string };
                readyState?: string;
              }
              | undefined;
            const bodyHtml = doc?.body?.innerHTML ?? "";
            const bodySnippet = bodyHtml.slice(0, 1000);
            const fullSnippet =
              doc?.documentElement?.innerHTML?.slice(0, 1200) ?? "";
            // 从 Render/Hydrate error 红色 UI（background #fef2f2）的 <p> 中提取实际错误信息
            const errDiv = doc?.body?.querySelector?.(
              'div[style*="fef2f2"]',
            ) as {
              querySelector?: (
                s: string,
              ) => { innerText?: string; textContent?: string } | null;
            } | null;
            const errP = errDiv?.querySelector?.("p");
            const renderErrorMsg = errP?.innerText ?? errP?.textContent ?? null;
            // #app 容器内容（CSR/Hybrid 渲染目标）
            const appEl = doc?.body?.querySelector?.("#app") as
              | { innerHTML?: string }
              | null
              | undefined;
            const appInnerLength = appEl?.innerHTML?.length ?? 0;
            const appSnippet = appEl?.innerHTML?.slice(0, 500) ?? "";
            // 检查期望文案是否存在于 body
            const expectText = "欢迎使用 Dweb 框架";
            const hasExpectText = bodyHtml.includes(expectText);
            const expectTextIndex = bodyHtml.indexOf(expectText);
            return {
              url: String(
                (globalThis as unknown as { location?: { href?: string } })
                  .location
                  ?.href ?? "",
              ),
              readyState: doc?.readyState ?? "unknown",
              bodyLength: bodyHtml.length,
              bodySnippet,
              fullSnippet,
              renderErrorMsg,
              appInnerLength,
              appSnippet,
              hasExpectText,
              expectTextIndex,
            };
          }).catch(() => null),
          new Promise<null>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(`diagnostic evaluate timeout ${diagTimeoutMs}ms`),
                ),
              diagTimeoutMs,
            )
          ),
        ]).catch(() => null);
        const msg = err instanceof Error ? err.message : String(err);
        const diagObj = diag as {
          renderErrorMsg?: string;
          readyState?: string;
          appInnerLength?: number;
          hasExpectText?: boolean;
        } | null;
        const diagSummary = diagObj
          ? `readyState=${diagObj.readyState ?? "?"} appLen=${
            diagObj.appInnerLength ?? "?"
          } hasText=${diagObj.hasExpectText ?? "?"}`
          : "";
        throw new Error(
          `页面内容等待超时 (${contentTimeout}ms): ${msg}. ` +
            `URL: ${url}. ` +
            (diagSummary ? `[${diagSummary}] ` : "") +
            (diagObj?.renderErrorMsg
              ? `Render error: ${diagObj.renderErrorMsg}. `
              : "") +
            `Console errors: ${
              consoleErrors.length > 0 ? consoleErrors.join("; ") : "none"
            }. ` +
            (consoleWarnings.length > 0
              ? `Console warnings: ${consoleWarnings.slice(0, 3).join("; ")}. `
              : "") +
            `Page errors: ${
              pageErrors.length > 0 ? pageErrors.join("; ") : "none"
            }. ` +
            (failedUrls.length > 0
              ? `Failed/404 URLs: ${failedUrls.join(", ")}. `
              : "") +
            (diag ? ` Diagnostic: ${JSON.stringify(diag)}` : ""),
        );
      }

      const hasTitle = await browser.evaluate(() => {
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
    })(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `assertBrowserRender 硬超时 (${hardTimeoutMs}ms)，可能页面未响应或 waitUntil 未完成`,
            ),
          ),
        hardTimeoutMs,
      )
    ),
  ]);
}

/**
 * 创建单个示例的浏览器测试套件
 * 使用 @dreamer/test 的默认行为：不传 executablePath，由 Puppeteer 使用自带的 Chrome for Testing
 * @param exampleName 示例名称（如 preact-csr、preact-hybrid）
 * @param entry 入口文件：有 src 用 "src/main.ts"，无 src 用 "main.ts"
 * @param options.skip 为 true 时跳过该套件的用例（用于已知会挂起的用例，如 react-ssg）
 */
function createExampleBrowserSuite(
  exampleName: string,
  entry: string = "src/main.ts",
  options?: { skip?: boolean },
): void {
  const port = E2E_PORTS[exampleName] ?? 3000;
  const skip = options?.skip === true;

  describe(`e2e: 浏览器渲染 - ${exampleName}`, () => {
    let originalCwd: string | undefined;
    let child: SpawnedProcess | null = null;
    let exampleDir: string;

    beforeAll(async () => {
      originalCwd = cwd();
      exampleDir = resolve(DWEB_ROOT, "examples", exampleName, "basic");
      chdir(exampleDir);
      await buildExample(exampleDir, entry);

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

    it.skipIf(skip, "应能渲染且无 hydration 错误", async (t) => {
      if (!t) throw new Error("test context 不可用");
      await assertBrowserRender(t, port);
    }, {
      timeout: platform() === "windows" ? 90000 : 60000,
      sanitizeOps: false,
      sanitizeResources: false,
      browser: {
        enabled: true,
        headless: true,
        reuseBrowser: true,
        // 使用 Playwright 自带 Chromium，并延长启动超时（非 CI 默认 45s 易超时）
        browserSource: "test",
        protocolTimeout: 90000,
      },
    });
  });
}

createExampleBrowserSuite("preact-csr", "src/main.ts");
createExampleBrowserSuite("preact-hybrid", "src/main.ts");
createExampleBrowserSuite("preact-ssr", "src/main.ts");
createExampleBrowserSuite("preact-ssg", "src/main.ts");
createExampleBrowserSuite("react-csr", "src/main.ts");
createExampleBrowserSuite("react-hybrid", "src/main.ts");
createExampleBrowserSuite("react-ssr", "src/main.ts");
// react-ssg 在部分环境下会卡住（waitFor 或 goto 不返回），暂时跳过，待排查 SSG 静态页 load 行为后再启用
createExampleBrowserSuite("react-ssg", "src/main.ts", { skip: true });
createExampleBrowserSuite("preact-hybrid-flat", "main.ts");
createExampleBrowserSuite("react-hybrid-flat", "main.ts");
createExampleBrowserSuite("view-csr", "src/main.ts");
createExampleBrowserSuite("view-hybrid", "src/main.ts");
createExampleBrowserSuite("view-ssr", "src/main.ts");
createExampleBrowserSuite("view-ssg", "src/main.ts");
