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
    routesDir = join(testDir, "src", "routes");
    await ensureDir(routesDir);
    pagePath = join(routesDir, "index.tsx");
    layoutPath = join(routesDir, "_layout.tsx");
    errorPagePath = join(routesDir, "error.tsx");
    await writeTextFile(
      pagePath,
      `
export const metadata = { title: "Home </script>", description: "Desc <safe>" };
export function load(ctx) {
  return { greeting: "hello", user: ctx.session?.user ?? null };
}
`,
    );
    await writeTextFile(
      layoutPath,
      `
export function load() {
  return { shell: "layout" };
}
`,
    );
    await writeTextFile(
      errorPagePath,
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
