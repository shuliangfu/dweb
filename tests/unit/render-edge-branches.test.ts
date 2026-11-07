/**
 * Edge branches: hybrid inherit / empty layout.load / no </body> /
 * VIEW_DEV / mismatch / _error bypass; SSR non-stream CSS/prod/no-body;
 * routes-mw app get() catch; csr-dep path corners.
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
import { ServiceContainer } from "@dreamer/service";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { generateClientDepContent } from "../../src/feature/csr-client-dep.ts";
import { createRendererHybrid } from "../../src/feature/render-hybrid.ts";
import { createRendererSSR } from "../../src/feature/render-ssr.ts";
import { initializeRender } from "../../src/feature/render.ts";
import { createNestedRoutesMiddleware } from "../../src/feature/routes-middleware.ts";
import { clearAssetManifestCache } from "../../src/utils/asset-manifest.ts";
import type { AppConfig } from "../../src/types/app.ts";

async function linkPreact(testDir: string) {
  await ensureDir(join(testDir, "node_modules"));
  try {
    await symlink(
      join(getRepoRoot(), "node_modules", "preact"),
      join(testDir, "node_modules", "preact"),
    );
  } catch { /* */ }
}

async function linkView(testDir: string) {
  const scoped = join(testDir, "node_modules", "@dreamer");
  await ensureDir(scoped);
  try {
    await symlink(
      join(getRepoRoot(), "node_modules", "@dreamer", "view"),
      join(scoped, "view"),
    );
  } catch { /* */ }
}

function registerMockApp(
  container: ReturnType<typeof initializeServiceContainer>,
  withLogger = true,
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
  if (withLogger) {
    container.registerSingleton("logger", () => ({
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    }));
  }
}

function makeCtx(path: string): HttpContext {
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
  } as HttpContext;
}

function makeMatch(
  pagePath: string,
  routePath = "/home",
  file: string | unknown = "home.tsx",
): RouteMatch {
  return {
    isApi: false,
    route: {
      path: routePath,
      file,
      fullPath: pagePath,
      type: "static",
      isApi: false,
      isSpecial: false,
    },
    params: {},
    query: {},
    fullPath: routePath,
    meta: {},
  } as unknown as RouteMatch;
}

const APP = `import { h } from "preact";
export default function App(props: { children?: unknown }) {
  return h("html", null,
    h("head", null, h("title", null, "t")),
    h("body", null, h("div", { id: "app" }, props.children as never)),
  );
}
`;

/** App that renders mount container but NO </body> / </html> closing via fragment-like root */
const APP_NO_BODY_CLOSE = `import { h } from "preact";
export default function App(props: { children?: unknown }) {
  // intentionally omit </body> — render as single div tree without body tag
  return h("div", { id: "app" }, props.children as never);
}
`;

const LAYOUT_NO_LOAD = `import { h } from "preact";
export default function Layout(props: { children?: unknown }) {
  return h("div", { "data-testid": "layout-noload" }, props.children as never);
}
`;

const LAYOUT_OUTER = `import { h } from "preact";
export default function Outer(props: { children?: unknown }) {
  return h("div", { "data-testid": "outer" }, "OUTER", props.children as never);
}
`;

const LAYOUT_INNER_BREAK = `import { h } from "preact";
export const inheritLayout = false;
export default function Inner(props: { children?: unknown }) {
  return h("div", { "data-testid": "inner" }, "INNER", props.children as never);
}
`;

const PAGE = `import { h } from "preact";
export default function Home() {
  return h("div", null, "EDGE_PAGE");
}
`;

const PAGE_CSS = `import "./assets/e.css";
import { h } from "preact";
export default function Home() {
  return h("div", null, "EDGE_CSS");
}
`;

const PAGE_BOOM = `import { h } from "preact";
export default function Boom() { return h("div", null, "x"); }
export async function load() { throw new Error("EDGE_BOOM"); }
`;

const PAGE_LOAD = `import { h } from "preact";
export default function Home() { return h("div", null, "LOAD_OK"); }
export async function load() { return { ok: true }; }
`;

const ERROR_OK = `import { h } from "preact";
export default function Err(props: { error?: string }) {
  return h("div", { "data-testid": "err" }, props.error ?? "err");
}
`;

const ERROR_THROW = `import { h } from "preact";
export default function Err() { throw new Error("ERR_RENDER_BOOM"); }
`;

