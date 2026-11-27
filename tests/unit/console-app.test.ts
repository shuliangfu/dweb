/**
 * Console 入口加载、config / app.use 中间件与插件
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
import { afterEach, beforeEach, describe, expect, it } from "@dreamer/test";
import { getRepoRoot } from "../setup.ts";
import { App } from "../../src/core/app.ts";
import { setConsoleConfigDirectoryOverride } from "../../src/core/config.ts";
import {
  isConsoleAppInstance,
  loadConsoleAppEntry,
  looksLikeConsoleAppEntry,
} from "../../src/feature/console-app.ts";
import {
  type ConsoleContext,
  createConsoleContext,
} from "../../src/feature/console-context.ts";
import {
  loadDirectoryConsoleMiddlewares,
} from "../../src/feature/console-middleware.ts";
import {
  invokeConsoleAction,
  resolveConsoleRoute,
} from "../../src/feature/console-router.ts";

describe("looksLikeConsoleAppEntry / isConsoleAppInstance", () => {
  it("应忽略仅有 console.log 的历史占位文件", () => {
    expect(looksLikeConsoleAppEntry(`
/**
 * Console 应用入口（不启动 HTTP）。
 */
console.log("[signet-console] Use: deno task console:list");
`)).toBe(false);
  });

  it("应识别 export default App 入口", () => {
    expect(looksLikeConsoleAppEntry(`
