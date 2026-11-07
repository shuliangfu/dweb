/**
 * SSR / Hybrid happy-path: _app + _layout + page load/props/metadata.
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
import { createRendererHybrid } from "../../src/feature/render-hybrid.ts";
import { createRendererSSR } from "../../src/feature/render-ssr.ts";
import { initializeRender } from "../../src/feature/render.ts";
import type { AppConfig } from "../../src/types/app.ts";

async function linkPreact(testDir: string) {
  const nm = join(testDir, "node_modules");
  await ensureDir(nm);
  const preactSrc = join(getRepoRoot(), "node_modules", "preact");
  try {
    await symlink(preactSrc, join(nm, "preact"));
  } catch {
    /* already linked */
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

function makeCtx(path: string): HttpContext {
  const url = new URL(`http://127.0.0.1${path}`);
  return {
    request: new Request(url),
    path,
    method: "GET",
    url,
    headers: new Headers(),
    query: { q: "1" },
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
  file = "home.tsx",
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
    params: { id: "42" },
    query: { q: "1" },
    fullPath: routePath,
    meta: {},
  } as unknown as RouteMatch;
}

const APP_SRC = `import { h } from "preact";
export default function App(props: { children?: unknown }) {
  return h("html", null,
    h("head", null, h("title", null, "t")),
    h("body", null, h("div", { id: "app" }, props.children as never)),
  );
}
`;

const LAYOUT_SRC = `import { h } from "preact";
export default function Layout(props: { children?: unknown; data?: { mark?: string } }) {
  return h("div", { "data-testid": "layout", "data-mark": props.data?.mark ?? "" },
    "LAYOUT_MARK:", props.data?.mark ?? "", props.children as never);
}
export async function load() {
  return { mark: "L1" };
}
`;

const LAYOUT_INNER_SRC = `import { h } from "preact";
export const inheritLayout = false;
export default function Inner(props: { children?: unknown; data?: { mark?: string } }) {
  return h("div", { "data-testid": "layout-inner" },
    "INNER_MARK:", props.data?.mark ?? "", props.children as never);
}
export async function load() {
  return { mark: "INNER" };
}
`;

const PAGE_SRC = `import { h } from "preact";
export const metadata = { title: "Happy Home", description: "desc" };
export default function Home(props: { data?: { hello?: string }; params?: Record<string, string> }) {
  return h("div", { "data-testid": "page" },
    "PAGE_MARK:", props.data?.hello ?? "", ":id=", props.params?.id ?? "");
}
export async function load() {
  return { hello: "world" };
}
`;

const PAGE_REDIRECT_SRC = `import { h } from "preact";
export default function R() {
  return h("div", null, "nope");
}
export async function load() {
  return new Response(null, { status: 302, headers: { Location: "/elsewhere" } });
}
`;

const LAYOUT_REDIRECT_SRC = `import { h } from "preact";
export default function L(props: { children?: unknown }) {
  return h("div", null, props.children as never);
}
export async function load() {
  return new Response("layout-redirect", { status: 307, headers: { Location: "/layout-go" } });
}
`;