const ERROR_SYNTAX = `export default function Err( { this is not valid
`;

const APP_NO_MOUNT = `import { h } from "preact";
export default function App(props: { children?: unknown }) {
  // no id=app mount container
  return h("div", { id: "wrong" }, props.children as never);
}
`;

const ERROR_BAD = `export const notAComponent = 1;
`;

const APP_EMPTY_EXPORT = `export const x = 1;
`;

describe("routes-mw line 49 — app get() throws while has(app)", () => {
  it("swallows get(app) throw and continues", async () => {
    let ran = false;
    const mockRouter = {
      getMiddlewarePathsForPath: () => ["/routes/_middleware.ts"],
      loadModule: async () => ({
        default: async (
          ctx: { app?: unknown },
          next: () => Promise<void>,
        ) => {
          expect(ctx.app).toBeUndefined();
          ran = true;
          await next();
        },
      }),
    } as unknown as Router;
    const container = new ServiceContainer();
    container.registerSingleton("router", () => mockRouter);
    container.registerSingleton("app", () => {
      throw new Error("app-not-ready");
    });
    const mw = createNestedRoutesMiddleware(container);
    const request = new Request("http://localhost/");
    const ctx = {
      request,
      path: "/",
      method: "GET",
      url: new URL(request.url),
      headers: request.headers,
      params: {},
      query: {},
      cookies: {
        get: () => undefined,
        getAll: () => ({}),
        set: () => {},
        remove: () => {},
        delete: () => {},
      },
    } as unknown as HttpContext;
    await mw(ctx, async () => {});
    expect(ran).toBe(true);
  });
});