import { App } from "@dreamer/dweb";
const app = new App({ kind: "console" });
export default app;
`)).toBe(true);
  });

  it("鸭子类型应识别 App 实例", () => {
    expect(isConsoleAppInstance({
      start: async () => {},
      shutdown: async () => {},
      container: {},
    })).toBe(true);
    expect(isConsoleAppInstance({ start: () => {} })).toBe(false);
    expect(isConsoleAppInstance(null)).toBe(false);
  });
});

describe("loadConsoleAppEntry", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await makeTempDir({ prefix: "dweb-console-entry-" });
  });

  afterEach(async () => {
    try {
      await remove(tmp, { recursive: true });
    } catch {
      // ignore
    }
  });

  it("占位 main.ts 不应被 import", async () => {
    await writeTextFile(
      join(tmp, "main.ts"),
      `console.log("should-not-run");\n`,
    );
    const app = await loadConsoleAppEntry(tmp);
    expect(app).toBeNull();
  });

  it("应加载 export default 的 App 形对象", async () => {
    await writeTextFile(
      join(tmp, "main.ts"),
      `const app = {
  start: async () => {},
  shutdown: async () => {},
  container: { kind: "console" },
};
export default app;
`,
    );
    const loaded = await loadConsoleAppEntry(tmp);
    expect(isConsoleAppInstance(loaded)).toBe(true);
    const container = (loaded as unknown as { container: { kind: string } })
      .container;
    expect(container.kind).toBe("console");
  });
});

describe("console App config + entry middleware/plugins", () => {
  let tmp: string;
  let originalCwd: string;
  let app: App | null = null;
  let prevRuntime: string | undefined;

  beforeEach(async () => {
    // Config loading only imports files inside the project
    // (isPathWithinProject). OS temp dirs fail that check on Windows
    // when cwd is not the temp folder, so keep fixtures under tests/data.
    tmp = join(
      getRepoRoot(),
      "tests",
      "data",
      `dweb-console-appcfg-${Date.now()}-${
        Math.random().toString(16).slice(2)
      }`,
    );
    await ensureDir(tmp);
    originalCwd = cwd();
    prevRuntime = getEnv("RUNTIME_ENV") ?? undefined;
    setEnv("RUNTIME_ENV", "dev");
    chdir(tmp);
  });

  afterEach(async () => {
    if (app) {
      try {
        await app.stop();
        await app.shutdown();
      } catch {
        // ignore
      }
      app = null;
    }
    setConsoleConfigDirectoryOverride(undefined);
    if (prevRuntime == null) deleteEnv("RUNTIME_ENV");
    else setEnv("RUNTIME_ENV", prevRuntime);
    chdir(originalCwd);
    try {
      await remove(tmp, { recursive: true });
    } catch {
      // ignore
    }
  });

  it("config.middlewares、main.dev.ts、plugins 与 app.use 都应生效", async () => {
    const configDir = join(tmp, "config");
    await ensureDir(configDir);
    await writeTextFile(
      join(configDir, "main.ts"),
      `export default {
  name: "console-app-test",
  kind: "console",
  version: "1.0.0",
  console: { slim: true },
  logger: { level: "warn", format: "text", output: { console: false } },
  plugins: [{
    name: "mark-plugin",
    onInit() {
      (globalThis as { __dwebConsolePlugin?: string[] }).__dwebConsolePlugin = ["onInit"];
    },
  }],
  middlewares: [
    async function configMw(ctx, next) {
      ctx.options.trace = [...(ctx.options.trace ?? []), "config"];
      return await next();
    },
  ],
};
`,
    );
    await writeTextFile(
      join(configDir, "main.dev.ts"),
      `export default {
  middlewares: [
    async function devMw(ctx, next) {
      ctx.options.trace = [...(ctx.options.trace ?? []), "dev"];
      return await next();
    },
  ],
};
`,
    );

    const routesDir = join(tmp, "routes");
    await ensureDir(join(routesDir, "init"));
    await writeTextFile(
      join(routesDir, "init", "_middleware.ts"),
      `export default async function (ctx, next) {
  ctx.options.trace = [...(ctx.options.trace ?? []), "dir"];
  return await next();
}
`,
    );
    await writeTextFile(
      join(routesDir, "init", "test.ts"),
      `export async function run(ctx) {
  ctx.options.trace = [...(ctx.options.trace ?? []), "action"];
  return 0;
}
`,
    );
    await writeTextFile(
      join(routesDir, "hello.ts"),
      `export function world(ctx) {
  ctx.options.plain = true;
  return 0;
}
`,
    );

    setConsoleConfigDirectoryOverride(configDir);
    app = new App(
      { kind: "console", hotReload: false },
      { mode: "console", configDirectories: [configDir] },
    );
    app.use(async (ctx: ConsoleContext, next: () => Promise<number>) => {
      ctx.options.trace = [...(ctx.options.trace as string[] ?? []), "entry"];
      return await next();
    });
    await app.start({ mode: "console" });
    // 入口不必调用 start；再次 start 应直接返回
    await app.start({ mode: "console" });

    expect(app.isConsoleMode()).toBe(true);
    expect(app.isConsoleSlim()).toBe(true);
    expect(app.getConfigConsoleMiddlewares().length).toBe(2);
    expect(app.getEntryConsoleMiddlewares().length).toBe(1);
    expect(
      (globalThis as { __dwebConsolePlugin?: string[] }).__dwebConsolePlugin,
    ).toEqual(["onInit"]);

    const resolved = await resolveConsoleRoute(routesDir, "init/test");
    const dirMws = await loadDirectoryConsoleMiddlewares(
      routesDir,
      resolved.filePath,
    );
    const ctx = createConsoleContext({
      app,
      routeName: "init/test",
      options: { trace: [] },
      cwd: tmp,
    });
    const code = await invokeConsoleAction(resolved, ctx, {
      middlewares: [
        ...app.getConfigConsoleMiddlewares(),
        ...app.getEntryConsoleMiddlewares(),
        ...dirMws,
      ],
    });
    expect(code).toBe(0);
    expect(ctx.options.trace).toEqual([
      "config",
      "dev",
      "entry",
      "dir",
      "action",
    ]);

    const hello = await resolveConsoleRoute(routesDir, "hello/world");
    const helloDir = await loadDirectoryConsoleMiddlewares(
      routesDir,
      hello.filePath,
    );
    const helloCtx = createConsoleContext({
      app,
      routeName: "hello/world",
      options: {},
      cwd: tmp,
    });
    const helloCode = await invokeConsoleAction(hello, helloCtx, {
      middlewares: helloDir,
    });
    expect(helloCode).toBe(0);
    expect(helloCtx.options.plain).toBe(true);
  });
});
