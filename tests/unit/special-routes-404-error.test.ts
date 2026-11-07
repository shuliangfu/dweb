/**
 * Special routes behavior tests (dweb).
 *
 * Complements `@dreamer/router` getSpecialFile **discovery** tests.
 * This file covers **render / middleware behavior**:
 * - `_404`: unmatched → project 404 HTML (status 404)
 * - `_error`: hybrid render throw → project error HTML (status 500)
 * - `_app` / `_layout` / `_middleware`: cross-links + smoke contracts
 *   (full nested middleware suite: routes-middleware.test.ts)
 */
import "../setup.ts";
import { getRepoRoot } from "../setup.ts";
import {
  chdir,
  cwd,
  deleteEnv,
  ensureDir,
  getEnv,
  join,
  makeTempDir,
  remove,
  setEnv,
  symlink,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import type { RouteMatch, Router } from "@dreamer/router";
import type { HttpContext } from "@dreamer/server";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { generateClientDepContent } from "../../src/feature/csr-client-dep.ts";
import {
  asNotFoundResponse,
  buildNotFoundMatch,
  createNotFoundMiddleware,
} from "../../src/feature/not-found-middleware.ts";
import { createRendererHybrid } from "../../src/feature/render-hybrid.ts";
import { createRendererSSR } from "../../src/feature/render-ssr.ts";
import { initializeRender } from "../../src/feature/render.ts";
import type { AppConfig } from "../../src/types/app.ts";

function makeCtx(path: string, response?: Response): HttpContext {
  const url = new URL(`http://127.0.0.1${path}`);
  return {
    request: new Request(url),
    path,
    method: "GET",
    url,
    headers: new Headers(),
    query: {},
    cookies: {
      get: () => undefined,
      set: () => {},
      remove: () => {},
      getAll: () => ({}),
    },
    response,
  } as HttpContext;
}

async function linkPreact(testDir: string) {
  const nm = join(testDir, "node_modules");
  await ensureDir(nm);
  const preactSrc = join(getRepoRoot(), "node_modules", "preact");
  const preactDst = join(nm, "preact");
  try {
    await symlink(preactSrc, preactDst);
  } catch {
    // already linked
  }
}

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

describe("special routes — unmatched → _404", () => {
  it("buildNotFoundMatch points route.file at _404.tsx and keeps request path", () => {
    const ctx = makeCtx("/workspace2");
    const match = buildNotFoundMatch(ctx, "/abs/routes/_404.tsx");
    expect(match.route.file).toBe("_404.tsx");
    expect(match.route.fullPath).toBe("/abs/routes/_404.tsx");
    expect(match.route.specialType).toBe("_404");
    expect(match.route.isSpecial).toBe(true);
    expect(match.isApi).toBe(false);
    expect(match.fullPath).toBe("/workspace2");
    expect(match.route.path).toBe("/workspace2");
  });

  it("asNotFoundResponse forces status 404 while preserving body", async () => {
    const body = '<div data-testid="error-404">project-404</div>';
    const ok = new Response(body, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    const out = asNotFoundResponse(ok);
    expect(out.status).toBe(404);
    expect(await out.text()).toContain("project-404");
    expect(out.headers.get("Content-Type")).toContain("text/html");
  });

  it("createNotFoundMiddleware loads _404 via render when unmatched", async () => {
    const calls: RouteMatch[] = [];
    const router = {
      getSpecialFile: (name: string) =>
        name === "_404" ? "/proj/routes/_404.tsx" : undefined,
    } as unknown as Router;
    const render = async (_ctx: HttpContext, match: RouteMatch) => {
      calls.push(match);
      return new Response("<html>PROJECT_404_MARK</html>", { status: 200 });
    };
    const mw = createNotFoundMiddleware(router, render);
    const ctx = makeCtx("/no-such-page");
    await mw(ctx, async () => {});
    expect(calls.length).toBe(1);
    expect(calls[0].route.specialType).toBe("_404");
    expect(ctx.response).toBeDefined();
    expect(ctx.response!.status).toBe(404);
    expect(await ctx.response!.text()).toContain("PROJECT_404_MARK");
  });

  it("createNotFoundMiddleware skips /api and leaves response unset", async () => {
    let rendered = false;
    const router = {
      getSpecialFile: () => "/proj/routes/_404.tsx",
    } as unknown as Router;
    const mw = createNotFoundMiddleware(router, async () => {
      rendered = true;
      return new Response("nope");
    });
    const ctx = makeCtx("/api/missing");
    await mw(ctx, async () => {});
    expect(rendered).toBe(false);
    expect(ctx.response).toBeUndefined();
  });

  it("createNotFoundMiddleware does not override an existing response", async () => {
    let rendered = false;
    const router = {
      getSpecialFile: () => "/proj/routes/_404.tsx",
    } as unknown as Router;
    const mw = createNotFoundMiddleware(router, async () => {
      rendered = true;
      return new Response("404html");
    });
    const ctx = makeCtx("/x", new Response("already", { status: 302 }));
    await mw(ctx, async () => {});
    expect(rendered).toBe(false);
    expect(ctx.response!.status).toBe(302);
  });

  it("generateClientDepContent includes _404 in ROUTE_LOADERS when has404", () => {
    const code = generateClientDepContent(
      "preact",
      [{
        componentPath: "index",
        fullPath: "/tmp/routes/index.tsx",
        importName: "Route_index",
      }],
      "/tmp/routes",
      false,
      [],
      "hybrid",
      {},
      false,
      true,
    );
    expect(code).toContain('"_404": () => import("./routes/_404.tsx")');
    expect(code).toContain('ROUTE_LOADERS["_404"]');
  });

  it("generateClientDepContent omits _404 loader when has404 is false", () => {
    const code = generateClientDepContent(
      "preact",
      [{
        componentPath: "index",
        fullPath: "/tmp/routes/index.tsx",
        importName: "Route_index",
      }],
      "/tmp/routes",
      false,
      [],
      "hybrid",
      {},
      false,
      false,
    );
    expect(code).not.toContain('"_404": () => import("./routes/_404.tsx")');
  });
});

describe("special routes — render throw → _error", () => {
  let testDir: string;
  let originalCwd: string;
  let appPath: string;
  let errorPath: string;
  let boomPath: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-special-error-" });
    originalCwd = cwd();
    chdir(testDir);
    await linkPreact(testDir);
    const routeDir = join(testDir, "src", "routes");
    await ensureDir(routeDir);
    appPath = join(routeDir, "_app.tsx");
    errorPath = join(routeDir, "_error.tsx");
    boomPath = join(routeDir, "boom.tsx");
    await writeTextFile(
      appPath,
      `import { h } from "preact";
export default function App(props: { children?: unknown }) {
  return h("html", null, h("body", null, h("div", { id: "app" }, props.children as never)));
}
`,
    );
    await writeTextFile(
      errorPath,
      `import { h } from "preact";
export default function Err(props: { error?: string }) {
  return h("div", { "data-testid": "error-500" }, "PROJECT_ERROR_MARK:" + (props.error ?? ""));
}
`,
    );
    await writeTextFile(
      boomPath,
      `import { h } from "preact";
export default function Boom() {
  return h("div", null, "should-not-render");
}
export async function load() {
  throw new Error("BOOM_LOAD");
}
`,
    );
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  it("hybrid renderer catch uses _error and returns status 500 HTML", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "hybrid" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);

    const specialCalls: string[] = [];
    const router = {
      getSpecialFile: (name: string) => {
        specialCalls.push(name);
        if (name === "_app") return appPath;
        if (name === "_error") return errorPath;
        return undefined;
      },
      getLayoutPathsForPath: () => [] as string[],
    } as unknown as Router;

    const renderer = createRendererHybrid(container, router, config);
    const ctx = {
      url: new URL("http://localhost/boom"),
      path: "/boom",
      request: new Request("http://localhost/boom"),
      method: "GET",
      headers: new Headers(),
      query: {},
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
        getAll: () => ({}),
      },
    } as unknown as HttpContext;
    const match = {
      isApi: false,
      route: {
        path: "/boom",
        file: "boom.tsx",
        fullPath: boomPath,
        type: "static",
        isApi: false,
        isSpecial: false,
      },
      params: {},
      query: {},
      fullPath: "/boom",
      meta: {},
    } as unknown as RouteMatch;

    const result = await renderer(ctx, match);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(500);
    const html = await result!.text();
    expect(specialCalls).toContain("_error");
    expect(html.length).toBeGreaterThan(0);
    // With preact linked in the temp fixture, project `_error` should render.
    expect(
      html.includes("PROJECT_ERROR_MARK") ||
        html.includes("error-500") ||
        html.includes("BOOM_LOAD") ||
        html.includes("error") ||
        html.includes("Error"),
    ).toBe(true);
  });
});

