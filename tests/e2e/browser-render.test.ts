/**
 * e2e: 浏览器渲染测试
 *
 * 使用 @dreamer/test 的浏览器测试能力，对 Preact/React/View 的 CSR、Hybrid、SSR、SSG 示例
 * 进行构建、启动服务器、Puppeteer 访问页面，验证无 hydration 错误且页面正常渲染。
 * view-* 含 basic 与 advanced（advanced 为双进程 backend+frontend，端口由 env 指定）。
 * 覆盖 Windows 在内的多平台，CI 中 Windows 需通过 setup-chrome action 配置 Chrome。
 */

import {
  chdir,
  createCommand,
  cwd,
  dirname,
  execPath,
  exists,
  getEnvAll,
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
import "../setup.ts";

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
 * 各示例使用的端口（避免并行测试时端口冲突，CI/Windows 下可并行或同机多任务）
 * Basic 单端口: preact-csr=3001, preact-hybrid=3002, react-csr=3003, react-hybrid=3004,
 *   preact-ssr=3005, preact-ssg=3006, react-ssr=3007, react-ssg=3008,
 *   preact-hybrid-flat=3009, react-hybrid-flat=3010,
 *   view-csr=3011, view-hybrid=3012, view-ssr=3013, view-ssg=3014, view-hybrid-flat=3015
 * Advanced 双端口见下方 createAdvancedExampleBrowserSuite（3020-3049）
 * server-request.test 使用 PORT=39995，与上述端口错开
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
  "view-hybrid-flat": 3015,
};

/** 浏览器单用例超时：Windows 10 秒，其他 5 秒；不通过时再长也通不过，避免耗时过长 */
const BROWSER_TEST_TIMEOUT_MS = platform() === "windows" ? 10000 : 5000;

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

/** 带 goto 的 page 形参，用于 gotoWithRetry */
type PageWithGoto = {
  goto: (
    url: string,
    opts?: { waitUntil?: string; timeout?: number },
  ) => Promise<unknown>;
};

/**
 * 带一次重试的 page.goto，用于缓解 CI 上偶发 ERR_CONNECTION_REFUSED（服务器刚就绪但尚未完全可连）
 */
