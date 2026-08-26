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
import type { ConsoleContext } from "../../src/feature/console-context.ts";
import {
  composeConsoleMiddlewares,
  loadConsoleMiddlewares,
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
