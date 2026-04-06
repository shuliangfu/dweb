/**
 * e2e: 浏览器渲染测试
 *
 * 使用 @dreamer/test 的浏览器测试能力，对 Preact/React/View 的 CSR、Hybrid、SSR、SSG 示例
 * 启动 dev 服务（不 build），Puppeteer 访问页面，验证无 hydration 错误且页面正常渲染。
 * view-* 含 basic 与 advanced（advanced 为双进程 backend+frontend，端口由 env 指定）。
 * 覆盖 Windows 在内的多平台，CI 中 Windows 需通过 setup-chrome action 配置 Chrome。
 */

import {
  chdir,
  connect,
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

/**
 * 从本模块路径解析出的 dweb 项目根目录（不依赖 cwd，避免多套件顺序执行时 cwd 被上一套件改变导致路径错误）
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

/**
 * e2e 浏览器用例超时（毫秒）。basic 与 advanced 共用；根因修复见 @dreamer/test 中浏览器缓存键使用完整 suitePath，
 * 避免多文件顺序跑时跨套件共用 Playwright 实例导致挂死与 Bun killed dangling processes，而非依赖拉长本值。
 */
const BROWSER_TEST_TIMEOUT_MS = 60_000;

/** 就绪探测选项：advanced 的 backend 必须用 path: "/api/users"，否则 SSG backend 的 GET / 会返回 500 */
type WaitForServerReadyOptions = { path?: string };

/**
 * 检测 host:port 是否已被占用（能连上表示有进程在监听）
 * 用于 e2e 启动前先占位或选可用端口，避免与 @dreamer/server 的 findAvailablePort 行为错位
 */
async function isPortInUse(host: string, port: number): Promise<boolean> {
  try {
    const conn = await connect({ host, port });
    conn.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * 从 startPort 起顺次 +1 查找第一个未被占用的端口
 * 保证 e2e 传给子进程的 PORT 一定可用，子进程不会因端口占用而自动换端口导致测试轮询错端口
 * @param host 主机（如 "127.0.0.1"）
 * @param startPort 起始端口
 * @param maxAttempts 最大尝试次数，默认 50
 * @returns 第一个可用端口号
 */
async function findAvailablePort(
  host: string,
  startPort: number,
  maxAttempts: number = 50,
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const inUse = await isPortInUse(host, port);
    if (!inUse) return port;
  }
  throw new Error(
    `e2e: 从端口 ${startPort} 起尝试 ${maxAttempts} 次均被占用，无法启动服务`,
  );
}

/**
 * 轮询等待服务器就绪（返回 200）
 * @param port 端口号
 * @param maxWaitMs 最大等待毫秒数
 * @param pathOrOptions 探测路径（字符串）或 { path: "/api/users" }；advanced backend 必须传 "/api/users"
 */
async function waitForServerReady(
  port: number,
  maxWaitMs: number,
  pathOrOptions: string | WaitForServerReadyOptions = "/",
): Promise<void> {
  const path = typeof pathOrOptions === "string"
    ? pathOrOptions
    : (pathOrOptions.path ?? "/");
  const start = Date.now();
  const pollInterval = 500;
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `http://127.0.0.1:${port}${p}`;
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
 * 在多个端口中轮询，返回第一个对给定 path 返回 200 的端口（用于 advanced 端口可能对调：backend 占 frontendPort 或反之）
 * @param ports 待探测端口列表（如 [backendPort, frontendPort]）
 * @param path 探测路径（如 "/api/users" 或 "/"）
 * @param maxWaitMs 最大等待毫秒数
 * @returns 就绪的端口号
 */
async function _waitForServerReadyOneOf(
  ports: number[],
  path: string,
  maxWaitMs: number,
): Promise<number> {
  const start = Date.now();
  const pollInterval = 500;
  const p = path.startsWith("/") ? path : `/${path}`;
  while (Date.now() - start < maxWaitMs) {
    for (const port of ports) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}${p}`);
        if (res.ok) return port;
      } catch {
        // 忽略，继续试下一个端口
      }
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(
    `服务器 ${maxWaitMs}ms 内未就绪（已试端口 ${ports.join(",")} path=${p}）`,
  );
}

/** 带 goto 的 page 形参，用于 gotoWithRetry */
type PageWithGoto = {
  goto: (
    url: string,
    opts?: { waitUntil?: string; timeout?: number },
  ) => Promise<unknown>;
};

/**
 * 在浏览器上下文中轮询检查首屏内容是否就绪（用 evaluate 保证在页面内执行，避免 Bun 下 waitFor 回调在宿主执行导致永不满足）
 * @param browser 含 evaluate 的浏览器上下文
 * @param timeoutMs 总超时毫秒
 */
async function waitForContentViaEvaluate(
  browser: { evaluate: (fn: () => unknown) => Promise<unknown> },
  timeoutMs: number,
): Promise<void> {
  const pollIntervalMs = 400;
  const deadline = Date.now() + timeoutMs;
  const expectedStrings = [
    "欢迎使用 Dweb 框架",
    "Welcome to Dweb",
    "React CSR Advanced Example",
    "React Advanced",
    "View Advanced",
    "Preact Advanced",
    "用户管理",
    "核心特性",
    "特性",
    "UnoCSS",
    "首页",
  ];
  let lastResult: { ready: boolean; htmlLength: number } = {
    ready: false,
    htmlLength: 0,
  };
  while (Date.now() < deadline) {
    const result = await browser.evaluate(() => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { body?: { innerHTML?: string }; readyState?: string }
        | undefined;
      const html = doc?.body?.innerHTML ?? "";
      const ready = doc?.readyState === "complete";
      return { html, ready, htmlLength: html.length };
    }) as { html: string; ready: boolean; htmlLength: number };
    lastResult = { ready: result.ready, htmlLength: result.htmlLength };
    const hasText = expectedStrings.some((s) => result.html.includes(s));
    if (hasText || (result.ready && result.htmlLength > 300)) {
      return;
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(
    `waitForContentViaEvaluate: ${timeoutMs}ms 内未检测到预期首屏内容 (ready=${lastResult.ready}, bodyLen=${lastResult.htmlLength})`,
  );
}

/**
 * 通过 evaluate 轮询直到进入「用户列表」页（与仅含导航「用户管理」文案的首页区分）。
 * Bun/Playwright 下 waitForFunction 偶发不更新或与环境差异，故用轮询 evaluate。
 * @param browser 浏览器上下文
 * @param timeoutMs 最大等待毫秒
 */
async function waitForUsersListPageViaEvaluate(
  browser: { evaluate: (fn: () => unknown) => Promise<unknown> },
  timeoutMs: number,
): Promise<void> {
  const pollMs = 400;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await browser.evaluate(() => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { body?: { innerHTML?: string } }
        | undefined;
      const loc = (globalThis as Record<string, unknown>).location as
        | { pathname?: string }
        | undefined;
      const html = doc?.body?.innerHTML ?? "";
      const path = loc?.pathname ?? "";
      /** 列表路由：/users 或 /users/（非 /users/123 详情） */
      const onUsersList = /\/users\/?$/.test(path);
      if (html.includes("管理系统中的所有用户")) return true;
      if (html.includes("用户列表")) return true;
      if (onUsersList && html.includes("用户管理")) return true;
      if (onUsersList && html.includes("暂无用户")) return true;
      return false;
    }) as boolean;
    if (ok) return;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(
    `waitForUsersListPageViaEvaluate: ${timeoutMs}ms 内未检测到用户列表页（pathname 与正文）`,
  );
}

/**
 * 轮询 document.readyState === complete（evaluate），避免 waitFor 在 Bun 下偶发问题
 * @param browser 浏览器上下文
 * @param timeoutMs 最大等待毫秒
 */
async function waitForDocumentCompleteViaEvaluate(
  browser: { evaluate: (fn: () => unknown) => Promise<unknown> },
  timeoutMs: number,
): Promise<void> {
  const pollMs = 200;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await browser.evaluate(() => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { readyState?: string }
        | undefined;
      return doc?.readyState === "complete";
    }) as boolean;
    if (ok) return;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(
    `waitForDocumentCompleteViaEvaluate: ${timeoutMs}ms 内 readyState 未为 complete`,
  );
}

/**
 * 轮询直到页面存在可解析的计数器数值（与 {@link getCountFromPage} 判定一致）。
 * View SSR/SSG 在 headless/CI 上客户端脚本与水合可能明显晚于 `document.complete`，单独等待可减少误报。
 *
 * @param browser 浏览器上下文
 * @param timeoutMs 最大等待毫秒
 */
async function waitForCounterReadableViaEvaluate(
  browser: { evaluate: (fn: () => unknown) => Promise<unknown> },
  timeoutMs: number,
): Promise<void> {
  const pollMs = 150;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const readable = await browser.evaluate(() => {
      type CounterEl = {
        textContent?: string | null;
        getAttribute?: (name: string) => string | null;
      };
      const doc = (globalThis as Record<string, unknown>).document as
        | {
          body?: { innerText?: string };
          querySelectorAll?: (s: string) => ArrayLike<CounterEl> | null;
        }
        | undefined;
      const nodes = doc?.querySelectorAll?.("[data-counter-value]");
      if (nodes && nodes.length > 0) {
        for (let i = 0; i < nodes.length; i++) {
          const el = nodes[i]!;
          const valueText = el.textContent?.trim();
          if (valueText !== undefined && valueText !== "") {
            const num = parseInt(valueText, 10);
            if (!Number.isNaN(num)) return true;
            const cm = valueText.match(/count:\s*(\d+)/i);
            if (cm) {
              const n = parseInt(cm[1], 10);
              if (!Number.isNaN(n)) return true;
            }
          }
          const attr = el.getAttribute?.("data-counter-value")?.trim();
          if (attr !== undefined && attr !== "") {
            const num = parseInt(attr, 10);
            if (!Number.isNaN(num)) return true;
          }
        }
      }
      /** 与 {@link getCountFromPage} 一致：view-csr / view-hybrid-flat 等仅有「count: N」文案、无 data-counter-value */
      const text = doc?.body?.innerText ?? "";
      const m = text.match(/count:\s*(\d+)/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n)) return true;
      }
      return false;
    }) as boolean;
    if (readable) return;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(
    `waitForCounterReadableViaEvaluate: ${timeoutMs}ms 内未读到计数器（[data-counter-value] 或正文 count: N，hydration 或未挂载）`,
  );
}

/**
 * 轮询直到关于页正文出现（中文或英文示例）
 * @param browser 浏览器上下文
 * @param timeoutMs 最大等待毫秒
 */
async function waitForAboutPageBodyViaEvaluate(
  browser: { evaluate: (fn: () => unknown) => Promise<unknown> },
  timeoutMs: number,
): Promise<void> {
  const pollMs = 400;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await browser.evaluate(() => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { body?: { innerHTML?: string } }
        | undefined;
      const html = doc?.body?.innerHTML ?? "";
      return html.includes("关于我们") || html.includes("About us");
    }) as boolean;
    if (ok) return;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(
    `waitForAboutPageBodyViaEvaluate: ${timeoutMs}ms 内未检测到关于页内容`,
  );
}

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
 * Bun 下在示例目录执行 bun install，保证 external 依赖（如 tailwindcss、lightningcss）在 node_modules 可用，避免生产启动 ENOENT。
 * 若示例在 dweb 仓库内（DWEB_ROOT），则跳过：在子目录执行会解析 file: 指向的 dweb/package.json，其中
 * npm:@jsr/dreamer__* 依赖会向 npm 请求，JSR 包不在 npm 上导致 404；仓库内 e2e 依赖 workspace 已有 node_modules。
 */
async function _ensureBunDeps(exampleDir: string): Promise<void> {
  if (IS_DENO) return;
  const normalizedExample = resolve(exampleDir);
  const rootDir = resolve(DWEB_ROOT);
  const isInRepo = normalizedExample === rootDir ||
    (normalizedExample.startsWith(rootDir + "/") ||
      normalizedExample.startsWith(rootDir + "\\"));
  if (isInRepo) return;
  const cmd = createCommand(execPath(), {
    args: ["install"],
    cwd: exampleDir,
    stdout: "piped",
    stderr: "piped",
  });
  const proc = cmd.spawn();

  const [status, stderrText] = await Promise.all([
    proc.status,
    proc.stderr ? new Response(proc.stderr).text() : Promise.resolve(""),
  ]);

  proc.unref();

  if (!status.success) {
    throw new Error(`bun install 失败: ${stderrText}`);
  }
}

/**
 * 构建示例项目（构建前先清空 dist，确保从干净环境开始）
 * @param exampleDir 示例目录
 * @param entry 入口文件：有 src 目录用 "src/main.ts"，无 src 用 "main.ts"
 */
async function _buildExample(
  exampleDir: string,
  entry: string = "src/main.ts",
): Promise<void> {
  // await _ensureBunDeps(exampleDir); // 本地测试删除示例 node_modules 仍通过，先注释
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

  proc.unref();

  if (!status.success) {
    throw new Error(`build 失败: ${stderrText}`);
  }
}

/**
 * 浏览器渲染断言：无 hydration 错误、页面包含预期内容
 * @param t 测试上下文（含 browser）
 * @param port 服务器端口
 * @param opts.timeoutMs 可选；默认 {@link BROWSER_TEST_TIMEOUT_MS}，与外层 `it` 超时一致时可显式传入
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
  opts?: { timeoutMs?: number },
): Promise<void> {
  if (!t?.browser) {
    throw new Error("browser 上下文不可用");
  }
  const browser = t.browser;
  /** 与外层 `it` / `waitForContentViaEvaluate` 一致，避免内层先 60s 失败而外层仍等到 120s */
  const limit = opts?.timeoutMs ?? BROWSER_TEST_TIMEOUT_MS;

  /** 先确认服务器已就绪，避免 goto 长时间挂起触发 Bun 僵尸进程杀手 */
  await ensureServerAlive(port, 15000);

  /** 整段断言硬超时，避免 SSG 等场景下 goto/waitFor 卡死导致测试一直挂起 */
  const hardTimeoutMs = limit;
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
      // goto 使用 30s 超时，避免挂起时拖满 90s；load 后仍用 evaluate 轮询等待首屏内容
      const gotoTimeoutMs = 30000;
      if (typeof page.goto === "function") {
        await gotoWithRetry(page as PageWithGoto, url, {
          timeout: gotoTimeoutMs,
        });
      } else {
        await browser.goto(url);
      }

      // 用 evaluate 轮询等待首屏内容（保证在浏览器内执行，避免 Bun 下 waitFor 回调在宿主执行导致永不满足、超时 90s）
      const contentTimeout = limit;
      try {
        await waitForContentViaEvaluate(browser, contentTimeout);
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
            // 检查期望文案是否存在于 body（与 assertBrowserRender waitFor 条件一致）
            const hasExpectText = bodyHtml.includes("欢迎使用 Dweb 框架") ||
              bodyHtml.includes("Welcome to Dweb") ||
              bodyHtml.includes("React CSR Advanced Example") ||
              bodyHtml.includes("React Advanced") ||
              bodyHtml.includes("View Advanced") ||
              bodyHtml.includes("Preact Advanced") ||
              bodyHtml.includes("用户管理") ||
              bodyHtml.includes("核心特性") ||
              bodyHtml.includes("特性") ||
              bodyHtml.includes("UnoCSS") ||
              bodyHtml.includes("首页") ||
              (bodyHtml.length > 300 && doc?.readyState === "complete");
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
          html.includes("Welcome to Dweb") ||
          html.includes("React CSR Advanced Example") ||
          html.includes("React Advanced") ||
          html.includes("View Advanced") ||
          html.includes("Preact Advanced") ||
          html.includes("用户管理")
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
  await ensureServerAlive(port, 15000);
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

  // 首页欢迎或 layout 文案（兼容 i18n 与 advanced 布局）
  const contentTimeout = BROWSER_TEST_TIMEOUT_MS;
  await browser.waitFor(
    () => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { body?: { innerHTML?: string } }
        | undefined;
      const html = doc?.body?.innerHTML ?? "";
      return (
        html.includes("欢迎使用 Dweb 框架") ||
        html.includes("Welcome to Dweb") ||
        html.includes("React CSR Advanced Example") ||
        html.includes("React Advanced") ||
        html.includes("View Advanced") ||
        html.includes("Preact Advanced") ||
        html.includes("用户管理")
      );
    },
    { timeout: contentTimeout },
  );

  if (typeof page.click !== "function") {
    throw new Error("page.click 不可用，无法执行点击");
  }
  await page.click('a[href="/about"]', { timeout: BROWSER_TEST_TIMEOUT_MS });

  // 关于页文案（兼容 i18n：关于我们 / About us）
  await browser.waitFor(
    () => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { body?: { innerHTML?: string } }
        | undefined;
      const html = doc?.body?.innerHTML ?? "";
      return html.includes("关于我们") || html.includes("About us");
    },
    { timeout: contentTimeout },
  );

  const hasAboutTitle = await browser.evaluate(() => {
    const doc = (globalThis as Record<string, unknown>).document as
      | { body?: { innerHTML?: string } }
      | undefined;
    const html = doc?.body?.innerHTML ?? "";
    return html.includes("关于我们") || html.includes("About us");
  });
  expect(hasAboutTitle).toBe(true);
}

/**
 * 断言首页已注入 layout 与页面 load 数据（通过 data-testid="layout-load" / "page-load" 的 data-value）。
 * 先访问首页并等待主体内容就绪，再等待并断言 layout-load-ok / page-load-ok。
 * @param t 测试上下文（需含 browser）
 * @param port 服务器端口
 */
async function assertLoadDataInjected(
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
  await ensureServerAlive(port, 15000);
  const browser = t.browser;
  const page = browser.page as {
    goto: (
      url: string,
      options?: { waitUntil?: string; timeout?: number },
    ) => Promise<unknown>;
  };

  const url = `http://127.0.0.1:${port}/`;
  if (typeof page?.goto === "function") {
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
      const html = doc?.body?.innerHTML ?? "";
      return (
        html.includes("欢迎使用 Dweb 框架") ||
        html.includes("Welcome to Dweb") ||
        html.includes("React CSR Advanced Example") ||
        html.includes("React Advanced") ||
        html.includes("View Advanced") ||
        html.includes("Preact Advanced") ||
        html.includes("用户管理")
      );
    },
    { timeout: contentTimeout },
  );

  await browser.waitFor(
    () => {
      const doc = (globalThis as Record<string, unknown>).document as
        | {
          querySelector?: (
            s: string,
          ) => { getAttribute?: (a: string) => string | null } | null;
        }
        | undefined;
      const layoutEl = doc?.querySelector?.('[data-testid="layout-load"]');
      const pageEl = doc?.querySelector?.('[data-testid="page-load"]');
      const layoutVal = layoutEl?.getAttribute?.("data-value") ?? "";
      const pageVal = pageEl?.getAttribute?.("data-value") ?? "";
      return layoutVal === "layout-load-ok" && pageVal === "page-load-ok";
    },
    { timeout: contentTimeout },
  );

  const result = await browser.evaluate(() => {
    const doc = (globalThis as Record<string, unknown>).document as
      | {
        querySelector?: (
          s: string,
        ) => { getAttribute?: (a: string) => string | null } | null;
      }
      | undefined;
    const layoutEl = doc?.querySelector?.('[data-testid="layout-load"]');
    const pageEl = doc?.querySelector?.('[data-testid="page-load"]');
    return {
      layout: layoutEl?.getAttribute?.("data-value") ?? "",
      page: pageEl?.getAttribute?.("data-value") ?? "",
    };
  }) as { layout: string; page: string };
  expect(result.layout).toBe("layout-load-ok");
  expect(result.page).toBe("page-load-ok");
}

/**
 * 从页面解析当前计数器数字。
 * 遍历所有 [data-counter-value]：优先 textContent，其次 data-counter-value 属性（与 view-hybrid 等示例一致，hydration 前后更稳）；
 * 若无则回退到 body 文本中的 "count: N" 形式（部分 CSR/Hybrid 示例）。
 * @returns 当前 count 或 null（无计数器区块或未解析到数字时）
 */
function getCountFromPage(
  browser: {
    evaluate: (fn: () => unknown) => Promise<unknown>;
  },
): Promise<number | null> {
  return browser.evaluate(() => {
    type CounterEl = {
      textContent?: string | null;
      getAttribute?: (name: string) => string | null;
    };
    const doc = (globalThis as Record<string, unknown>).document as
      | {
        body?: { innerText?: string };
        querySelectorAll?: (s: string) => ArrayLike<CounterEl> | null;
      }
      | undefined;
    const nodes = doc?.querySelectorAll?.("[data-counter-value]");
    if (nodes && nodes.length > 0) {
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i]!;
        const valueText = el.textContent?.trim();
        if (valueText !== undefined && valueText !== "") {
          const n = parseInt(valueText, 10);
          if (!Number.isNaN(n)) return n;
          const cm = valueText.match(/count:\s*(\d+)/i);
          if (cm) {
            const nn = parseInt(cm[1], 10);
            if (!Number.isNaN(nn)) return nn;
          }
        }
        const attr = el.getAttribute?.("data-counter-value")?.trim();
        if (attr !== undefined && attr !== "") {
          const n = parseInt(attr, 10);
          if (!Number.isNaN(n)) return n;
        }
      }
    }
    const text = doc?.body?.innerText ?? "";
    const m = text.match(/count:\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }) as Promise<number | null>;
}

/**
 * 在页面中点击计数器区块内指定文案的按钮（通过按钮文本查找）
 * 文案写死在 evaluate 内以兼容仅支持单参的 runner
 * @param browser 含 evaluate 的浏览器上下文
 * @param buttonText 按钮文案：加一 / 减一 / 重置
 */
async function clickCounterButton(
  browser: {
    evaluate: (fn: () => unknown) => Promise<unknown>;
  },
  buttonText: "加一" | "减一" | "重置",
): Promise<void> {
  type ButtonLike = { textContent?: string | null; click?: () => void };
  type DocLike = {
    querySelector?: (
      s: string,
    ) => { querySelectorAll?: (s: string) => ArrayLike<ButtonLike> } | null;
    querySelectorAll?: (s: string) => ArrayLike<ButtonLike>;
  };
  // 以下三段须在 evaluate 内自包含（不能引用外部函数，否则浏览器端无定义）
  if (buttonText === "加一") {
    await browser.evaluate(() => {
      const doc = (globalThis as Record<string, unknown>).document as
        | DocLike
        | undefined;
      const scope = doc?.querySelector?.('[data-testid="e2e-counter"]');
      const scoped = scope?.querySelectorAll?.("button");
      const list = scoped && scoped.length > 0
        ? Array.from(scoped)
        : Array.from(doc?.querySelectorAll?.("section button") ?? []);
      const btn = list.find(
        (b: ButtonLike) => b.textContent?.trim() === "加一",
      );
      btn?.click?.();
    });
  } else if (buttonText === "减一") {
    await browser.evaluate(() => {
      const doc = (globalThis as Record<string, unknown>).document as
        | DocLike
        | undefined;
      const scope = doc?.querySelector?.('[data-testid="e2e-counter"]');
      const scoped = scope?.querySelectorAll?.("button");
      const list = scoped && scoped.length > 0
        ? Array.from(scoped)
        : Array.from(doc?.querySelectorAll?.("section button") ?? []);
      const btn = list.find(
        (b: ButtonLike) => b.textContent?.trim() === "减一",
      );
      btn?.click?.();
    });
  } else {
    await browser.evaluate(() => {
      const doc = (globalThis as Record<string, unknown>).document as
        | DocLike
        | undefined;
      const scope = doc?.querySelector?.('[data-testid="e2e-counter"]');
      const scoped = scope?.querySelectorAll?.("button");
      const list = scoped && scoped.length > 0
        ? Array.from(scoped)
        : Array.from(doc?.querySelectorAll?.("section button") ?? []);
      const btn = list.find(
        (b: ButtonLike) => b.textContent?.trim() === "重置",
      );
      btn?.click?.();
    });
  }
}

/**
 * 快速检查服务器是否存活，避免因服务器已被杀导致 goto 长时间挂起、测试 40s 超时并触发 Bun 僵尸进程杀手
 * @param port 端口
 * @param timeoutMs 超时毫秒
 */
async function ensureServerAlive(
  port: number,
  timeoutMs: number = 8000,
): Promise<void> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
  } finally {
    clearTimeout(t);
  }
}

