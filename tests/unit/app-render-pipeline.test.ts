/**
 * planRenderPipeline / registerAppRenderPipeline / ensureClientBuildForRender 轻量单测
 */
import "../setup.ts";
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
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import type { HttpContext } from "@dreamer/server";
import type { Router } from "@dreamer/router";
import {
  ensureClientBuildForRender,
  planRenderPipeline,
  registerAppRenderPipeline,
} from "../../src/core/app-render-pipeline.ts";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { initializeRender } from "../../src/feature/render.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("planRenderPipeline", () => {
  it("csr/hybrid 应需要 load-data 与 ensureClientBuild", () => {
    expect(planRenderPipeline("csr")).toEqual({
      mode: "csr",
      loadData: true,
      clientScript: true,
      ensureClientBuild: true,
    });
    expect(planRenderPipeline("hybrid")).toEqual({
      mode: "hybrid",
      loadData: true,
      clientScript: true,
      ensureClientBuild: true,
    });
  });

  it("ssg 不应 ensureClientBuild / load-data", () => {
    expect(planRenderPipeline("ssg")).toEqual({
      mode: "ssg",
      loadData: false,
      clientScript: true,
      ensureClientBuild: false,
    });
  });

  it("缺省与未知 mode 应按 ssr", () => {
    expect(planRenderPipeline(undefined).mode).toBe("ssr");
    expect(planRenderPipeline("nope").mode).toBe("ssr");
    expect(planRenderPipeline("ssr")).toEqual({
      mode: "ssr",
      loadData: false,
      clientScript: true,
      ensureClientBuild: true,
    });
  });
});

function mockApp(
  container: ReturnType<typeof initializeServiceContainer>,
  config: AppConfig = {},
) {
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
  container.registerSingleton("logger", () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  }));
  container.registerSingleton("config", () => config);
  if (!container.has("pluginManager")) {
    container.registerSingleton("pluginManager", () => ({
      getPlugins: () => [],
      getRegisteredPlugins: () => [],
      emit: async () => {},
      hasHooks: () => false,
    }));
  }
  initializeRender(container, config);
}

