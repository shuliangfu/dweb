/**
 * Console 全局中间件 + 模块 before/after 钩子（MVP）
 *
 * - `console/middlewares/*.ts`：default 或 `middleware` 导出，洋葱模型
 * - 路由模块可选 `export async function before/after`
 */

import { pathToFileURL } from "node:url";
import { exists, join, readdir } from "@dreamer/runtime-adapter";
import type { ConsoleContext } from "./console-context.ts";

/** Console 中间件：(ctx, next) => exitCode */
export type ConsoleMiddleware = (
  ctx: ConsoleContext,
  next: () => Promise<number>,
) => Promise<number> | number;

export type ConsoleBeforeHook = (
  ctx: ConsoleContext,
) => void | Promise<void>;

export type ConsoleAfterHook = (
  ctx: ConsoleContext,
  exitCode: number,
) => void | Promise<void>;

function isMiddlewareFn(v: unknown): v is ConsoleMiddleware {
  return typeof v === "function";
}

/**
 * 加载 `middlewaresDir` 下全部 `.ts` 中间件（按文件名排序）
 */
export async function loadConsoleMiddlewares(
  middlewaresDir: string,
): Promise<ConsoleMiddleware[]> {
  if (!(await exists(middlewaresDir))) {
    return [];
  }
  const entries = await readdir(middlewaresDir);
  const files = entries
    .filter((e) =>
      e.isFile && e.name.endsWith(".ts") && !e.name.endsWith(".d.ts") &&
      !e.name.startsWith("_") && !e.name.startsWith(".")
    )
    .map((e) => e.name)
    .sort();

  const out: ConsoleMiddleware[] = [];
  for (const name of files) {
    const full = join(middlewaresDir, name);
    try {
      const mod = await import(pathToFileURL(full).href) as Record<
        string,
        unknown
      >;
      const fn = isMiddlewareFn(mod.default)
        ? mod.default
        : isMiddlewareFn(mod.middleware)
        ? mod.middleware
        : null;
      if (fn) out.push(fn);
    } catch {
      // 跳过无法加载的中间件文件
    }
  }
  return out;
}

/**
 * 洋葱模型组合中间件，最终调用 `core`
 */
export function composeConsoleMiddlewares(
  middlewares: ConsoleMiddleware[],
  core: () => Promise<number>,
): (ctx: ConsoleContext) => Promise<number> {
  return async (ctx: ConsoleContext) => {
    let index = -1;
    const dispatch = async (i: number): Promise<number> => {
      if (i <= index) {
        throw new Error("console middleware called next() multiple times");
      }
      index = i;
      const mw = middlewares[i];
      if (!mw) {
        return await core();
      }
      return await mw(ctx, () => dispatch(i + 1));
    };
    return await dispatch(0);
  };
}

/**
 * 执行：全局中间件 → before → action → after
 */
export async function runConsolePipeline(opts: {
  ctx: ConsoleContext;
  middlewares: ConsoleMiddleware[];
  before?: ConsoleBeforeHook | null;
  after?: ConsoleAfterHook | null;
  action: (ctx: ConsoleContext) => Promise<number>;
}): Promise<number> {
  const { ctx, middlewares, before, after, action } = opts;
  const core = async () => {
    if (before) await before(ctx);
    let code = 0;
    try {
      code = await action(ctx);
    } finally {
      if (after) await after(ctx, code);
    }
    return code;
  };
  if (middlewares.length === 0) {
    return await core();
  }
  return await composeConsoleMiddlewares(middlewares, core)(ctx);
}