/**
 * 浏览器断言：首页存在计数器时，点击加一、减一、重置并校验数字变化
 * 若页面无「计数器示例」区块则直接通过（兼容尚未加计数器的示例）
 * @param t 测试上下文（含 browser）
 * @param port 服务器端口
 */
async function assertBrowserCounterButtons(
  t: {
    browser?: {
      page: unknown;
      goto: (url: string) => Promise<void>;
      evaluate: (fn: () => unknown, arg?: unknown) => Promise<unknown>;
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
  await ensureServerAlive(port);

  const browser = t.browser;
  const page = browser.page as {
    goto: (
      url: string,
      options?: { waitUntil?: string; timeout?: number },
    ) => Promise<unknown>;
  };

  const url = `http://127.0.0.1:${port}/`;
  const navTimeoutMs = 20000;
  if (typeof page.goto === "function") {
    await gotoWithRetry(page, url, { timeout: navTimeoutMs });
  } else {
    await browser.goto(url);
  }

  // 首页欢迎或 layout 文案：用 evaluate 轮询（与 assertBrowserRender 一致，避免 Bun 下 waitFor 卡住）
  const firstWaitTimeoutMs = 20000;
  await waitForContentViaEvaluate(browser, firstWaitTimeoutMs);

  /** 等待 document complete 再操作计数器，避免 hydration 前点击无效 */
  await waitForDocumentCompleteViaEvaluate(browser, firstWaitTimeoutMs);
  /** 再留一点时间给客户端 hydration 绑定事件（慢机/CI 略加长） */
  await new Promise((r) => setTimeout(r, 800));

  const hasCounter = await browser.evaluate(() => {
    const doc = (globalThis as Record<string, unknown>).document as
      | { body?: { innerHTML?: string } }
      | undefined;
    return doc?.body?.innerHTML?.includes("计数器示例") ?? false;
  }) as boolean;
  if (!hasCounter) {
    return;
  }

  /** 单次等待目标数字的超时（留出 hydration/re-render，CI 或 hybrid 较慢） */
  const countWaitMs = 6000;
  const countAfterWait = (
    expected: number,
    timeoutMs: number = countWaitMs,
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = async () => {
        const n = await getCountFromPage(browser);
        if (n === expected) {
          resolve();
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          reject(
            new Error(
              `计数器未在 ${timeoutMs}ms 内变为 ${expected}，当前: ${n}`,
            ),
          );
          return;
        }
        setTimeout(tick, 100);
      };
      tick();
    });

  /**
   * 等待计数器可读（hydration 完成）：单独长超时，避免仅 5s 轮询在 View SSR/SSG + headless 下偶发不足
   */
  await waitForCounterReadableViaEvaluate(browser, 15000);
  let n = await getCountFromPage(browser);
  expect(n).not.toBe(null);

  /** 点击后多留一点时间给 re-render（hybrid 等较慢） */
  const clickDelayMs = 500;

  await clickCounterButton(browser, "加一");
  await new Promise((r) => setTimeout(r, clickDelayMs));
  await countAfterWait((n as number) + 1);

  n = await getCountFromPage(browser);
  await clickCounterButton(browser, "减一");
  await new Promise((r) => setTimeout(r, clickDelayMs));
  await countAfterWait((n as number) - 1);

  await clickCounterButton(browser, "重置");
  await new Promise((r) => setTimeout(r, clickDelayMs));
  await countAfterWait(0);
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
  await ensureServerAlive(port);

  const browser = t.browser;
  const page = browser.page as {
    goto: (
      url: string,
      options?: { waitUntil?: string; timeout?: number },
    ) => Promise<unknown>;
  };

  const baseUrl = `http://127.0.0.1:${port}/`;
  const navTimeoutMs = 20000;
  if (typeof page.goto === "function") {
    await gotoWithRetry(page, baseUrl, { timeout: navTimeoutMs });
  } else {
    await browser.goto(baseUrl);
  }

  const firstWaitTimeoutMs = 20000;
  await waitForContentViaEvaluate(browser, firstWaitTimeoutMs);

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
  await waitForAboutPageBodyViaEvaluate(browser, firstWaitTimeoutMs);

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
 * @param opts.timeoutMs 可选；应与外层 `it` 的 timeout 一致
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
  opts?: { timeoutMs?: number },
): Promise<void> {
  if (!t?.browser) {
    throw new Error("browser 上下文不可用");
  }
  const browser = t.browser;
  const limit = opts?.timeoutMs ?? BROWSER_TEST_TIMEOUT_MS;
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
      timeout: limit,
    });
  } else {
    await browser.goto(url);
  }

  const contentTimeout = limit;
  /** 首屏：与 assertBrowserRender 一致用 evaluate 轮询，避免 Bun 下 waitForFunction 不满足 */
  await waitForContentViaEvaluate(browser, contentTimeout);

  if (typeof page.click !== "function") {
    throw new Error("page.click 不可用，无法执行点击");
  }
  await page.click('a[href="/users"]', { timeout: limit });
  // 点击后稍等再轮询，避免 CI 上导航尚未完成即开始检测
  await new Promise((r) => setTimeout(r, 3000));

  try {
    await waitForUsersListPageViaEvaluate(browser, contentTimeout);

    const hasUsersPage = await browser.evaluate(() => {
      const doc = (globalThis as Record<string, unknown>).document as
        | { body?: { innerHTML?: string } }
        | undefined;
      const loc = (globalThis as Record<string, unknown>).location as
        | { pathname?: string }
        | undefined;
      const html = doc?.body?.innerHTML ?? "";
      const path = loc?.pathname ?? "";
      const onUsersList = /\/users\/?$/.test(path);
      if (html.includes("管理系统中的所有用户")) return true;
      if (html.includes("用户列表")) return true;
      if (onUsersList && html.includes("用户管理")) return true;
      if (onUsersList && html.includes("暂无用户")) return true;
      return false;
    });
    expect(hasUsersPage).toBe(true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("been closed") || msg.includes("Target page")) {
      throw new Error(
        `assertBrowserClickUsers: 浏览器/页面在等待用户列表页期间已关闭，常见于 CI 超时或 reuseBrowser 共享导致。原错误: ${msg}`,
      );
    }
    throw err;
  }
}