async function gotoWithRetry(
  page: PageWithGoto,
  url: string,
  options: { waitUntil?: string; timeout?: number } = {},
): Promise<unknown> {
  try {
    return await page.goto(url, {
      waitUntil: "load",
      timeout: BROWSER_TEST_TIMEOUT_MS,
      ...options,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("ERR_CONNECTION_REFUSED") ||
      msg.includes("Connection refused")
    ) {
      await new Promise((r) => setTimeout(r, 2000));
      return await page.goto(url, {
        waitUntil: "load",
        timeout: BROWSER_TEST_TIMEOUT_MS,
        ...options,
      });
    }
    throw err;
  }
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
  const hardTimeoutMs = BROWSER_TEST_TIMEOUT_MS;
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
        await gotoWithRetry(page as PageWithGoto, url);
      } else {
        await browser.goto(url);
      }

      // 等待页面内容出现（CSR/Hybrid 需等待 JS 执行和 hydration，Windows CI 较慢）
      // basic 与多数 view 首页含「欢迎使用 Dweb 框架」，react advanced 首页含「React Advanced」或「React CSR Advanced Example」
      const contentTimeout = BROWSER_TEST_TIMEOUT_MS;
      try {
        await browser.waitFor(
          () => {
            const doc = (globalThis as Record<string, unknown>).document as
              | { body?: { innerHTML?: string } }
              | undefined;
            const html = doc?.body?.innerHTML ?? "";
            return (
              html.includes("欢迎使用 Dweb 框架") ||
              html.includes("React CSR Advanced Example") ||
              html.includes("React Advanced")
            );
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
            // 检查期望文案是否存在于 body（任一首屏标识即可）
            const hasExpectText = bodyHtml.includes("欢迎使用 Dweb 框架") ||
              bodyHtml.includes("React CSR Advanced Example") ||
              bodyHtml.includes("React Advanced");
            const expectTextIndex = bodyHtml.length > 0 ? 0 : -1;
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

      // CSR 场景下 waitFor 通过后 DOM 可能仍在更新，短暂延迟再取 body 避免 race（如 react-csr-advanced）
      await new Promise((r) => setTimeout(r, 400));

      const hasTitle = await browser.evaluate(() => {
        const doc = (globalThis as Record<string, unknown>).document as
          | { body?: { innerHTML?: string } }
          | undefined;
        const html = doc?.body?.innerHTML ?? "";
        return (
          html.includes("欢迎使用 Dweb 框架") ||
          html.includes("React CSR Advanced Example") ||
          html.includes("React Advanced")
        );
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
 * 浏览器交互断言：首页加载后点击「关于」链接，进入关于页并校验文案
 * 各示例 layout 统一包含 a[href="/about"]，关于页统一包含「关于我们」
 * @param t 测试上下文（含 browser）
 * @param port 服务器端口
 */
async function assertBrowserClickAbout(
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
  const page = browser.page as {
    goto: (
      url: string,
      options?: { waitUntil?: string; timeout?: number },
    ) => Promise<unknown>;
    click: (selector: string, options?: { timeout?: number }) => Promise<void>;
  };

  const url = `http://127.0.0.1:${port}/`;
  if (typeof page.goto === "function") {
    await gotoWithRetry(page, url);
  } else {
    await browser.goto(url);
  }

  const contentTimeout = BROWSER_TEST_TIMEOUT_MS;
  await browser.waitFor(
    () => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { body?: { innerHTML?: string } }
        | undefined;
      return (doc?.body?.innerHTML?.includes("欢迎使用 Dweb 框架") ?? false) ===
        true;
    },
    { timeout: contentTimeout },
  );

  if (typeof page.click !== "function") {
    throw new Error("page.click 不可用，无法执行点击");
  }
  await page.click('a[href="/about"]', { timeout: BROWSER_TEST_TIMEOUT_MS });

  await browser.waitFor(
    () => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { body?: { innerHTML?: string } }
        | undefined;
      return (doc?.body?.innerHTML?.includes("关于我们") ?? false) === true;
    },
    { timeout: contentTimeout },
  );

  const hasAboutTitle = await browser.evaluate(() => {
    const doc = (globalThis as Record<string, unknown>).document as
      | { body?: { innerHTML?: string } }
      | undefined;
    return doc?.body?.innerHTML?.includes("关于我们") ?? false;
  });
  expect(hasAboutTitle).toBe(true);
}

/**
 * 浏览器断言：校验 basic 示例首页与关于页的 metadata（title / meta description）已渲染且非空
 * 各示例的 title/description 文案可能不同（来自 index 或服务端注入），仅断言存在即可
 * @param t 测试上下文（含 browser）
 * @param port 服务器端口
 */
async function assertBrowserMetadata(
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
  const page = browser.page as {
    goto: (
      url: string,
      options?: { waitUntil?: string; timeout?: number },
    ) => Promise<unknown>;
  };

  const baseUrl = `http://127.0.0.1:${port}/`;
  if (typeof page.goto === "function") {
    await gotoWithRetry(page, baseUrl, { timeout: BROWSER_TEST_TIMEOUT_MS });
  } else {
    await browser.goto(baseUrl);
  }

  const contentTimeout = BROWSER_TEST_TIMEOUT_MS;
  await browser.waitFor(
    () => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { body?: { innerHTML?: string } }
        | undefined;
      const html = doc?.body?.innerHTML ?? "";
      return (
        html.includes("欢迎使用 Dweb 框架") ||
        html.includes("React CSR Advanced Example") ||
        html.includes("React Advanced")
      );
    },
    { timeout: contentTimeout },
  );

  const homeMeta = await browser.evaluate(() => {
    const doc = (globalThis as Record<string, unknown>).document as
      | {
        title?: string;
        querySelector?: (
          s: string,
        ) => { getAttribute?: (n: string) => string } | null;
      }
      | undefined;
    const metaDesc = doc?.querySelector?.('meta[name="description"]');
    return {
      title: doc?.title ?? "",
      description: metaDesc?.getAttribute?.("content") ?? "",
    };
  }) as { title: string; description: string };
  expect(homeMeta.title.length).toBeGreaterThan(0);
  expect(homeMeta.description.length).toBeGreaterThan(0);

  const aboutUrl = `http://127.0.0.1:${port}/about`;
  if (typeof page.goto === "function") {
    await gotoWithRetry(page, aboutUrl, { timeout: BROWSER_TEST_TIMEOUT_MS });
  } else {
    await browser.goto(aboutUrl);
  }
  await browser.waitFor(
    () => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { body?: { innerHTML?: string } }
        | undefined;
      return (doc?.body?.innerHTML?.includes("关于我们") ?? false) === true;
    },
    { timeout: contentTimeout },
  );

  const aboutMeta = await browser.evaluate(() => {
    const doc = (globalThis as Record<string, unknown>).document as
      | {
        title?: string;
        querySelector?: (
          s: string,
        ) => { getAttribute?: (n: string) => string } | null;
      }
      | undefined;
    const metaDesc = doc?.querySelector?.('meta[name="description"]');
    return {
      title: doc?.title ?? "",
      description: metaDesc?.getAttribute?.("content") ?? "",
    };
  }) as { title: string; description: string };
  expect(aboutMeta.title.length).toBeGreaterThan(0);
  expect(aboutMeta.description.length).toBeGreaterThan(0);
}

/**
 * 浏览器交互断言：首页加载后点击「用户管理」链接，进入 /users 页并校验文案
 * 仅用于 advanced 示例（frontend 有 /users，会请求 backend API）；backend 无 about 路由，故 advanced 不测 about
 * preact/view 用户页标题为「用户管理」，react 为「用户列表」，二者满足其一即通过
 * @param t 测试上下文（含 browser）
 * @param port 前端服务端口（浏览器访问此端口）
 */
async function assertBrowserClickUsers(
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
  const page = browser.page as {
    goto: (
      url: string,
      options?: { waitUntil?: string; timeout?: number },
    ) => Promise<unknown>;
    click: (selector: string, options?: { timeout?: number }) => Promise<void>;
  };

  const url = `http://127.0.0.1:${port}/`;
  if (typeof page.goto === "function") {
    await page.goto(url, {
      waitUntil: "load",
      timeout: BROWSER_TEST_TIMEOUT_MS,
    });
  } else {
    await browser.goto(url);
  }

  const contentTimeout = BROWSER_TEST_TIMEOUT_MS;
  await browser.waitFor(
    () => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { body?: { innerHTML?: string } }
        | undefined;
      const html = doc?.body?.innerHTML ?? "";
      return (
        html.includes("欢迎使用 Dweb 框架") ||
        html.includes("React CSR Advanced Example") ||
        html.includes("React Advanced")
      );
    },
    { timeout: contentTimeout },
  );

  if (typeof page.click !== "function") {
    throw new Error("page.click 不可用，无法执行点击");
  }
  await page.click('a[href="/users"]', { timeout: BROWSER_TEST_TIMEOUT_MS });
  // 点击后稍等再轮询，避免 CI 上导航尚未完成即开始 waitFor
  await new Promise((r) => setTimeout(r, 1500));

  await browser.waitFor(
    () => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { body?: { innerHTML?: string } }
        | undefined;
      const html = doc?.body?.innerHTML ?? "";
      return html.includes("用户管理") || html.includes("用户列表");
    },
    { timeout: contentTimeout },
  );

  const hasUsersPage = await browser.evaluate(() => {
    const doc = (globalThis as Record<string, unknown>).document as
      | { body?: { innerHTML?: string } }
      | undefined;
    const html = doc?.body?.innerHTML ?? "";
    return html.includes("用户管理") || html.includes("用户列表");
  });
  expect(hasUsersPage).toBe(true);
}

