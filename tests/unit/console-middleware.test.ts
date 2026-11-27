/**
 * Console 中间件 / before-after 单元测试
 */

import "../setup.ts";
import {
  ensureDir,
  join,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterEach, beforeEach, describe, expect, it } from "@dreamer/test";
import { getRepoRoot } from "../setup.ts";
import type { ConsoleContext } from "../../src/feature/console-context.ts";
import {
  composeConsoleMiddlewares,
  extractConsoleMiddleware,
  loadConsoleMiddlewares,
  loadDirectoryConsoleMiddlewares,
  resolveConfigConsoleMiddlewares,
  runConsolePipeline,
} from "../../src/feature/console-middleware.ts";
import {
  formatConsoleModuleHelp,
  invokeConsoleAction,
  resolveConsoleRoute,
} from "../../src/feature/console-router.ts";

function fakeCtx(over: Partial<ConsoleContext> = {}): ConsoleContext {
  return {
    name: "test",
    args: [],
    options: {},
    cwd: ".",
    signal: new AbortController().signal,
    ...over,
  } as ConsoleContext;
}

describe("console-middleware", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await makeTempDir({ prefix: "dweb-console-mw-" });
  });

  afterEach(async () => {
    try {
      await remove(tmp, { recursive: true });
    } catch {
      // ignore
    }
  });

  it("composeConsoleMiddlewares 应按洋葱顺序执行", async () => {
    const order: string[] = [];
    const run = composeConsoleMiddlewares(
      [
        async (_ctx, next) => {
          order.push("mw1-before");
          const code = await next();
          order.push("mw1-after");
          return code;
        },
        async (_ctx, next) => {
          order.push("mw2-before");
          const code = await next();
          order.push("mw2-after");
          return code;
        },
      ],
      async () => {
        order.push("core");
        return 7;
      },
    );
    const code = await run(fakeCtx());
    expect(code).toBe(7);
    expect(order).toEqual([
      "mw1-before",
      "mw2-before",
      "core",
      "mw2-after",
      "mw1-after",
    ]);
  });

  it("runConsolePipeline 应调用 before/after", async () => {
    const order: string[] = [];
    const code = await runConsolePipeline({
      ctx: fakeCtx(),
      middlewares: [],
      before: async () => {
        order.push("before");
      },
      after: async (_c, exitCode) => {
        order.push(`after:${exitCode}`);
      },
      action: async () => {
        order.push("action");
        return 0;
      },
    });
    expect(code).toBe(0);
    expect(order).toEqual(["before", "action", "after:0"]);
  });

  it("loadConsoleMiddlewares 应加载目录下 default 导出", async () => {
    const dir = join(tmp, "middlewares");
    await ensureDir(dir);
    await writeTextFile(
      join(dir, "01-tag.ts"),
      `export default async function (ctx, next) {
  ctx.options.__mw = true;
  return await next();
}
`,
    );
    const mws = await loadConsoleMiddlewares(dir);
    expect(mws.length).toBe(1);
    const ctx = fakeCtx({ options: {} });
    const code = await composeConsoleMiddlewares(mws, async () => 0)(ctx);
    expect(code).toBe(0);
    expect(ctx.options.__mw).toBe(true);
  });

  it("invokeConsoleAction 应跑模块 before 与全局中间件", async () => {
    const routesDir = join(tmp, "routes");
    const mwDir = join(tmp, "middlewares");
    await ensureDir(routesDir);
    await ensureDir(mwDir);
    await writeTextFile(
      join(mwDir, "tag.ts"),
      `export default async function (ctx, next) {
  ctx.options.viaMw = true;
  return await next();
}
`,
    );
    await writeTextFile(
      join(routesDir, "job.ts"),
      `const order = [];
export async function before(ctx) { ctx.options.sawBefore = true; }
export async function run(ctx) {
  if (!ctx.options.viaMw || !ctx.options.sawBefore) return 9;
  return 0;
}
export async function after(ctx, code) { ctx.options.afterCode = code; }
`,
    );
    const resolved = await resolveConsoleRoute(routesDir, "job");
    const mws = await loadConsoleMiddlewares(mwDir);
    const ctx = fakeCtx({ options: {}, name: "job" });
    const code = await invokeConsoleAction(resolved, ctx, { middlewares: mws });
    expect(code).toBe(0);
    expect(ctx.options.viaMw).toBe(true);
    expect(ctx.options.sawBefore).toBe(true);
    expect(ctx.options.afterCode).toBe(0);
  });
});

describe("formatConsoleModuleHelp", () => {
  it("应列出动作与用法", () => {
    const text = formatConsoleModuleHelp("hello", ["world", "ping"], {
      description: "Hello cmds",
      actions: { world: { description: "Say hi" } },
    });
    expect(text).toContain("Hello cmds");
    expect(text).toContain("hello/world");
    expect(text).toContain("Say hi");
    expect(text).toContain("dweb-cli run hello/<action>");
  });
});

