/**
 * Load 数据接口中间件测试。
 *
 * 覆盖 `/__data` 在客户端导航时的关键契约：只处理 GET、路由匹配、
 * layout/page load 数据、metadata 序列化与错误响应。
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
import type { Router } from "@dreamer/router";
import type { HttpContext } from "@dreamer/server";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import {
  createLoadDataMiddleware,
  DWEB_DATA_PATH,
} from "../../src/feature/load-data-middleware.ts";
import type { AppConfig } from "../../src/types/app.ts";
import { initializeLogger } from "../../src/utils/logger.ts";

/**
 * 注册测试用最小 App 实例，满足渲染与 load-data 中间件对 `container.get("app")` 的依赖。
 *
 * @param container 服务容器。
 */
function registerMockApp(
  container: ReturnType<typeof initializeServiceContainer>,
) {
  container.registerSingleton("app", () => ({
    name: "test-app",
    version: "0.0.0",
    container,
    stage: "init",
    use() {},
    registerPlugin() {},
    on() {},
    start: async () => {},
    stop: async () => {},
    shutdown: async () => {},
  }));
}

/** 创建测试用 HttpContext，并记录 next 是否被调用。 */
function mockContext(pathname: string, method = "GET") {
  let nextCalled = false;
  const url = new URL(`http://localhost${pathname}`);
  const ctx = {
    path: url.pathname,
    method,
    request: new Request(url, { method }),
    url,
    response: undefined as Response | undefined,
  };
  return {
    ctx,
    next: () => {
      nextCalled = true;
      return Promise.resolve();
    },
    nextCalled: () => nextCalled,
  };
}

/** 从 JSON 响应中读取对象。 */
async function readJson(response: Response | undefined) {
  expect(response).toBeDefined();
  return await response!.json() as Record<string, unknown>;
}

describe("Load 数据接口中间件 (load-data-middleware.ts)", () => {
  let testDir: string;
  let originalCwd: string;
  let routesDir: string;
  let pagePath: string;
  let layoutPath: string;
  let errorPagePath: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-load-data-" });
    originalCwd = cwd();
    chdir(testDir);
    /**
     * 使用**相对** `cwd()` 的 routes 路径，避免 Windows 上 `makeTempDir` 返回的绝对路径
     * 与 `chdir` 后 `process.cwd` / `realPath` 的 8.3/长名表示不一致，导致
     * `isPathWithinProject` 误判、`loadRouteModule` 返回 null、本套件断言失败。
     */
    routesDir = join("src", "routes");
    const routesDirAbs = join(cwd(), routesDir);
    await ensureDir(routesDirAbs);
    pagePath = join("src", "routes", "index.tsx");
    layoutPath = join("src", "routes", "_layout.tsx");
    errorPagePath = join("src", "routes", "error.tsx");
    await writeTextFile(
      join(cwd(), pagePath),
      `
export const metadata = { title: "Home </script>", description: "Desc <safe>" };
export function load(ctx) {
  return { greeting: "hello", user: ctx.session?.user ?? null };
}
`,
    );
    await writeTextFile(
      join(cwd(), layoutPath),
      `
export function load() {
  return { shell: "layout" };
}
`,
    );
    await writeTextFile(
      join(cwd(), errorPagePath),
      `
export function load() {
  throw new Error("boom <script>");
}
`,
    );
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  function createMiddleware(router: Router) {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      router: { routesDir },
      render: { engine: "view" },
    };
    initializeLogger(container, config);
    return createLoadDataMiddleware(container, router, config);
  }

  it("非 /__data 或非 GET 请求应交给 next", async () => {
    const router = { match: () => null } as unknown as Router;
    const middleware = createMiddleware(router);
    const other = mockContext("/about");
    await middleware(other.ctx as HttpContext, other.next);
    expect(other.nextCalled()).toBe(true);

    const post = mockContext(DWEB_DATA_PATH, "POST");
    await middleware(post.ctx as HttpContext, post.next);
    expect(post.nextCalled()).toBe(true);
  });

  it("路由未匹配时应返回 404 JSON", async () => {
    const router = {
      match: () => null,
    } as unknown as Router;
    const middleware = createMiddleware(router);
    const req = mockContext(`${DWEB_DATA_PATH}?path=/missing`);

    await middleware(req.ctx as HttpContext, req.next);

    expect(req.ctx.response?.status).toBe(404);
    const body = await readJson(req.ctx.response);
    expect(body.error).toBe("not_found");
  });

  it("应返回 page load、layoutData 与 metadata HTML", async () => {
    const router = {
      match: () => ({
        isApi: false,
        params: { id: "1" },
        query: {},
        route: { path: "/", fullPath: pagePath },
      }),
      getLayoutPathsForPath: () => [layoutPath],
    } as unknown as Router;
    const middleware = createMiddleware(router);
    const req = mockContext(`${DWEB_DATA_PATH}?path=/&filter=on`);
    (req.ctx as { session?: unknown }).session = { user: "alice" };

    await middleware(req.ctx as HttpContext, req.next);

    expect(req.ctx.response?.status).toBe(200);
    const body = await readJson(req.ctx.response);
    expect(body.params).toEqual({ id: "1" });
    expect(body.query).toEqual({ filter: "on" });
    expect(body.data).toEqual({ greeting: "hello", user: "alice" });
    expect(body.layoutData).toEqual([{ data: { shell: "layout" } }]);
    expect(String(body.metadataTitleHtml)).toContain("<title");
    expect(String(body.metadataTagsHtml)).toContain("description");
  });

  it("page load 抛错时应返回收敛后的 500 JSON", async () => {
    const router = {
      match: () => ({
        isApi: false,
        params: {},
        query: {},
        route: { path: "/error", fullPath: errorPagePath },
      }),
      getLayoutPathsForPath: () => [],
    } as unknown as Router;
    const middleware = createMiddleware(router);
    const req = mockContext(`${DWEB_DATA_PATH}?path=/error`);

    await middleware(req.ctx as HttpContext, req.next);

    expect(req.ctx.response?.status).toBe(500);
    const body = await readJson(req.ctx.response);
    expect(body.error).toBe("load_failed");
    expect(typeof body.message).toBe("string");
  });
});