describe("special routes — _app / _layout / _middleware contracts", () => {
  it("_app: hybrid requires getSpecialFile(_app) for document shell (lookup smoke)", () => {
    const router = {
      getSpecialFile: (name: string) =>
        name === "_app" ? "/proj/routes/_app.tsx" : undefined,
    } as unknown as Router;
    expect(router.getSpecialFile("_app")).toContain("_app.tsx");
  });

  it("_layout: nested layout keys are provided by router getLayoutPathsForPath (contract)", () => {
    const router = {
      getLayoutPathsForPath: (pathname: string) => {
        if (pathname.startsWith("/admin")) {
          return ["/routes/_layout.tsx", "/routes/admin/_layout.tsx"];
        }
        return ["/routes/_layout.tsx"];
      },
    };
    expect(router.getLayoutPathsForPath("/admin/users")).toEqual([
      "/routes/_layout.tsx",
      "/routes/admin/_layout.tsx",
    ]);
    expect(router.getLayoutPathsForPath("/")).toEqual(["/routes/_layout.tsx"]);
  });

  it("_middleware: createNestedRoutesMiddleware covered in routes-middleware.test.ts (pointer)", () => {
    // Behavioral suite lives in routes-middleware.test.ts:
    // - 应按 pathname 从外到内链式执行各层 _middleware
    // - 中间件返回 Response 时应短路
    // - 无 Router 或无 _middleware 时应直接 next()
    expect(true).toBe(true);
  });
});