/**
 * 构建 advanced 示例（先构建 backend，再构建 frontend）
 * @param exampleDir 示例 advanced 目录
 * @param entries 入口对 [backend入口, frontend入口]，默认 src 目录结构
 */
async function buildExampleAdvanced(
  exampleDir: string,
  entries: [string, string] = ["src/backend/main.ts", "src/frontend/main.ts"],
): Promise<void> {
  const distDir = join(exampleDir, "dist");
  if (await exists(distDir)) {
    await remove(distDir, { recursive: true });
  }
  for (const entry of entries) {
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
      throw new Error(`build ${entry} 失败: ${stderrText}`);
    }
  }
}

/**
 * 创建 view-* advanced 示例的浏览器测试套件（双进程：backend + frontend，访问 frontend 端口）
 * @param exampleName 示例名称（如 view-csr、view-hybrid）
 * @param backendPort e2e 时后端端口
 * @param frontendPort e2e 时前端端口（浏览器访问此端口）
 * @param options.skip 为 true 时跳过该套件
 * @param options.entries 构建入口 [backend, frontend]，默认 ["src/backend/main.ts", "src/frontend/main.ts"]；flat 结构传 ["backend/main.ts", "frontend/main.ts"]
 */
function createAdvancedExampleBrowserSuite(
  exampleName: string,
  backendPort: number,
  frontendPort: number,
  options?: { skip?: boolean; entries?: [string, string] },
): void {
  const skip = options?.skip === true;
  const entries = options?.entries ??
    ["src/backend/main.ts", "src/frontend/main.ts"];
  const suiteName = `${exampleName}-advanced`;
  describe(`e2e: 浏览器渲染 - ${suiteName}`, () => {
    let originalCwd: string | undefined;
    let childBackend: SpawnedProcess | null = null;
    let childFrontend: SpawnedProcess | null = null;
    let exampleDir: string;
    /** 端口已写死在各应用配置中，此处仅用于等待服务就绪与访问 URL */
    const env = getEnvAll();

    beforeAll(async () => {
      if (skip) return;
      originalCwd = cwd();
      exampleDir = resolve(DWEB_ROOT, "examples", exampleName, "advanced");
      chdir(exampleDir);
      await buildExampleAdvanced(exampleDir, entries);

      const startBackend = createCommand(execPath(), {
        args: IS_DENO
          ? ["run", "-A", "dist/backend/server.js"]
          : ["run", "dist/backend/server.js"],
        cwd: exampleDir,
        env,
        stdout: "inherit",
        stderr: "inherit",
      });
      childBackend = startBackend.spawn();
      // Windows CI 上构建+启动较慢，给足等待时间（2 分钟）确保服务器就绪
      const maxWait = platform() === "windows" ? 120000 : 15000;
      await waitForServerReady(backendPort, maxWait);

      const startFrontend = createCommand(execPath(), {
        args: IS_DENO
          ? ["run", "-A", "dist/frontend/server.js"]
          : ["run", "dist/frontend/server.js"],
        cwd: exampleDir,
        env,
        stdout: "inherit",
        stderr: "inherit",
      });
      childFrontend = startFrontend.spawn();
      await waitForServerReady(frontendPort, maxWait);
      // 就绪后再等一小段，避免偶发 ERR_CONNECTION_REFUSED
      await new Promise((r) => setTimeout(r, 1500));
    });

    afterAll(async () => {
      if (skip) return;
      for (const child of [childFrontend, childBackend]) {
        if (child) {
          try {
            child.kill(15);
            await child.status;
          } catch {
            // ignore
          }
        }
      }
      await cleanupAllBrowsers();
      if (originalCwd && originalCwd.length > 0) {
        chdir(originalCwd);
      }
    });

    it.skipIf(skip, "应能渲染且无 hydration 错误", async (t) => {
      if (!t) throw new Error("test context 不可用");
      await assertBrowserRender(t, frontendPort);
    }, {
      timeout: BROWSER_TEST_TIMEOUT_MS,
      sanitizeOps: false,
      sanitizeResources: false,
      browser: {
        enabled: true,
        headless: true,
        dumpio: true,
        reuseBrowser: true,
        browserSource: "test",
        protocolTimeout: BROWSER_TEST_TIMEOUT_MS,
      },
    });

    it.skipIf(skip, "应能通过点击用户管理链接进入用户页", async (t) => {
      if (!t) throw new Error("test context 不可用");
      await assertBrowserClickUsers(t, frontendPort);
    }, {
      timeout: BROWSER_TEST_TIMEOUT_MS,
      sanitizeOps: false,
      sanitizeResources: false,
      browser: {
        enabled: true,
        headless: true,
        dumpio: true,
        reuseBrowser: true,
        browserSource: "test",
        protocolTimeout: BROWSER_TEST_TIMEOUT_MS,
      },
    });
  });
}

