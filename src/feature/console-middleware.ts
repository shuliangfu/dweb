/**
 * Console 中间件 + 模块 before/after 钩子
 *
 * `dweb-cli run` 按洋葱模型由外到内执行（先注册的包住后注册的）：
 * 1. 全局自动加载：`console/middlewares/*.ts`（按文件名排序）
 * 2. 配置声明：`config/main.ts`（及 main.dev.ts / main.prod.ts）与
 *    `new App({ middlewares })` 合并后的 `middlewares`（kind=console）
 * 3. 入口注册：`console/main.ts` 里 `app.use(...)`
 * 4. 目录级：从 `routes/` 根到命令文件所在目录的各层 `_middleware.ts`
 * 5. 路由模块 `before` → action → `after`
 *
 * 各层导出约定与 HTTP 相同：`export default` 或 `export const middleware`。
 * 目录级中间件不调用 `next()` 即可短路并返回退出码。
 */

import { pathToFileURL } from "node:url";
import {
  exists,
  join,
  readdir,
  realPath,
  relative,
  resolve,
} from "@dreamer/runtime-adapter";
import { isPathWithinProject } from "../utils/path.ts";
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

/** 从模块取出 console 中间件（default 或 middleware 导出） */
export function extractConsoleMiddleware(
  mod: Record<string, unknown>,
): ConsoleMiddleware | null {
  if (isMiddlewareFn(mod.default)) return mod.default;
  if (isMiddlewareFn(mod.middleware)) return mod.middleware;
  return null;
}

/**
 * 加载命令路径上的目录级 `_middleware.ts`（从 routes 根到命令文件所在目录，由外到内）。
 *
 * 例如 `routes/init/test.ts` 会依次加载 `routes/_middleware.ts`、
 * `routes/init/_middleware.ts`。聚合文件 `routes/hello.ts` 只加载 `routes/_middleware.ts`。
 * 某层缺失或加载失败时跳过，不影响其余层与命令本身。
 *
 * @param routesDir routes 根目录（绝对路径）
 * @param filePath 已解析的命令模块绝对路径
 */
export async function loadDirectoryConsoleMiddlewares(
  routesDir: string,
  filePath: string,
): Promise<ConsoleMiddleware[]> {
  if (!(await exists(routesDir)) || !(await exists(filePath))) {
    return [];
  }

  const rel = relative(routesDir, filePath).replace(/\\/g, "/");
  if (!rel || rel.startsWith("..")) {
    return [];
  }

  const dirParts = rel.split("/").slice(0, -1);
  const dirs: string[] = [routesDir];
  let current = routesDir;
  for (const part of dirParts) {
    if (!part || part === "." || part === "..") continue;
    current = join(current, part);
    dirs.push(current);
  }

  const out: ConsoleMiddleware[] = [];
  for (const dir of dirs) {
    const candidates = ["_middleware.ts", "_middleware.js"];
    for (const name of candidates) {
      const full = join(dir, name);
      if (!(await exists(full))) continue;
      try {
        const mod = await import(pathToFileURL(full).href) as Record<
          string,
          unknown
        >;
        const fn = extractConsoleMiddleware(mod);
        if (fn) out.push(fn);
      } catch {
        // 单层加载失败时跳过，与 HTTP routes/_middleware.ts 一致
      }
      break;
    }
  }
  return out;
}

/**
 * 从已合并的 AppConfig 解析 kind=console 的 middlewares（函数或文件路径）。
 * 字符串路径须落在项目目录内；加载失败时抛出。
 */
export async function resolveConfigConsoleMiddlewares(
  config: { middlewares?: unknown[] } | null | undefined,
): Promise<ConsoleMiddleware[]> {
  const list = config?.middlewares;
  if (!Array.isArray(list) || list.length === 0) {
    return [];
  }

  const out: ConsoleMiddleware[] = [];

  for (const item of list) {
    let candidate: unknown = item;
    if (item && typeof item === "object" && "middleware" in item) {
      candidate = (item as { middleware: unknown }).middleware;
    }
    if (isMiddlewareFn(candidate)) {
      out.push(candidate);
      continue;
    }
    if (typeof candidate !== "string" || candidate.length === 0) {
      continue;
    }
    const resolvedPath = candidate.startsWith("file://")
      ? candidate.slice(7)
      : await realPath(resolve(candidate));
    if (!isPathWithinProject(resolvedPath)) {
      throw new Error(
        `Console middleware path must be inside the project: ${candidate}`,
      );
    }
    const mod = await import(pathToFileURL(resolvedPath).href) as Record<
      string,
      unknown
    >;
    const fn = extractConsoleMiddleware(mod);
    if (!fn) {
      throw new Error(
        `Console middleware file has no default / middleware export: ${candidate}`,
      );
    }
    out.push(fn);
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
