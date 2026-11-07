/**
 * SSR view stream path + hybrid prod (!isDev) asset/routeCss coverage.
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
import { clearAssetManifestCache } from "../../src/utils/asset-manifest.ts";
import type { AppConfig } from "../../src/types/app.ts";

async function linkPkg(testDir: string, name: string) {
  const nm = join(testDir, "node_modules");
  await ensureDir(nm);
  const src = join(getRepoRoot(), "node_modules", name);
  try {
    await symlink(src, join(nm, name));
  } catch {
    /* linked */
  }
}

async function linkViewStack(testDir: string) {
  const scoped = join(testDir, "node_modules", "@dreamer");
  await ensureDir(scoped);
  const viewSrc = join(getRepoRoot(), "node_modules", "@dreamer", "view");
  try {
    await symlink(viewSrc, join(scoped, "view"));
  } catch {
    /* linked */
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
  container.registerSingleton("logger", () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
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
    query: {},
    cookies: {
      get: () => undefined,
      set: () => {},
      remove: () => {},
      getAll: () => ({}),
    },
  } as HttpContext;
}

function makeMatch(pagePath: string, routePath = "/home"): RouteMatch {
  return {
    isApi: false,
    route: {
      path: routePath,
      file: "home.tsx",
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

const VIEW_APP = `import { jsx } from "@dreamer/view/jsx-runtime";
export default function App(props: { children?: unknown }) {
  return jsx("html", {
    children: [
      jsx("head", { children: jsx("title", { children: "stream" }) }),
      jsx("body", {
        children: jsx("div", { id: "app", children: props.children }),
      }),
    ],
  });
}
`;

const VIEW_APP_NO_MOUNT = `import { jsx } from "@dreamer/view/jsx-runtime";
export default function App(props: { children?: unknown }) {
  return jsx("html", {
    children: jsx("body", { children: props.children }),
  });
}
`;

const VIEW_PAGE_FIXED = `import { jsx } from "@dreamer/view/jsx-runtime";
export default function Home() {
  return jsx("div", { "data-testid": "page", children: "VIEW_STREAM_MARK" });
}
`;

const PREACT_APP_ASSET = `import { h } from "preact";
export default function App(props: { children?: unknown }) {
  return h("html", null,
    h("head", null,
      h("title", null, "prod"),
      h("link", { rel: "stylesheet", href: "/assets/app.css" }),
      h("script", { src: "/_client/main.js" }),
    ),
    h("body", null, h("div", { id: "app" }, props.children as never)),
  );
}
`;

const PREACT_PAGE_CSS = `import "./assets/style.css";
import { h } from "preact";
export default function Home() {
  return h("div", { "data-testid": "page" }, "HYBRID_PROD_MARK");
}
`;

describe("SSR view stream (ssr.stream)", () => {
  let testDir: string;
  let originalCwd: string;
  let appPath: string;
  let badAppPath: string;
  let pagePath: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-ssr-stream-" });
    originalCwd = cwd();
    chdir(testDir);
    await linkViewStack(testDir);
    const routeDir = join(testDir, "src", "routes");
    await ensureDir(routeDir);
    appPath = join(routeDir, "_app.tsx");
    badAppPath = join(routeDir, "_app-bad.tsx");
    pagePath = join(routeDir, "home.tsx");
    await writeTextFile(appPath, VIEW_APP);
    await writeTextFile(badAppPath, VIEW_APP_NO_MOUNT);
    await writeTextFile(pagePath, VIEW_PAGE_FIXED);
    await ensureDir(join(routeDir, "assets"));
    await writeTextFile(join(routeDir, "assets", "s.css"), ".x{color:blue}");
    await writeTextFile(
      join(routeDir, "css-home.tsx"),
      `import "./assets/s.css";
import { jsx } from "@dreamer/view/jsx-runtime";
export default function Home() {
  return jsx("div", { children: "CSS_STREAM_MARK" });
}
`,
    );
    const clientOut = join(testDir, "dist", "client");
    await ensureDir(clientOut);
    await writeTextFile(
      join(clientOut, "asset-manifest.json"),
      JSON.stringify({ "/_client.js": "/_client.js.hash.js" }),
    );
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  function setup(stream = true) {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: {
        engine: "view",
        mode: "ssr",
        ssr: { stream, hydrate: true },
      },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    return { container, config };
  }

  it("view + ssr.stream returns streaming 200 body with VIEW_STREAM_MARK", async () => {
    const { container, config } = setup(true);
    const router = {
      getSpecialFile: (name: string) => (name === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [],
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
    expect(res!.body).not.toBeNull();
    const html = await res!.text();
    expect(html).toContain("VIEW_STREAM_MARK");
    expect(html).toContain('id="app"');
    expect(html).toContain("__DATA__");
    expect(html).toContain("/_client.js");
  });

  it("view stream without mount container yields 500", async () => {
    const { container, config } = setup(true);
    const router = {
      getSpecialFile: (name: string) =>
        name === "_app" ? badAppPath : undefined,
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
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
    expect(res!.status).toBe(500);
  });

  it("view stream + routeCss + prod manifest pipes transforms", async () => {
    clearAssetManifestCache();
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: {
        engine: "view",
        mode: "ssr",
        ssr: { stream: true, hydrate: true },
      },
      router: { routesDir: "./src/routes" },
      build: { client: { output: "dist/client", engine: "view" } },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const cssPage = join(testDir, "src", "routes", "css-home.tsx");
    const router = {
      getSpecialFile: (name: string) => (name === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [{ path: "/home", file: cssPage, isApi: false }],
    } as unknown as Router;
    const renderer = createRendererSSR(container, router, config);
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "start"); // !isDev → manifest transform on stream
    let res: Response | null;
    try {
      res = await renderer(makeCtx("/home"), makeMatch(cssPage));
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(200);
    const html = await res!.text();
    expect(html).toContain("CSS_STREAM_MARK");
    expect(html).toContain("data-dweb-route-css");
    expect(html.includes("color:blue") || html.includes("color: blue")).toBe(
      true,
    );
  });

  it("view stream with hydrate:false still returns 200 (skips mount gate)", async () => {
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: {
        engine: "view",
        mode: "ssr",
        ssr: { stream: true, hydrate: false },
      },
      router: { routesDir: "./src/routes" },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (name: string) =>
        name === "_app" ? badAppPath : undefined,
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
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
    // hydrate false → no mount check; may still 200 without #app
    expect(res!.status).toBe(200);
  });
});

describe("Hybrid prod (!isDev) asset replace + routeCss", () => {
  let testDir: string;
  let originalCwd: string;
  let appPath: string;
  let pagePath: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-hybrid-prod-" });
    originalCwd = cwd();
    chdir(testDir);
    await linkPkg(testDir, "preact");
    // scoped @dreamer not needed for preact h()
    const routeDir = join(testDir, "src", "routes");
    await ensureDir(join(routeDir, "assets"));
    appPath = join(routeDir, "_app.tsx");
    pagePath = join(routeDir, "home.tsx");
    await writeTextFile(appPath, PREACT_APP_ASSET);
    await writeTextFile(join(routeDir, "assets", "style.css"), "body{color:red}");
    await writeTextFile(pagePath, PREACT_PAGE_CSS);
    const clientOut = join(testDir, "dist", "client");
    await ensureDir(clientOut);
    await writeTextFile(
      join(clientOut, "asset-manifest.json"),
      JSON.stringify({
        "/_client/main.js": "/_client/main.abc123.js",
        "/assets/app.css": "/assets/app.deadbeef.css",
      }),
    );
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  it("start env replaces asset paths and injects route CSS", async () => {
    clearAssetManifestCache();
    const container = initializeServiceContainer();
    registerMockApp(container);
    const config: AppConfig = {
      render: { engine: "preact", mode: "hybrid" },
      router: { routesDir: "./src/routes" },
      build: { client: { output: "dist/client", engine: "preact" } },
    };
    container.registerSingleton("config", () => config);
    initializeRender(container, config);
    const router = {
      getSpecialFile: (name: string) => (name === "_app" ? appPath : undefined),
      getLayoutPathsForPath: () => [],
      getRoutes: () => [{ path: "/home", file: pagePath, isApi: false }],
    } as unknown as Router;
    const renderer = createRendererHybrid(container, router, config);
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "start"); // !isDev → replaceAssetPathsInHtml
    let res: Response | null;
    try {
      res = await renderer(makeCtx("/home"), makeMatch(pagePath));
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(res!.status).toBe(200);
    // prod: no Cache-Control no-cache
    expect(res!.headers.get("Cache-Control")).toBeNull();
    const html = await res!.text();
    expect(html).toContain("HYBRID_PROD_MARK");
    expect(html).toContain("data-dweb-route-css");
    expect(
      html.includes("body{color:red}") ||
        html.includes("color:red") ||
        html.includes("color: red"),
    ).toBe(true);
    expect(
      html.includes("main.abc123.js") || html.includes("app.deadbeef.css"),
    ).toBe(true);
  });
});