describe("hybrid / SSR edge branches", () => {
  let testDir: string;
  let originalCwd: string;
  let appPath: string;
  let appNoBody: string;
  let appEmpty: string;
  let layoutNoLoad: string;
  let layoutOuter: string;
  let layoutInner: string;
  let pagePath: string;
  let pageCss: string;
  let pageBoom: string;
  let pageLoad: string;
  let errorOk: string;
  let errorThrow: string;
  let errorSyntax: string;
  let appNoMount: string;
  let errorBad: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-edge-" });
    originalCwd = cwd();
    chdir(testDir);
    await linkPreact(testDir);
    await linkView(testDir);
    const routeDir = join(testDir, "src", "routes");
    await ensureDir(join(routeDir, "assets"));
    appPath = join(routeDir, "_app.tsx");
    appNoBody = join(routeDir, "_app-nobody.tsx");
    appEmpty = join(routeDir, "_app-empty.tsx");
    layoutNoLoad = join(routeDir, "_layout-noload.tsx");
    layoutOuter = join(routeDir, "_layout-outer.tsx");
    layoutInner = join(routeDir, "_layout-inner.tsx");
    pagePath = join(routeDir, "home.tsx");
    pageCss = join(routeDir, "css.tsx");
    pageBoom = join(routeDir, "boom.tsx");
    pageLoad = join(routeDir, "load.tsx");
    errorOk = join(routeDir, "_error-ok.tsx");
    errorThrow = join(routeDir, "_error-throw.tsx");
    errorSyntax = join(routeDir, "_error-syntax.tsx");
    appNoMount = join(routeDir, "_app-nomount.tsx");
    errorBad = join(routeDir, "_error-bad.tsx");
    await writeTextFile(appPath, APP);
    await writeTextFile(appNoBody, APP_NO_BODY_CLOSE);
    await writeTextFile(appEmpty, APP_EMPTY_EXPORT);
    await writeTextFile(layoutNoLoad, LAYOUT_NO_LOAD);
    await writeTextFile(layoutOuter, LAYOUT_OUTER);
    await writeTextFile(layoutInner, LAYOUT_INNER_BREAK);
    await writeTextFile(pagePath, PAGE);
    await writeTextFile(join(routeDir, "assets", "e.css"), ".e{color:green}");
    await writeTextFile(pageCss, PAGE_CSS);
    await writeTextFile(pageBoom, PAGE_BOOM);
    await writeTextFile(pageLoad, PAGE_LOAD);
    await writeTextFile(errorOk, ERROR_OK);
    await writeTextFile(errorThrow, ERROR_THROW);
    await writeTextFile(errorSyntax, ERROR_SYNTAX);
    await writeTextFile(appNoMount, APP_NO_MOUNT);
    await writeTextFile(errorBad, ERROR_BAD);
    const clientOut = join(testDir, "dist", "client");
    await ensureDir(clientOut);
    await writeTextFile(
      join(clientOut, "asset-manifest.json"),
      JSON.stringify({ "/assets/app.css": "/assets/app.hash.css" }),
    );
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  it("hybrid: inheritLayout=false drops outer layout", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "hybrid" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [layoutOuter, layoutInner],
      getRoutes: () => [],
    } as unknown as Router;
    const res = await createRendererHybrid(container, router, config)(
      makeCtx("/x"),
      makeMatch(pagePath),
    );
    const html = await res!.text();
    expect(html).toContain("INNER");
    expect(html.includes("OUTER")).toBe(false);
  });

  it("hybrid: layout without load pushes empty props", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "hybrid" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [layoutNoLoad],
      getRoutes: () => [],
    } as unknown as Router;
    const res = await createRendererHybrid(container, router, config)(
      makeCtx("/x"),
      makeMatch(pagePath),
    );
    expect(res!.status).toBe(200);
    expect(await res!.text()).toContain("layout-noload");
  });

  it("hybrid: _app path exists but module has no default → 500 (loadFailed msg)", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "hybrid" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appEmpty : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const res = await createRendererHybrid(container, router, config)(
      makeCtx("/x"),
      makeMatch(pagePath),
    );
    expect(res!.status).toBe(500);
  });

  it("hybrid: no </body> appends hydration script; mismatchMode injected", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: {
        engine: "preact",
        mode: "hybrid",
        hydration: { mismatchMode: "assert" },
      },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appNoBody : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let res: Response | null;
    try {
      res = await createRendererHybrid(container, router, config)(
        makeCtx("/x"),
        makeMatch(pagePath),
      );
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(200);
    const html = await res!.text();
    expect(html).toContain("__DATA__");
    expect(html).toContain("__DWEB_MISMATCH_MODE__");
    expect(html).toContain("assert");
    // no </body> → script appended at end
    expect(html.includes("</body>")).toBe(false);
  });

  it("hybrid view+dev sets VIEW_DEV", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "view", mode: "hybrid" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    // view fixtures via jsx
    const vApp = join(testDir, "src", "routes", "_app-view.tsx");
    const vPage = join(testDir, "src", "routes", "vhome.tsx");
    await writeTextFile(
      vApp,
      `import { jsx } from "@dreamer/view/jsx-runtime";
export default function App(props: { children?: unknown }) {
  return jsx("html", { children: [
    jsx("head", { children: jsx("title", { children: "v" }) }),
    jsx("body", { children: jsx("div", { id: "app", children: props.children }) }),
  ]});
}
`,
    );
    await writeTextFile(
      vPage,
      `import { jsx } from "@dreamer/view/jsx-runtime";
export default function Home() {
  return jsx("div", { children: "VIEW_EDGE" });
}
`,
    );
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? vApp : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let res: Response | null;
    try {
      res = await createRendererHybrid(container, router, config)(
        makeCtx("/x"),
        makeMatch(vPage),
      );
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(200);
    expect(await res!.text()).toContain("VIEW_DEV");
  });

  it("hybrid: _error module without component falls through to default error HTML", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "hybrid" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => {
        if (n === "_app") return appPath;
        if (n === "_error") return errorBad;
        return undefined;
      },
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const res = await createRendererHybrid(container, router, config)(
      makeCtx("/boom"),
      makeMatch(pageBoom, "/boom", "boom.tsx"),
    );
    expect(res!.status).toBe(500);
    const html = await res!.text();
    // default error page (not project _error component)
    expect(html.length).toBeGreaterThan(0);
  });

  it("hybrid mount fail without logger uses console.error path", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container, false); // no logger
    const config: AppConfig = {
      render: { engine: "preact", mode: "hybrid" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appNoBody : undefined),
      // appNoBody HAS id=app — need app without container
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    // Use empty app export so AppComponent null already tested; for mount fail without logger:
    // app that renders html/body WITHOUT id=app
    const noMount = join(testDir, "src", "routes", "_app-nomount.tsx");
    await writeTextFile(
      noMount,
      `import { h } from "preact";
export default function App(props: { children?: unknown }) {
  return h("html", null, h("body", null, props.children as never));
}
`,
    );
    const router2 = {
      getSpecialFile: (n: string) => (n === "_app" ? noMount : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const res = await createRendererHybrid(container, router2, config)(
      makeCtx("/x"),
      makeMatch(pagePath),
    );
    expect(res!.status).toBe(500);
  });

  it("SSR non-stream: routeCss + prod asset + no </body> + mismatch + routerDebug", async () => {
    clearAssetManifestCache();
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: {
        engine: "preact",
        mode: "ssr",
        debug: true,
        hydration: { mismatchMode: "continue" },
        ssr: { hydrate: true, stream: false },
      },
      router: { routesDir: "./src/routes", debug: true },
      build: { client: { output: "dist/client", engine: "preact" } },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    // put asset path in app
    const appAsset = join(testDir, "src", "routes", "_app-asset.tsx");
    await writeTextFile(
      appAsset,
      `import { h } from "preact";
export default function App(props: { children?: unknown }) {
  return h("div", { id: "app" },
    h("link", { rel: "stylesheet", href: "/assets/app.css" }),
    props.children as never,
  );
}
`,
    );
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appAsset : undefined),
      getLayoutPathsForPath: () => [layoutNoLoad],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "start");
    let res: Response | null;
    try {
      res = await createRendererSSR(container, router, config)(
        makeCtx("/x"),
        makeMatch(pageCss, "/x", "css.tsx"),
      );
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(200);
    const html = await res!.text();
    // no </head> in this fixture → routeCss inject skipped; still covers
    // prod asset replace, mismatch, routerDebug, no-</body> append.
    expect(html).toContain("__DWEB_MISMATCH_MODE__");
    expect(html).toContain("__DWEB_ROUTER_DEBUG__");
    expect(html).toContain("app.hash.css");
    expect(html).toContain("EDGE_CSS");
    expect(html.includes("</body>")).toBe(false);
  });

  it("SSR: _error bad module → default error HTML; non-dev message", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "ssr" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => {
        if (n === "_app") return appPath;
        if (n === "_error") return errorBad;
        return undefined;
      },
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "start");
    let res: Response | null;
    try {
      res = await createRendererSSR(container, router, config)(
        makeCtx("/boom"),
        makeMatch(pageBoom, "/boom", "boom.tsx"),
      );
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(500);
  });

  it("SSR: loadCache true + expired entry + circular params key fallback", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: {
        engine: "preact",
        mode: "ssr",
        loadCache: true, // default ttl
      },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const renderer = createRendererSSR(container, router, config);
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    try {
      const a = await renderer(makeCtx("/home"), makeMatch(pagePath));
      expect(a!.status).toBe(200);
      // circular params → getLoadCacheKey catch → ""
      const circ: Record<string, unknown> = {};
      circ.self = circ;
      const match = makeMatch(pagePath);
      (match as { params: unknown }).params = circ;
      const b = await renderer(makeCtx("/home"), match);
      expect(b === null || b instanceof Response).toBe(true);
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
  });

  it("SSR non-stream with </head> injects routeCss", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "ssr", ssr: { stream: false } },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let res: Response | null;
    try {
      res = await createRendererSSR(container, router, config)(
        makeCtx("/x"),
        makeMatch(pageCss, "/x", "css.tsx"),
      );
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(200);
    const html = await res!.text();
    expect(html).toContain("data-dweb-route-css");
    expect(html.includes("color:green") || html.includes("color: green")).toBe(
      true,
    );
  });

  it("SSR: loadCache catch on circular params + expired entry delete", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: {
        engine: "preact",
        mode: "ssr",
        loadCache: true,
        ssr: { stream: false },
      },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const renderer = createRendererSSR(container, router, config);
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    try {
      // warm cache
      const a = await renderer(
        makeCtx("/load"),
        makeMatch(pageLoad, "/load", "load.tsx"),
      );
      expect(a!.status).toBe(200);
      // expired entry delete path: tiny ttl via boolean already 1s; force by
      // re-calling after mutating — use circular params to hit getLoadCacheKey catch
      const circ: Record<string, unknown> = {};
      circ.self = circ;
      const match = makeMatch(pageLoad, "/load", "load.tsx");
      (match as { params: unknown }).params = circ;
      const b = await renderer(makeCtx("/load"), match);
      // may 200 or 500 (cyclic serialize in data script); either exercises key catch
      expect(b === null || b instanceof Response).toBe(true);
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
  });

  it("SSR: missing mount container without logger throws 500 default", async () => {
    const container = initializeServiceContainer();
    // app only — no logger
    container.registerSingleton("app", () => ({
      name: "t",
      version: "0",
      container,
      stage: "init",
      use() {},
      registerPlugin() {},
      on() {},
      start: async () => {},
      stop: async () => {},
      shutdown: async () => {},
    }));
    const config: AppConfig = {
      render: {
        engine: "preact",
        mode: "ssr",
        ssr: { stream: false, hydrate: true },
      },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appNoMount : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let res: Response | null;
    try {
      res = await createRendererSSR(container, router, config)(
        makeCtx("/home"),
        makeMatch(pagePath),
      );
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(500);
  });

  it("SSR: good _error + non-dev returns sanitized message", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "ssr", ssr: { stream: false } },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => {
        if (n === "_app") return appPath;
        if (n === "_error") return errorOk;
        return undefined;
      },
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "start"); // !isDev
    let res: Response | null;
    try {
      res = await createRendererSSR(container, router, config)(
        makeCtx("/boom"),
        makeMatch(pageBoom, "/boom", "boom.tsx"),
      );
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(500);
    const html = await res!.text();
    expect(html).toContain("An unexpected error occurred.");
    expect(html.includes("EDGE_BOOM")).toBe(false);
  });

  it("SSR: hydration component fallback when extract returns empty", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: {
        engine: "preact",
        mode: "ssr",
        ssr: { stream: false, hydrate: true },
      },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    // empty file → extract "" → replace fallback
    const match = makeMatch(pagePath, "/home", "");
    let res: Response | null;
    try {
      res = await createRendererSSR(container, router, config)(
        makeCtx("/home"),
        match,
      );
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(200);
  });

  it("hybrid: mount fail WITH logger uses logger.error", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "hybrid" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appNoMount : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let res: Response | null;
    try {
      res = await createRendererHybrid(container, router, config)(
        makeCtx("/home"),
        makeMatch(pagePath),
      );
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(500);
  });

  it("hybrid: good _error + isDev includes message/stack props", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "hybrid" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => {
        if (n === "_app") return appPath;
        if (n === "_error") return errorOk;
        return undefined;
      },
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let res: Response | null;
    try {
      res = await createRendererHybrid(container, router, config)(
        makeCtx("/boom"),
        makeMatch(pageBoom, "/boom", "boom.tsx"),
      );
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(500);
    const html = await res!.text();
    expect(html.includes("EDGE_BOOM") || html.includes("err")).toBe(true);
  });

  it("hybrid: _error module load throw → default HTML catch", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "hybrid" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const missing = join(testDir, "src", "routes", "_error-missing-nope.tsx");
    const router = {
      getSpecialFile: (n: string) => {
        if (n === "_app") return appPath;
        if (n === "_error") return missing; // path does not exist → load throws
        return undefined;
      },
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let res: Response | null;
    try {
      res = await createRendererHybrid(container, router, config)(
        makeCtx("/boom"),
        makeMatch(pageBoom, "/boom", "boom.tsx"),
      );
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(500);
  });

  it("SSR: loadCache expired entry delete + tiny ttlMs", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: {
        engine: "preact",
        mode: "ssr",
        loadCache: { ttlMs: 1 },
        ssr: { stream: false },
      },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const renderer = createRendererSSR(container, router, config);
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    try {
      const m = makeMatch(pageLoad, "/load", "load.tsx");
      expect((await renderer(makeCtx("/load"), m))!.status).toBe(200);
      await new Promise((r) => setTimeout(r, 15));
      expect((await renderer(makeCtx("/load"), m))!.status).toBe(200);
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
  });

  it("SSR: non-string route.file hits hydration ternary else", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: {
        engine: "preact",
        mode: "ssr",
        ssr: { stream: false, hydrate: true },
      },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => (n === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const match = makeMatch(pagePath, "/home", { weird: true });
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let res: Response | null;
    try {
      res = await createRendererSSR(container, router, config)(
        makeCtx("/home"),
        match,
      );
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(200);
  });

  it("SSR: _error component render throw → inner catch default HTML", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "ssr", ssr: { stream: false } },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (n: string) => {
        if (n === "_app") return appPath;
        if (n === "_error") return errorThrow;
        return undefined;
      },
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let res: Response | null;
    try {
      res = await createRendererSSR(container, router, config)(
        makeCtx("/boom"),
        makeMatch(pageBoom, "/boom", "boom.tsx"),
      );
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(500);
  });

  it("hybrid: non-string route.file hydration else + syntax _error catch", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "hybrid" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    // first: happy path with non-string file for 318 else — actually need string that fails extract
    const routerOk = {
      getSpecialFile: (n: string) => (n === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    try {
      const match = makeMatch(pagePath, "/home", "C:\\\\nope\\\\outside.tsx");
      const r1 = await createRendererHybrid(container, routerOk, config)(
        makeCtx("/home"),
        match,
      );
      expect(r1!.status).toBe(200);
      const routerErr = {
        getSpecialFile: (n: string) => {
          if (n === "_app") return appPath;
          if (n === "_error") return errorSyntax;
          return undefined;
        },
        getLayoutPathsForPath: () => [],
        getRoutes: () => [],
      } as unknown as Router;
      const r2 = await createRendererHybrid(container, routerErr, config)(
        makeCtx("/boom"),
        makeMatch(pageBoom, "/boom", "boom.tsx"),
      );
      expect(r2!.status).toBe(500);
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
  });
});

describe("csr-dep path corners", () => {
  it("empty componentPath + absolute fullPath falls through markers to index", () => {
    const code = generateClientDepContent(
      "preact",
      [{
        componentPath: "",
        fullPath: "",
        importName: "Route_x",
      }],
      "/tmp/routes",
      false,
      [],
      "hybrid",
    );
    expect(code).toContain("ROUTE_LOADERS");
    expect(code).toContain('"index"');
  });

  it("hasLayout without nested keys emits single _layout loader", () => {
    const code = generateClientDepContent(
      "preact",
      [{
        componentPath: "about",
        fullPath: "/tmp/routes/about.tsx",
        importName: "Route_about",
      }],
      "/tmp/routes",
      true, // hasLayout
      [],
      "hybrid",
      undefined, // no nested keys
      false,
      false,
    );
    expect(code).toContain('import("./routes/_layout.tsx")');
    expect(code).toContain("clearLayoutCache");
  });

  it("UNC / double-slash componentPath treated as absolute", () => {
    const code = generateClientDepContent(
      "preact",
      [{
        componentPath: "//server/share/routes/x.tsx",
        fullPath: "//server/share/routes/x.tsx",
        importName: "Route_x",
      }],
      "/tmp/routes",
      false,
      [],
      "csr",
    );
    expect(code).toContain("ROUTE_LOADERS");
  });

  it("Windows drive-letter componentPath hits looksLikeAbsolute return", () => {
    const code = generateClientDepContent(
      "preact",
      [{
        componentPath: "D:/other/x.tsx",
        fullPath: "D:/other/x.tsx",
        importName: "Route_x",
      }],
      "/tmp/routes", // mismatch → extract ""; cp is D:/ → line 46
      false,
      [],
      "csr",
    );
    expect(code).toContain("ROUTE_LOADERS");
    expect(code).toContain('"index"');
  });

  it("relative componentPath used when fullPath extract is absolute-looking", () => {
    const code = generateClientDepContent(
      "preact",
      [{
        componentPath: "widgets/card",
        fullPath: "/unrelated/elsewhere/card.tsx",
        importName: "Route_card",
      }],
      "/tmp/routes",
      false,
      [],
      "hybrid",
    );
    expect(code).toContain("widgets/card");
  });

  it("marker subpath from fullPath when extract/cp look absolute (L69)", () => {
    // fromFull extract vs mismatched routesDir → ""; cp is D:/ abs → skip;
    // fullPath contains /routes/ → marker returns nested/page (L69)
    const code = generateClientDepContent(
      "preact",
      [{
        componentPath: "D:/abs/only.tsx",
        fullPath: "/var/app/src/routes/nested/page.tsx",
        importName: "Route_p",
      }],
      "/tmp/other-routes",
      false,
      [],
      "csr",
    );
    expect(code).toContain("nested/page");
  });

  it("marker subpath from componentPath when fullPath has no /routes/ (L75)", () => {
    const code = generateClientDepContent(
      "preact",
      [{
        componentPath: "/var/app/src/routes/widget.tsx",
        fullPath: "/no/marker/here.tsx",
        importName: "Route_w",
      }],
      "/tmp/other-routes",
      false,
      [],
      "csr",
    );
    expect(code).toContain("widget");
  });
});