describe("directory-level _middleware.ts", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await makeTempDir({ prefix: "dweb-console-dirmw-" });
  });

  afterEach(async () => {
    try {
      await remove(tmp, { recursive: true });
    } catch {
      // ignore
    }
  });

  async function write(rel: string, body: string): Promise<string> {
    const full = join(tmp, rel);
    const dir = full.slice(0, full.lastIndexOf("/"));
    await ensureDir(dir);
    await writeTextFile(full, body);
    return full;
  }

  it("应按根到子目录顺序包裹命令，且无中间件的命令仍可执行", async () => {
    const routesDir = join(tmp, "routes");
    await write(
      "routes/_middleware.ts",
      `export default async function (ctx, next) {
  ctx.options.trace = [...(ctx.options.trace ?? []), "root"];
  return await next();
}
`,
    );
    await write(
      "routes/init/_middleware.ts",
      `export default async function (ctx, next) {
  ctx.options.trace = [...(ctx.options.trace ?? []), "init"];
  return await next();
}
`,
    );
    await write(
      "routes/init/test.ts",
      `export async function run(ctx) {
  ctx.options.trace = [...(ctx.options.trace ?? []), "action"];
  return 0;
}
`,
    );
    await write(
      "routes/hello.ts",
      `export function world(ctx) {
  ctx.options.ran = "hello";
  return 0;
}
`,
    );

    const testFile = join(routesDir, "init", "test.ts");
    const dirMws = await loadDirectoryConsoleMiddlewares(routesDir, testFile);
    expect(dirMws.length).toBe(2);

    const resolved = await resolveConsoleRoute(routesDir, "init/test");
    const ctx = fakeCtx({ options: { trace: [] }, name: "init/test" });
    const code = await invokeConsoleAction(resolved, ctx, {
      middlewares: dirMws,
    });
    expect(code).toBe(0);
    expect(ctx.options.trace).toEqual(["root", "init", "action"]);

    const helloFile = join(routesDir, "hello.ts");
    const helloMws = await loadDirectoryConsoleMiddlewares(
      routesDir,
      helloFile,
    );
    expect(helloMws.length).toBe(1);
    const helloResolved = await resolveConsoleRoute(routesDir, "hello/world");
    const helloCtx = fakeCtx({ options: {}, name: "hello/world" });
    const helloCode = await invokeConsoleAction(helloResolved, helloCtx, {
      middlewares: helloMws,
    });
    expect(helloCode).toBe(0);
    expect(helloCtx.options.ran).toBe("hello");
    expect(helloCtx.options.trace).toEqual(["root"]);
  });

  it("不调用 next 时应短路并阻止命令执行", async () => {
    const routesDir = join(tmp, "routes");
    await write(
      "routes/admin/_middleware.ts",
      `export default async function (_ctx, _next) {
  return 7;
}
`,
    );
    await write(
      "routes/admin/secret.ts",
      `export async function run(ctx) {
  ctx.options.leaked = true;
  return 0;
}
`,
    );
    const file = join(routesDir, "admin", "secret.ts");
    const mws = await loadDirectoryConsoleMiddlewares(routesDir, file);
    const resolved = await resolveConsoleRoute(routesDir, "admin/secret");
    const ctx = fakeCtx({ options: {}, name: "admin/secret" });
    const code = await invokeConsoleAction(resolved, ctx, { middlewares: mws });
    expect(code).toBe(7);
    expect(ctx.options.leaked).toBeUndefined();
  });

  it("resolveConfigConsoleMiddlewares 应加载函数与文件路径", async () => {
    const dir = join(getRepoRoot(), "tests", "data", "dweb-console-mw-cfg");
    await ensureDir(dir);
    const file = join(dir, "tag.ts");
    await writeTextFile(
      file,
      `export default async function (ctx, next) {
  ctx.options.fromFile = true;
  return await next();
}
`,
    );
    try {
      const fn = async (
        ctx: ReturnType<typeof fakeCtx>,
        next: () => Promise<number>,
      ) => {
        ctx.options.fromFn = true;
        return await next();
      };
      const mws = await resolveConfigConsoleMiddlewares({
        middlewares: [fn, file],
      });
      expect(mws.length).toBe(2);
      const ctx = fakeCtx({ options: {} });
      const code = await composeConsoleMiddlewares(mws, async () => 0)(ctx);
      expect(code).toBe(0);
      expect(ctx.options.fromFn).toBe(true);
      expect(ctx.options.fromFile).toBe(true);
    } finally {
      await remove(dir, { recursive: true }).catch(() => {});
    }
  });

  it("extractConsoleMiddleware 应识别 middleware 命名导出", () => {
    const fn = async (_c: unknown, next: () => Promise<number>) => next();
    expect(extractConsoleMiddleware({ middleware: fn })).toBe(fn);
    expect(extractConsoleMiddleware({ default: fn })).toBe(fn);
    expect(extractConsoleMiddleware({})).toBeNull();
  });
});
