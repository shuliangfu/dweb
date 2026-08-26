/**
 * Console 文件路由解析
 *
 * `dweb-cli run <route>/<action>` → `routes/` 下模块 + 导出方法。
 *
 * 解析优先级（与 CONSOLE 规划一致）：
 * 1. 精确文件：`routes/a/b.ts` → default / run / main
 * 2. 聚合文件：`routes/a.ts` 的导出 `b`（如 `hello/world`、`crond/start`）
 * 3. 单段：`routes/a.ts` → default / run / main
 */

import { pathToFileURL } from "node:url";
import { exists, join, realPath } from "@dreamer/runtime-adapter";
import type { ConsoleContext } from "./console-context.ts";
import {
  type ConsoleAfterHook,
  type ConsoleBeforeHook,
  type ConsoleMiddleware,
  runConsolePipeline,
} from "./console-middleware.ts";
import { isPathWithinProject } from "../utils/path.ts";

/** 解析成功的路由绑定 */
export interface ResolvedConsoleRoute {
  /** 模块绝对路径 */
  filePath: string;
  /** 方法名；null 表示 default / run / main */
  action: string | null;
  /** 规范化路由名 */
  routeName: string;
  /** 尝试过的候选路径（调试 / 错误信息） */
  candidates: string[];
}

const ACTION_FALLBACKS = ["default", "run", "main"] as const;

/** 合法路由段：字母数字、点、下划线、连字符（禁止 .. 与路径分隔） */
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * 将 CLI 路由字符串拆成段（去首尾斜杠）
 * @throws ConsoleRouteNotFoundError 段非法（含 `..`）时
 */
export function splitConsoleRoute(routePath: string): string[] {
  const segments = routePath.replace(/^\/+|\/+$/g, "").split("/").filter(
    Boolean,
  );
  for (const seg of segments) {
    if (seg === "." || seg === ".." || !SAFE_SEGMENT.test(seg)) {
      throw new ConsoleRouteNotFoundError(
        routePath,
        [],
        `Invalid console route segment: "${seg}"`,
      );
    }
  }
  return segments;
}

/**
 * 确认 filePath 落在 routesDir 内（用 realPath 防 symlink / ..）。
 * 校验通过后仍返回原始 filePath，避免 macOS `/var`→`/private/var` 与 join 路径不一致。
 */
async function assertWithinRoutesDir(
  filePath: string,
  routesDir: string,
): Promise<string> {
  let resolvedFile: string;
  let resolvedRoot: string;
  try {
    resolvedFile = await realPath(filePath);
    resolvedRoot = await realPath(routesDir);
  } catch {
    resolvedFile = filePath;
    resolvedRoot = routesDir;
  }
  if (!isPathWithinProject(resolvedFile, resolvedRoot)) {
    throw new ConsoleRouteNotFoundError(
      filePath,
      [filePath],
      `Console route escapes routesDir: ${filePath}`,
    );
  }
  return filePath;
}

/**
 * 解析 console 路由到文件 + 动作
 *
 * @param routesDir routes 根目录（绝对路径）
 * @param routePath 如 `hello/world`、`crond/start`
 */
export async function resolveConsoleRoute(
  routesDir: string,
  routePath: string,
): Promise<ResolvedConsoleRoute> {
  const segments = splitConsoleRoute(routePath);
  const routeName = segments.join("/");
  const candidates: string[] = [];

  if (segments.length === 0) {
    throw new ConsoleRouteNotFoundError(routePath, candidates);
  }

  // 1) 精确文件：routes/a/b.ts
  const exactFile = join(routesDir, ...segments) + ".ts";
  candidates.push(exactFile);
  if (await exists(exactFile)) {
    const filePath = await assertWithinRoutesDir(exactFile, routesDir);
    return {
      filePath,
      action: null,
      routeName,
      candidates,
    };
  }

  // 2) 聚合文件：routes/a.ts + 方法 b
  if (segments.length >= 2) {
    const filePathRaw = join(routesDir, ...segments.slice(0, -1)) + ".ts";
    const method = segments[segments.length - 1]!;
    candidates.push(`${filePathRaw}#${method}`);
    if (await exists(filePathRaw)) {
      const filePath = await assertWithinRoutesDir(filePathRaw, routesDir);
      return {
        filePath,
        action: method,
        routeName,
        candidates,
      };
    }
  }

  // 3) 单段文件：routes/a.ts → default/run/main
  if (segments.length === 1) {
    const filePathRaw = join(routesDir, segments[0]! + ".ts");
    candidates.push(filePathRaw);
    if (await exists(filePathRaw)) {
      const filePath = await assertWithinRoutesDir(filePathRaw, routesDir);
      return {
        filePath,
        action: null,
        routeName,
        candidates,
      };
    }
  }

  throw new ConsoleRouteNotFoundError(routePath, candidates);
}

const HOOK_NAMES = new Set(["before", "after", "meta"]);

