/**
 * Console 命令发现：扫描 routes/ 列出可执行动作（供 run --list）
 */

import { pathToFileURL } from "node:url";
import { exists, join, readdir, relative } from "@dreamer/runtime-adapter";

/** 单条可列出的 console 命令 */
export interface ConsoleListedCommand {
  /** 路由名，如 hello/world、cache/clear */
  route: string;
  /** 相对 routesDir 的文件路径 */
  file: string;
  /** 动作名；default 表示 default/run/main */
  action: string;
  /** 来自 meta.description 或 meta.actions[action].description */
  description?: string;
}

const SKIP_EXPORTS = new Set(["meta", "__esModule"]);

const FALLBACK_ACTIONS = ["default", "run", "main"] as const;

async function walkTsFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir);
  for (const ent of entries) {
    const name = ent.name;
    if (name.startsWith(".") || name.startsWith("_")) continue;
    const full = join(dir, name);
    if (ent.isDirectory) {
      out.push(...await walkTsFiles(full));
    } else if (ent.isFile && name.endsWith(".ts") && !name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

function fileToRoutePrefix(routesDir: string, filePath: string): string {
  const rel = relative(routesDir, filePath).replace(/\\/g, "/");
  return rel.replace(/\.ts$/i, "");
}

type ConsoleMeta = {
  description?: string;
  actions?: Record<string, { description?: string }>;
};

/**
 * 扫描 routesDir，返回可执行命令列表（按 route 排序）
 *
 * @param filterPrefix 可选：只列出该模块前缀（如 `hello` 或 `crond`）
 */
export async function listConsoleCommands(
  routesDir: string,
  filterPrefix?: string,
): Promise<ConsoleListedCommand[]> {
  if (!(await exists(routesDir))) {
    return [];
  }

  const files = await walkTsFiles(routesDir);
  const listed: ConsoleListedCommand[] = [];

  for (const filePath of files) {
    const prefix = fileToRoutePrefix(routesDir, filePath);
    if (
      filterPrefix &&
      prefix !== filterPrefix &&
      !prefix.startsWith(filterPrefix + "/")
    ) {
      continue;
    }

    let mod: Record<string, unknown>;
    try {
      mod = await import(pathToFileURL(filePath).href) as Record<
        string,
        unknown
      >;
    } catch {
      continue;
    }

    const meta = mod.meta as ConsoleMeta | undefined;
    const namedActions = Object.keys(mod).filter((k) => {
      if (SKIP_EXPORTS.has(k)) return false;
      if ((FALLBACK_ACTIONS as readonly string[]).includes(k)) return false;
      return typeof mod[k] === "function";
    });

    const hasFallback = FALLBACK_ACTIONS.some((n) =>
      typeof mod[n] === "function"
    );
    const relFile = prefix + ".ts";

    // 具名动作：hello.ts#world → hello/world
    for (const action of namedActions) {
      listed.push({
        route: `${prefix}/${action}`,
        file: relFile,
        action,
        description: meta?.actions?.[action]?.description ??
          (namedActions.length === 1 ? meta?.description : undefined),
      });
    }

    // 仅 fallback（或兼有）：精确文件路径本身可跑，如 cache/clear.ts
    if (hasFallback) {
      const route = prefix;
      // 避免与「仅一层模块 + 具名动作」重复：单文件无路径段且已有具名动作时
      // 不额外列 prefix 本身（用户应跑 hello/world 而非 hello）
      if (namedActions.length === 0 || prefix.includes("/")) {
        listed.push({
          route,
          file: relFile,
          action: "default",
          description: meta?.description ??
            meta?.actions?.run?.description ??
            meta?.actions?.default?.description,
        });
      }
    }
  }

  const seen = new Set<string>();
  const unique = listed.filter((c) => {
    if (seen.has(c.route)) return false;
    seen.add(c.route);
    return true;
  });

  unique.sort((a, b) => a.route.localeCompare(b.route));
  return unique;
}

/**
 * 将命令列表格式化为可读文本
 */
export function formatConsoleCommandList(
  commands: ConsoleListedCommand[],
): string {
  if (commands.length === 0) {
    return "(no console commands found)";
  }
  const width = Math.min(
    40,
    Math.max(...commands.map((c) => c.route.length), 12),
  );
  return commands.map((c) => {
    const pad = " ".repeat(Math.max(1, width - c.route.length + 2));
    const desc = c.description ?? "";
    return `  ${c.route}${pad}${desc}`.trimEnd();
  }).join("\n");
}