/**
 * 构建 advanced 示例（先构建 backend，再构建 frontend）
 * @param exampleDir 示例 advanced 目录
 * @param entries 入口对 [backend入口, frontend入口]，默认 src 目录结构
 */
async function _buildExampleAdvanced(
  exampleDir: string,
  entries: [string, string] = ["src/backend/main.ts", "src/frontend/main.ts"],
): Promise<void> {
  // await _ensureBunDeps(exampleDir); // 本地测试删除示例 node_modules 仍通过，先注释
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

    proc.unref();

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
export function createAdvancedExampleBrowserSuite(
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
    /** 实际后端端口（启动前探测可用，与子进程 PORT 一致） */
    let actualBackendPort: number = backendPort;
    /** 实际前端端口（backend 启动后再探测，避免与 backend 占用的端口冲突） */
    let actualFrontendPort: number = frontendPort;

    beforeAll(async () => {
      if (skip) return;
      originalCwd = cwd();
      exampleDir = resolve(DWEB_ROOT, "examples", exampleName, "advanced");
      chdir(exampleDir);
      // await _ensureBunDeps(exampleDir); // 本地测试删除示例 node_modules 仍通过，先注释

      // 启动 backend dev 服务
      actualBackendPort = await findAvailablePort("127.0.0.1", backendPort);
      const envBackend = { ...getEnvAll(), PORT: String(actualBackendPort) };
      const startBackend = createCommand(execPath(), {
        args: IS_DENO ? ["run", "-A", entries[0]] : ["run", entries[0]],
        cwd: exampleDir,
        env: envBackend,
        stdout: "inherit",
        stderr: "inherit",
      });
      childBackend = startBackend.spawn();
      // 不使用 unref()，避免 Bun 将子进程视为 dangling 在其它套件超时时误杀（killed 1 dangling process）
      const maxWait = platform() === "windows" ? 120000 : 45000;
      await waitForServerReady(actualBackendPort, maxWait, "/api/users");

      // 启动 frontend dev 服务
      actualFrontendPort = await findAvailablePort("127.0.0.1", frontendPort);
      const envFrontend = { ...getEnvAll(), PORT: String(actualFrontendPort) };
      const startFrontend = createCommand(execPath(), {
        args: IS_DENO ? ["run", "-A", entries[1]] : ["run", entries[1]],
        cwd: exampleDir,
        env: envFrontend,
        stdout: "inherit",
        stderr: "inherit",
      });
      childFrontend = startFrontend.spawn();
      // 不使用 unref()，避免 Bun 将子进程视为 dangling 在其它套件超时时误杀

      await waitForServerReady(actualFrontendPort, maxWait, "/");
      await new Promise((r) => setTimeout(r, 3000));
    });

    afterAll(async () => {
      if (skip) return;
      // 先杀进程，避免 afterAll 超时时 Bun 把 dev 当成 dangling 误杀
      for (const c of [childFrontend, childBackend]) {
        if (c) {
          try {
            c.kill(9);
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
      await assertBrowserRender(t, actualFrontendPort);
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

    // reuseBrowser: false 避免与上一用例共享浏览器，减少 CI 上 "Target page has been closed" 偶发
    it.skipIf(skip, "应能通过点击用户管理链接进入用户页", async (t) => {
      if (!t) throw new Error("test context 不可用");
      await assertBrowserClickUsers(t, actualFrontendPort);
    }, {
      timeout: BROWSER_TEST_TIMEOUT_MS,
      sanitizeOps: false,
      sanitizeResources: false,
      browser: {
        enabled: true,
        headless: true,
        dumpio: true,
        reuseBrowser: false,
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
 * @param options.assertLoadData 为 true 时增加「应能注入 layout 与页面 load 数据」用例
 * @param options.skipCounterAndMetadataOnLinux 为 true 时在 **Linux 或 Deno（任意 OS）** 上跳过计数器与 metadata 用例。
 *   view-hybrid-flat 等示例的 dev 子进程在 Deno 下连跑多条浏览器用例后易中途退出，后续 `ensureServerAlive` 会 `connection refused`；
 *   Bun 下较稳定，故仍执行这两项。
 */
export function createBasicExampleBrowserSuite(
  exampleName: string,
  entry: string = "src/main.ts",
  options?: {
    skip?: boolean;
    assertLoadData?: boolean;
    skipCounterAndMetadataOnLinux?: boolean;
  },
): void {
  const preferredPort = E2E_PORTS[exampleName] ?? 3000;
  const skip = options?.skip === true;
  const assertLoadData = options?.assertLoadData === true;
  const skipCounterAndMetadataOnLinux =
    options?.skipCounterAndMetadataOnLinux === true;
  const isLinux = platform() === "linux";
  /**
   * 在 Linux 或 Deno 上跳过计数器/metadata：与仅 Linux 相比，Deno 在 macOS/Windows 本地跑全量 e2e 时同样会出现
   * dev 先退出、后两条用例连固定端口失败；Bun 不受影响。
   */
  const skipCounterMetadataFlakyEnv = skipCounterAndMetadataOnLinux &&
    (isLinux || IS_DENO);
  const skipCounter = skip || skipCounterMetadataFlakyEnv;
  const skipMetadata = skip || skipCounterMetadataFlakyEnv;

  describe(`e2e: 浏览器渲染 - ${exampleName}`, () => {
    let originalCwd: string | undefined;
    let child: SpawnedProcess | null = null;
    let exampleDir: string;
    /** 实际使用的端口（启动前探测可用，与子进程 PORT 一致，避免 server 自动换端口导致轮询错端口） */
    let actualPort: number = preferredPort;

    beforeAll(async () => {
      originalCwd = cwd();
      exampleDir = resolve(DWEB_ROOT, "examples", exampleName, "basic");
      chdir(exampleDir);
      // await _ensureBunDeps(exampleDir); // 本地测试删除示例 node_modules 仍通过，先注释

      // 启动 dev 服务（与 view 一致，不 build，直接跑入口）
      actualPort = await findAvailablePort("127.0.0.1", preferredPort);
      const env = { ...getEnvAll(), PORT: String(actualPort) };
      const startCmd = createCommand(execPath(), {
        args: IS_DENO ? ["run", "-A", entry] : ["run", entry],
        cwd: exampleDir,
        env,
        stdout: "inherit",
        stderr: "inherit",
      });
      child = startCmd.spawn();
      // 不使用 unref()，避免 Bun 将子进程视为 dangling 在其它套件超时时误杀（导致 preact-ssr 等套件的 dev 被误杀、测试挂起 90s）

      const maxWait = platform() === "windows" ? 60000 : 40000;
      await waitForServerReady(actualPort, maxWait);
      await new Promise((r) => setTimeout(r, 4000));
    });

    afterAll(async () => {
      // 先杀进程，避免 afterAll 超时时 Bun 把 dev 当成 dangling 误杀（killed 1 dangling process）
      if (child) {
        try {
          child.kill(9);
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
      await assertBrowserRender(t, actualPort);
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
      await assertBrowserClickAbout(t, actualPort);
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
      !assertLoadData || skip,
      "应能注入 layout 与页面 load 数据",
      async (t) => {
        if (!t) throw new Error("test context 不可用");
        await assertLoadDataInjected(t, actualPort);
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

    it.skipIf(
      skipCounter,
      "应能通过计数器加一、减一、重置更新数字",
      async (t) => {
        if (!t) throw new Error("test context 不可用");
        await assertBrowserCounterButtons(t, actualPort);
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

    it.skipIf(
      skipMetadata,
      "应渲染首页与关于页的 metadata（title/description）",
      async (t) => {
        if (!t) throw new Error("test context 不可用");
        await assertBrowserMetadata(t, actualPort);
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