/**
 * 创建单个示例的浏览器测试套件
 * 使用 @dreamer/test 的默认行为：不传 executablePath，由 Puppeteer 使用自带的 Chrome for Testing
 * @param exampleName 示例名称（如 preact-csr、preact-hybrid）
 * @param entry 入口文件：有 src 用 "src/main.ts"，无 src 用 "main.ts"
 * @param options.skip 为 true 时跳过该套件的用例（用于已知会挂起的用例，如 react-ssg）
 */
function createBasicExampleBrowserSuite(
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
      const maxWait = platform() === "windows" ? 60000 : 25000;
      await waitForServerReady(port, maxWait);
      // 就绪后再等一段，避免偶发 ERR_CONNECTION_REFUSED（如 view-hybrid-flat 等启动略慢）
      await new Promise((r) => setTimeout(r, 3000));
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
      timeout: BROWSER_TEST_TIMEOUT_MS,
      sanitizeOps: false,
      sanitizeResources: false,
      browser: {
        enabled: true,
        headless: true,
        dumpio: true,
        reuseBrowser: true,
        // 使用 Playwright 自带 Chromium
        browserSource: "test",
        protocolTimeout: BROWSER_TEST_TIMEOUT_MS,
      },
    });

    it.skipIf(skip, "应能通过点击关于链接进入关于页", async (t) => {
      if (!t) throw new Error("test context 不可用");
      await assertBrowserClickAbout(t, port);
    }, {
      timeout: BROWSER_TEST_TIMEOUT_MS,
      sanitizeOps: false,
      sanitizeResources: false,
      browser: {
        enabled: true,
        headless: true,
        dumpio: true,
        reuseBrowser: true,
        browserSource: "test",
        protocolTimeout: BROWSER_TEST_TIMEOUT_MS,
      },
    });

    it.skipIf(
      skip,
      "应渲染首页与关于页的 metadata（title/description）",
      async (t) => {
        if (!t) throw new Error("test context 不可用");
        await assertBrowserMetadata(t, port);
      },
      {
        timeout: BROWSER_TEST_TIMEOUT_MS,
        sanitizeOps: false,
        sanitizeResources: false,
        browser: {
          enabled: true,
          headless: true,
          dumpio: true,
          reuseBrowser: true,
          browserSource: "test",
          protocolTimeout: BROWSER_TEST_TIMEOUT_MS,
        },
      },
    );
  });
}