describe("render happy-path — SSR", () => {
  let testDir: string;
  let originalCwd: string;
  let appPath: string;
  let layoutPath: string;
  let innerLayoutPath: string;
  let pagePath: string;
  let redirectPagePath: string;
  let redirectLayoutPath: string;
  let routeDir: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-ssr-happy-" });
    originalCwd = cwd();
    chdir(testDir);
    await linkPreact(testDir);
    routeDir = join(testDir, "src", "routes");
    await ensureDir(join(routeDir, "nested"));
    appPath = join(routeDir, "_app.tsx");
    layoutPath = join(routeDir, "_layout.tsx");
    innerLayoutPath = join(routeDir, "nested", "_layout.tsx");
    pagePath = join(routeDir, "home.tsx");
    redirectPagePath = join(routeDir, "redir.tsx");
    redirectLayoutPath = join(routeDir, "layout-redir.tsx");
    await writeTextFile(appPath, APP_SRC);
    await writeTextFile(layoutPath, LAYOUT_SRC);
    await writeTextFile(innerLayoutPath, LAYOUT_INNER_SRC);
    await writeTextFile(pagePath, PAGE_SRC);
    await writeTextFile(redirectPagePath, PAGE_REDIRECT_SRC);
    await writeTextFile(redirectLayoutPath, LAYOUT_REDIRECT_SRC);
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  function setup(modeExtras: AppConfig["render"] = {}) {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "ssr", ...modeExtras },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    return { container, config };
  }

  it("renders _app + _layout + page load/props/metadata with __DATA__", async () => {
    const { container, config } = setup();
    const router = {
      getSpecialFile: (name: string) => (name === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [layoutPath],
      getRoutes: () => [{ path: "/home", file: pagePath, isApi: false }],
    } as unknown as Router;
    const renderer = createRendererSSR(container, router, config);
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let res: Response | null;
    try {
      res = await renderer(makeCtx("/home"), makeMatch(pagePath));
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    const html = await res!.text();
    expect(html).toContain('id="app"');
    expect(html).toContain("PAGE_MARK:world");
    expect(html).toContain("LAYOUT_MARK:L1");
    expect(html).toContain(":id=42");
    expect(html).toContain("__DATA__");
    expect(html.includes("/_client.js") || html.includes("_client.js")).toBe(true);
    expect(res!.headers.get("Cache-Control") || "").toContain("no-cache");
  });

  it("respects inheritLayout=false (drops outer layout)", async () => {
    const { container, config } = setup();
    const router = {
      getSpecialFile: (name: string) => (name === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [layoutPath, innerLayoutPath],
      getRoutes: () => [],
    } as unknown as Router;
    const renderer = createRendererSSR(container, router, config);
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let res: Response | null;
    try {
      res = await renderer(makeCtx("/nested"), makeMatch(pagePath, "/nested"));
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(200);
    const html = await res!.text();
    expect(html).toContain("INNER_MARK:INNER");
    expect(html).toContain("PAGE_MARK:world");
    // outer layout should be dropped
    expect(html.includes("LAYOUT_MARK:L1")).toBe(false);
  });

  it("page load Response short-circuits", async () => {
    const { container, config } = setup();
    const router = {
      getSpecialFile: (name: string) => (name === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const renderer = createRendererSSR(container, router, config);
    const res = await renderer(
      makeCtx("/redir"),
      makeMatch(redirectPagePath, "/redir", "redir.tsx"),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(302);
    expect(res!.headers.get("Location")).toBe("/elsewhere");
  });

  it("layout load Response short-circuits", async () => {
    const { container, config } = setup();
    const router = {
      getSpecialFile: (name: string) => (name === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [redirectLayoutPath],
      getRoutes: () => [],
    } as unknown as Router;
    const renderer = createRendererSSR(container, router, config);
    const res = await renderer(makeCtx("/home"), makeMatch(pagePath));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(307);
    expect(res!.headers.get("Location")).toBe("/layout-go");
  });

  it("loadCache reuses page load within ttl", async () => {
    const { container, config } = setup({
      loadCache: { ttlMs: 5000 },
    } as AppConfig["render"]);
    const router = {
      getSpecialFile: (name: string) => (name === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const renderer = createRendererSSR(container, router, config);
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    try {
      const a = await renderer(makeCtx("/home"), makeMatch(pagePath));
      const b = await renderer(makeCtx("/home"), makeMatch(pagePath));
      expect(a!.status).toBe(200);
      expect(b!.status).toBe(200);
      expect(await a!.text()).toContain("PAGE_MARK:world");
      expect(await b!.text()).toContain("PAGE_MARK:world");
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
  });
});

describe("render happy-path — Hybrid", () => {
  let testDir: string;
  let originalCwd: string;
  let appPath: string;
  let layoutPath: string;
  let pagePath: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-hybrid-happy-" });
    originalCwd = cwd();
    chdir(testDir);
    await linkPreact(testDir);
    const routeDir = join(testDir, "src", "routes");
    await ensureDir(routeDir);
    appPath = join(routeDir, "_app.tsx");
    layoutPath = join(routeDir, "_layout.tsx");
    pagePath = join(routeDir, "home.tsx");
    await writeTextFile(appPath, APP_SRC);
    await writeTextFile(layoutPath, LAYOUT_SRC);
    await writeTextFile(pagePath, PAGE_SRC);
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  it("renders _app shell + layout data + page props + hydration script", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: {
        engine: "preact",
        mode: "hybrid",
        debug: true,
        hybrid: { headTags: "<!--HEAD_TAG-->", bodyTags: "<!--BODY_TAG-->" },
      } as unknown as AppConfig["render"],
      router: { routesDir: "./src/routes", debug: true },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (name: string) => (name === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [layoutPath],
      getRoutes: () => [{ path: "/home", file: pagePath, isApi: false }],
    } as unknown as Router;
    const renderer = createRendererHybrid(container, router, config);
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let res: Response | null;
    try {
      res = await renderer(makeCtx("/home"), makeMatch(pagePath));
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    expect(res!.headers.get("Cache-Control") || "").toContain("no-cache");
    const html = await res!.text();
    expect(html).toContain('id="app"');
    expect(html).toContain("PAGE_MARK:world");
    expect(html).toContain("LAYOUT_MARK:L1");
    expect(html).toContain("__DATA__");
    expect(html).toContain("__DWEB_MODE__");
    expect(html).toContain("hybrid");
    expect(html).toContain("/_client.js");
    expect(html).toContain("<!--HEAD_TAG-->");
    expect(html).toContain("<!--BODY_TAG-->");
    expect(
      html.includes("__DWEB_DEBUG__") || html.includes("__DWEB_HMR_DEBUG__"),
    ).toBe(true);
  });
});


describe("render happy-path — Hybrid edge branches", () => {
  let testDir: string;
  let originalCwd: string;
  let appPath: string;
  let layoutPath: string;
  let redirectLayoutPath: string;
  let pagePath: string;
  let redirectPagePath: string;
  let badAppPath: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-hybrid-edge-" });
    originalCwd = cwd();
    chdir(testDir);
    await linkPreact(testDir);
    const routeDir = join(testDir, "src", "routes");
    await ensureDir(routeDir);
    appPath = join(routeDir, "_app.tsx");
    layoutPath = join(routeDir, "_layout.tsx");
    redirectLayoutPath = join(routeDir, "layout-redir.tsx");
    pagePath = join(routeDir, "home.tsx");
    redirectPagePath = join(routeDir, "redir.tsx");
    badAppPath = join(routeDir, "_app-bad.tsx");
    await writeTextFile(appPath, APP_SRC);
    await writeTextFile(layoutPath, LAYOUT_SRC);
    await writeTextFile(redirectLayoutPath, LAYOUT_REDIRECT_SRC);
    await writeTextFile(pagePath, PAGE_SRC);
    await writeTextFile(redirectPagePath, PAGE_REDIRECT_SRC);
    // App without #app mount container
    await writeTextFile(
      badAppPath,
      `import { h } from "preact";
export default function App(props: { children?: unknown }) {
  return h("html", null, h("body", null, props.children as never));
}
`,
    );
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  function setupHybrid() {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "hybrid" },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    return { container, config };
  }

  it("page load Response short-circuits (hybrid)", async () => {
    const { container, config } = setupHybrid();
    const router = {
      getSpecialFile: (name: string) => (name === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const renderer = createRendererHybrid(container, router, config);
    const res = await renderer(
      makeCtx("/redir"),
      makeMatch(redirectPagePath, "/redir", "redir.tsx"),
    );
    expect(res!.status).toBe(302);
    expect(res!.headers.get("Location")).toBe("/elsewhere");
  });

  it("layout load Response short-circuits (hybrid)", async () => {
    const { container, config } = setupHybrid();
    const router = {
      getSpecialFile: (name: string) => (name === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [redirectLayoutPath],
      getRoutes: () => [],
    } as unknown as Router;
    const renderer = createRendererHybrid(container, router, config);
    const res = await renderer(makeCtx("/home"), makeMatch(pagePath));
    expect(res!.status).toBe(307);
  });

  it("missing _app yields 500 error path", async () => {
    const { container, config } = setupHybrid();
    const router = {
      getSpecialFile: () => undefined,
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const renderer = createRendererHybrid(container, router, config);
    const res = await renderer(makeCtx("/home"), makeMatch(pagePath));
    expect(res!.status).toBe(500);
  });

  it("app without mount container yields 500", async () => {
    const { container, config } = setupHybrid();
    const router = {
      getSpecialFile: (name: string) =>
        name === "_app" ? badAppPath : undefined,
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const renderer = createRendererHybrid(container, router, config);
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "dev");
    let res: Response | null;
    try {
      res = await renderer(makeCtx("/home"), makeMatch(pagePath));
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(500);
  });
});