/** 列出模块上可作为动作的导出（排除 hooks / meta / fallback 名在单独逻辑里处理） */
export function listModuleActionNames(mod: Record<string, unknown>): string[] {
  return Object.keys(mod).filter((k) => {
    if (HOOK_NAMES.has(k) || k === "__esModule") return false;
    if ((ACTION_FALLBACKS as readonly string[]).includes(k)) return false;
    return typeof mod[k] === "function";
  });
}

/**
 * 格式化「模块帮助」：有哪些动作可跑
 */
export function formatConsoleModuleHelp(
  routePrefix: string,
  available: string[],
  meta?: {
    description?: string;
    actions?: Record<string, { description?: string }>;
  },
): string {
  const lines: string[] = [];
  if (meta?.description) {
    lines.push(meta.description);
  }
  lines.push(`Module: ${routePrefix}`);
  if (available.length === 0) {
    lines.push("  (no named actions; export default / run / main)");
  } else {
    lines.push("Actions:");
    for (const a of available) {
      const desc = meta?.actions?.[a]?.description;
      lines.push(
        desc ? `  ${routePrefix}/${a}  — ${desc}` : `  ${routePrefix}/${a}`,
      );
    }
  }
  lines.push(`Run: dweb-cli run ${routePrefix}/<action>`);
  lines.push("Or:  dweb-cli run --list");
  return lines.join("\n");
}

export interface InvokeConsoleActionOptions {
  /** 全局中间件（console/middlewares） */
  middlewares?: ConsoleMiddleware[];
}

/**
 * 从已解析路由加载模块并执行动作（含 before/after 与全局中间件）
 *
 * @returns 退出码（动作返回 number 时使用，否则 0）
 */
export async function invokeConsoleAction(
  resolved: ResolvedConsoleRoute,
  ctx: ConsoleContext,
  options: InvokeConsoleActionOptions = {},
): Promise<number> {
  const mod = await import(pathToFileURL(resolved.filePath).href) as Record<
    string,
    unknown
  >;

  const named = listModuleActionNames(mod);
  const meta = mod.meta as {
    description?: string;
    actions?: Record<string, { description?: string }>;
  } | undefined;

  let fn: unknown;
  if (resolved.action) {
    fn = mod[resolved.action];
    if (typeof fn !== "function") {
      const prefix = resolved.routeName.includes("/")
        ? resolved.routeName.slice(0, resolved.routeName.lastIndexOf("/"))
        : resolved.routeName;
      throw new ConsoleActionNotFoundError(
        resolved.routeName,
        resolved.action,
        resolved.filePath,
        named,
        formatConsoleModuleHelp(prefix, named, meta),
      );
    }
  } else {
    for (const name of ACTION_FALLBACKS) {
      if (typeof mod[name] === "function") {
        fn = mod[name];
        break;
      }
    }
    if (typeof fn !== "function") {
      // 单模块仅有具名动作：给出模块 help，而不是生硬的 default|run|main
      if (named.length > 0) {
        throw new ConsoleModuleHelpError(
          resolved.routeName,
          formatConsoleModuleHelp(resolved.routeName, named, meta),
        );
      }
      throw new ConsoleActionNotFoundError(
        resolved.routeName,
        ACTION_FALLBACKS.join("|"),
        resolved.filePath,
        named,
      );
    }
  }

  const before = typeof mod.before === "function"
    ? mod.before as ConsoleBeforeHook
    : null;
  const after = typeof mod.after === "function"
    ? mod.after as ConsoleAfterHook
    : null;

  return await runConsolePipeline({
    ctx,
    middlewares: options.middlewares ?? [],
    before,
    after,
    action: async (c) => {
      const result = await (fn as (ctx: ConsoleContext) => unknown)(c);
      if (typeof result === "number" && Number.isFinite(result)) {
        return result;
      }
      return 0;
    },
  });
}

/** 路由未找到或非法（退出码 2） */
export class ConsoleRouteNotFoundError extends Error {
  readonly candidates: string[];
  constructor(routePath: string, candidates: string[], detail?: string) {
    super(
      detail ??
        (`Console route not found: ${routePath}` +
          (candidates.length
            ? `\nTried:\n${candidates.map((c) => `  - ${c}`).join("\n")}`
            : "")),
    );
    this.name = "ConsoleRouteNotFoundError";
    this.candidates = candidates;
  }
}

/** 文件存在但无对应导出方法（退出码 2） */
export class ConsoleActionNotFoundError extends Error {
  readonly helpText?: string;
  constructor(
    routeName: string,
    action: string,
    filePath: string,
    available: string[],
    helpText?: string,
  ) {
    super(
      helpText ??
        (`Console action "${action}" not found in ${filePath} (route: ${routeName})` +
          (available.length ? `\nAvailable: ${available.join(", ")}` : "")),
    );
    this.name = "ConsoleActionNotFoundError";
    this.helpText = helpText;
  }
}

/**
 * 用户只写了模块名（如 `run hello`），模块有具名动作但无 default/run/main
 * 退出码 2，消息即模块 help
 */
export class ConsoleModuleHelpError extends Error {
  readonly helpText: string;
  constructor(routeName: string, helpText: string) {
    super(helpText);
    this.name = "ConsoleModuleHelpError";
    this.helpText = helpText;
    void routeName;
  }
}