createBasicExampleBrowserSuite("preact-csr", "src/main.ts");
createBasicExampleBrowserSuite("preact-hybrid", "src/main.ts");
createBasicExampleBrowserSuite("preact-ssr", "src/main.ts");
createBasicExampleBrowserSuite("preact-ssg", "src/main.ts");
createBasicExampleBrowserSuite("preact-hybrid-flat", "main.ts");

createBasicExampleBrowserSuite("react-csr", "src/main.ts");
createBasicExampleBrowserSuite("react-hybrid", "src/main.ts");
createBasicExampleBrowserSuite("react-ssr", "src/main.ts");
createBasicExampleBrowserSuite("react-ssg", "src/main.ts");
createBasicExampleBrowserSuite("react-hybrid-flat", "main.ts");

createBasicExampleBrowserSuite("view-csr", "src/main.ts");
createBasicExampleBrowserSuite("view-hybrid", "src/main.ts");
createBasicExampleBrowserSuite("view-ssr", "src/main.ts");
createBasicExampleBrowserSuite("view-ssg", "src/main.ts");
createBasicExampleBrowserSuite("view-hybrid-flat", "main.ts");

// preact-* advanced 示例（双进程 backend + frontend）
// preact-csr=3030,3031 preact-hybrid=3032,3033 preact-ssr=3034,3035 preact-ssg=3036,3037 preact-hybrid-flat=3038,3039
createAdvancedExampleBrowserSuite("preact-csr", 3030, 3031);
createAdvancedExampleBrowserSuite("preact-hybrid", 3032, 3033);
createAdvancedExampleBrowserSuite("preact-ssr", 3034, 3035);
createAdvancedExampleBrowserSuite("preact-ssg", 3036, 3037);
createAdvancedExampleBrowserSuite("preact-hybrid-flat", 3038, 3039, {
  entries: ["backend/main.ts", "frontend/main.ts"],
});

// react-* advanced 示例（双进程 backend + frontend）
// react-csr=3040,3041 react-hybrid=3042,3043 react-ssr=3044,3045 react-ssg=3046,3047 react-hybrid-flat=3048,3049
createAdvancedExampleBrowserSuite("react-csr", 3040, 3041);
createAdvancedExampleBrowserSuite("react-hybrid", 3042, 3043);
createAdvancedExampleBrowserSuite("react-ssr", 3044, 3045);
createAdvancedExampleBrowserSuite("react-ssg", 3046, 3047);
createAdvancedExampleBrowserSuite("react-hybrid-flat", 3048, 3049, {
  entries: ["backend/main.ts", "frontend/main.ts"],
});

// view-* advanced 示例（双进程 backend + frontend）
// view-csr=3020,3021 view-hybrid=3022,3023 view-ssr=3024,3025 view-ssg=3026,3027 view-hybrid-flat=3028,3029
createAdvancedExampleBrowserSuite("view-csr", 3020, 3021);
createAdvancedExampleBrowserSuite("view-hybrid", 3022, 3023);
createAdvancedExampleBrowserSuite("view-ssr", 3024, 3025);
createAdvancedExampleBrowserSuite("view-ssg", 3026, 3027);
createAdvancedExampleBrowserSuite("view-hybrid-flat", 3028, 3029, {
  entries: ["backend/main.ts", "frontend/main.ts"],
});