describe("registerAppRenderPipeline", () => {
  it("ssg 模式应 setSSRRender、注册 not-found，不注册 load-data", async () => {
    const uses: Array<{ name?: string }> = [];
    let ssrSet = false;
    const server = {
      setSSRRender: (_fn: unknown) => {
        ssrSet = true;
      },
      use: (
        _mw: (ctx: HttpContext, next: () => Promise<void>) => Promise<void>,
        _condition?: unknown,
        name?: string,
      ) => {
        uses.push({ name });
      },
    };
    const container = initializeServiceContainer();
    const config: AppConfig = {
      render: { mode: "ssg", engine: "preact" },
    };
    mockApp(container, config);
    const router = {
      getSpecialFile: () => undefined,
      getLayoutPathsForPath: () => [],
    };
    await registerAppRenderPipeline(server, {
      container,
      router,
      config,
      isBuildMode: () => true,
    });
    expect(ssrSet).toBe(true);
    expect(uses.some((u) => u.name === "not-found")).toBe(true);
    expect(uses.some((u) => u.name === "load-data")).toBe(false);
  });

  it("csr 模式应注册 load-data 与 not-found", async () => {
    const uses: Array<{ name?: string }> = [];
    const server = {
      setSSRRender: (_fn: unknown) => {},
      use: (
        _mw: (ctx: HttpContext, next: () => Promise<void>) => Promise<void>,
        _condition?: unknown,
        name?: string,
      ) => {
        uses.push({ name });
      },
    };
    const container = initializeServiceContainer();
    const config: AppConfig = {
      render: { mode: "csr", engine: "preact" },
      router: { routesDir: "./src/routes" },
    };
    mockApp(container, config);
    const router = {
      getSpecialFile: () => undefined,
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    };
    const prev = getEnv("RUNTIME_ENV");
    // start + isBuildMode true → ensureClientBuild skips heavy buildClientScript
    setEnv("RUNTIME_ENV", "start");
    try {
      await registerAppRenderPipeline(server, {
        container,
        router,
        config,
        isBuildMode: () => true,
      });
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(uses.some((u) => u.name === "not-found")).toBe(true);
    expect(uses.some((u) => u.name === "load-data")).toBe(true);
  });

  it("ssr 默认模式应 setSSRRender + not-found，无 load-data", async () => {
    const uses: Array<{ name?: string }> = [];
    let ssrSet = false;
    const server = {
      setSSRRender: (_fn: unknown) => {
        ssrSet = true;
      },
      use: (
        _mw: (ctx: HttpContext, next: () => Promise<void>) => Promise<void>,
        _condition?: unknown,
        name?: string,
      ) => {
        uses.push({ name });
      },
    };
    const container = initializeServiceContainer();
    const config: AppConfig = {
      render: { mode: "ssr", engine: "preact" },
    };
    mockApp(container, config);
    const router = {
      getSpecialFile: () => undefined,
      getLayoutPathsForPath: () => [],
    };
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "start");
    try {
      await registerAppRenderPipeline(server, {
        container,
        router,
        config,
        isBuildMode: () => true,
      });
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(ssrSet).toBe(true);
    expect(uses.some((u) => u.name === "not-found")).toBe(true);
    expect(uses.some((u) => u.name === "load-data")).toBe(false);
  });

  it("hybrid 模式应注册 load-data 与 not-found", async () => {
    const uses: Array<{ name?: string }> = [];
    const server = {
      setSSRRender: (_fn: unknown) => {},
      use: (
        _mw: (ctx: HttpContext, next: () => Promise<void>) => Promise<void>,
        _condition?: unknown,
        name?: string,
      ) => {
        uses.push({ name });
      },
    };
    const container = initializeServiceContainer();
    const config: AppConfig = {
      render: { mode: "hybrid", engine: "preact" },
      router: { routesDir: "./src/routes" },
    };
    mockApp(container, config);
    const router = {
      getSpecialFile: () => undefined,
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    };
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "start");
    try {
      await registerAppRenderPipeline(server, {
        container,
        router,
        config,
        isBuildMode: () => true,
      });
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(uses.some((u) => u.name === "not-found")).toBe(true);
    expect(uses.some((u) => u.name === "load-data")).toBe(true);
  });
});

describe("ensureClientBuildForRender", () => {
  it("start + hasPrebuilt + isBuildMode 时不抛（短路）", async () => {
    const container = initializeServiceContainer();
    const config: AppConfig = { render: { mode: "ssr", engine: "preact" } };
    mockApp(container, config);
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "start");
    try {
      await ensureClientBuildForRender(container, config, true, () => true);
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
  });

  it("build + hasPrebuilt + isBuildMode 时不抛（短路）", async () => {
    const container = initializeServiceContainer();
    const config: AppConfig = { render: { mode: "ssr", engine: "preact" } };
    mockApp(container, config);
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "build");
    try {
      await ensureClientBuildForRender(container, config, true, () => true);
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
  });

  it("未知 RUNTIME_ENV + hasPrebuilt + isBuildMode 时不抛", async () => {
    const container = initializeServiceContainer();
    const config: AppConfig = { render: { mode: "ssr", engine: "preact" } };
    mockApp(container, config);
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "other");
    try {
      await ensureClientBuildForRender(container, config, true, () => true);
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
  });
});

describe("registerAppRenderPipeline — timing + debug log branches", () => {
  it("ssr pageRender 成功路径应走 withSSRTiming finally（ok）", async () => {
    let pageRender:
      | ((ctx: HttpContext, match: unknown) => Promise<Response | null>)
      | undefined;
    const server = {
      setSSRRender: (fn: typeof pageRender) => {
        pageRender = fn;
      },
      use: (
        _mw: (ctx: HttpContext, next: () => Promise<void>) => Promise<void>,
        _condition?: unknown,
        _name?: string,
      ) => {},
    };
    const container = initializeServiceContainer();
    const config: AppConfig = {
      render: { mode: "ssr", engine: "preact" },
    };
    mockApp(container, config);
    // plugin emitOnSSREnd needs soft no-op if no plugins
    const router = {
      getSpecialFile: () => undefined,
      getLayoutPathsForPath: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "start");
    try {
      await registerAppRenderPipeline(server, {
        container,
        router,
        config,
        isBuildMode: () => false, // hit debug log branch
      });
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(typeof pageRender).toBe("function");
    // API match → null without throwing (covers ok=true finally)
    const ctx = {
      path: "/api/x",
      url: new URL("http://localhost/api/x"),
      request: new Request("http://localhost/api/x"),
    } as unknown as HttpContext;
    const match = {
      isApi: true,
      route: { fullPath: "/api/x" },
      params: {},
      query: {},
      fullPath: "/api/x",
    };
    const out = await pageRender!(ctx, match);
    expect(out).toBeNull();
  });
});

describe("ensureClientBuildForRender — RUNTIME_ENV=dev", () => {
  it("dev + isBuildMode 应调用 ensureClientEntry 短路（不跑 buildClientScript）", async () => {
    const testDir = await makeTempDir({ prefix: "dweb-pipe-dev-" });
    const originalCwd = cwd();
    chdir(testDir);
    try {
      await ensureDir(join(testDir, "src", "routes"));
      await writeTextFile(
        join(testDir, "src", "routes", "_app.tsx"),
        "export default function App(props: { children?: unknown }) { return props.children as never; }",
      );
      await writeTextFile(
        join(testDir, "src", "routes", "index.tsx"),
        "export default function P() { return null; }",
      );
      const container = initializeServiceContainer();
      const config: AppConfig = {
        render: { mode: "ssr", engine: "preact" },
        router: { routesDir: "./src/routes" },
      };
      mockApp(container, config);
      const prev = getEnv("RUNTIME_ENV");
      setEnv("RUNTIME_ENV", "dev");
      try {
        // isBuildMode true → line 79 ensureClientEntryFile, skip 81 buildClientScript
        await ensureClientBuildForRender(container, config, false, () => true);
      } finally {
        if (prev === undefined) deleteEnv("RUNTIME_ENV");
        else setEnv("RUNTIME_ENV", prev);
      }
    } finally {
      chdir(originalCwd);
      await remove(testDir, { recursive: true });
    }
  });
});

describe("registerAppRenderPipeline — hybrid debug log", () => {
  it("hybrid + !isBuildMode 应走 renderModeHybrid debug 文案分支", async () => {
    const uses: Array<{ name?: string }> = [];
    const server = {
      setSSRRender: (_fn: unknown) => {},
      use: (
        _mw: (ctx: HttpContext, next: () => Promise<void>) => Promise<void>,
        _condition?: unknown,
        name?: string,
      ) => {
        uses.push({ name });
      },
    };
    const container = initializeServiceContainer();
    const config: AppConfig = {
      render: { mode: "hybrid", engine: "preact" },
      router: { routesDir: "./src/routes" },
    };
    mockApp(container, config);
    const router = {
      getSpecialFile: () => undefined,
      getLayoutPathsForPath: () => [],
      getRoutes: () => [],
    } as unknown as Router;
    const prev = getEnv("RUNTIME_ENV");
    setEnv("RUNTIME_ENV", "start");
    try {
      await registerAppRenderPipeline(server, {
        container,
        router,
        config,
        isBuildMode: () => false,
      });
    } finally {
      if (prev === undefined) deleteEnv("RUNTIME_ENV");
      else setEnv("RUNTIME_ENV", prev);
    }
    expect(uses.some((u) => u.name === "not-found")).toBe(true);
    expect(uses.some((u) => u.name === "load-data")).toBe(true);
  });
});