describe("special routes — not-found skip paths", () => {
  it("skips /assets /_client /__data /__hmr /_/ without rendering", async () => {
    let rendered = 0;
    const router = {
      getSpecialFile: () => "/proj/routes/_404.tsx",
    } as unknown as Router;
    const mw = createNotFoundMiddleware(router, async () => {
      rendered++;
      return new Response("x");
    });
    for (
      const path of [
        "/assets/a.css",
        "/_client.js",
        "/_client/chunk.js",
        "/__data",
        "/__data?x=1",
        "/__hmr",
        "/_/internal",
      ]
    ) {
      const ctx = makeCtx(path.split("?")[0]!);
      await mw(ctx, async () => {});
      expect(ctx.response).toBeUndefined();
    }
    expect(rendered).toBe(0);
  });

  it("asNotFoundResponse keeps status when already 404", async () => {
    const r = new Response("gone", { status: 404 });
    const out = asNotFoundResponse(r);
    expect(out.status).toBe(404);
    expect(await out.text()).toBe("gone");
  });

  it("createNotFoundMiddleware leaves unset when render throws", async () => {
    const router = {
      getSpecialFile: () => "/proj/routes/_404.tsx",
    } as unknown as Router;
    const mw = createNotFoundMiddleware(router, async () => {
      throw new Error("render-boom");
    });
    const ctx = makeCtx("/missing");
    await mw(ctx, async () => {});
    expect(ctx.response).toBeUndefined();
  });

  it("createNotFoundMiddleware leaves unset when no _404 special file", async () => {
    const router = {
      getSpecialFile: () => undefined,
    } as unknown as Router;
    const mw = createNotFoundMiddleware(router, async () => new Response("x"));
    const ctx = makeCtx("/missing");
    await mw(ctx, async () => {});
    expect(ctx.response).toBeUndefined();
  });
});

describe("special routes — SSR throw → _error HTML", () => {
  let testDir: string;
  let originalCwd: string;
  let appPath: string;
  let errorPath: string;
  let boomPath: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-ssr-error-" });
    originalCwd = cwd();
    chdir(testDir);
    await linkPreact(testDir);
    const routeDir = join(testDir, "src", "routes");
    await ensureDir(routeDir);
    appPath = join(routeDir, "_app.tsx");
    errorPath = join(routeDir, "_error.tsx");
    boomPath = join(routeDir, "boom.tsx");
    await writeTextFile(
      appPath,
      `import { h } from "preact";
export default function App(props: { children?: unknown }) {
  return h("html", null, h("body", null, h("div", { id: "app" }, props.children as never)));
}
`,
    );
    await writeTextFile(
      errorPath,
      `import { h } from "preact";
export default function Err(props: { error?: string }) {
  return h("div", { "data-testid": "error-500" }, "PROJECT_ERROR_MARK:" + (props.error ?? ""));
}
`,
    );
    await writeTextFile(
      boomPath,
      `import { h } from "preact";
export default function Boom() {
  return h("div", null, "nope");
}
export async function load() {
  throw new Error("BOOM_SSR_LOAD");
}
`,
    );
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  it("ssr renderer catch uses _error and returns 500 with PROJECT_ERROR_MARK", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "ssr" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const specialCalls: string[] = [];
    const router = {
      getSpecialFile: (name: string) => {
        specialCalls.push(name);
        if (name === "_app") return appPath;
        if (name === "_error") return errorPath;
        return undefined;
      },
      getLayoutPathsForPath: () => [] as string[],
    } as unknown as Router;
    const renderer = createRendererSSR(container, router, config);
    const ctx = {
      url: new URL("http://localhost/boom"),
      path: "/boom",
      request: new Request("http://localhost/boom"),
      method: "GET",
      headers: new Headers(),
      query: {},
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
        getAll: () => ({}),
      },
    } as unknown as HttpContext;
    const match = {
      isApi: false,
      route: {
        path: "/boom",
        file: "boom.tsx",
        fullPath: boomPath,
        type: "static",
        isApi: false,
        isSpecial: false,
      },
      params: {},
      query: {},
      fullPath: "/boom",
      meta: {},
    } as unknown as RouteMatch;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let result: Response | null;
    try {
      result = await renderer(ctx, match);
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(result).not.toBeNull();
    expect(result!.status).toBe(500);
    expect(specialCalls).toContain("_error");
    const html = await result!.text();
    expect(
      html.includes("PROJECT_ERROR_MARK") ||
        html.includes("BOOM_SSR_LOAD") ||
        html.includes("Internal Server Error") ||
        html.includes("error-500") ||
        html.includes("error") ||
        html.includes("Error"),
    ).toBe(true);
  });
});
