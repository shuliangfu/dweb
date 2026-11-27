/**
 * Plugin-provided console commands (dweb-only).
 *
 * After a plugin is configured in `console/main.ts` or `console/config`,
 * `dweb-cli run` scans its command modules. The scan directory is
 * configurable (`console.routesDir`, default `"routes"`) and resolved
 * against `console.baseDir` (typically `new URL(".", import.meta.url)`).
 *
 * This is not HTTP `onRoute` / RouteDefinition.
 *
 * @module dweb/feature/console-plugin-routes
 */

import {
  exists,
  fromFileUrl,
  isAbsolute,
  resolve,
} from "@dreamer/runtime-adapter";
import type { ServiceContainer } from "@dreamer/service";
import type { AppPlugin } from "../types/app.ts";
import { getPluginManager } from "../core/plugin.ts";
import {
  type ConsoleListedCommand,
  listConsoleCommands,
} from "./console-list.ts";
import {
  ConsoleRouteNotFoundError,
  resolveConsoleRoute,
  type ResolvedConsoleRoute,
} from "./console-router.ts";

/** A plugin command directory ready to scan or resolve. */
export interface ConsolePluginRouteRoot {
  pluginName: string;
  /** Absolute filesystem path of the command directory. */
  routesDir: string;
  /** Command base path without slashes; empty means commands have no base path. */
  basePath: string;
}

/** A single command declared on the plugin object itself. */
export interface ConsolePluginInlineCommand {
  pluginName: string;
  routeName: string;
  /** Optional module file (absolute path). */
  filePath?: string;
  /** Preloaded module (the plugin object when no `file` is given). */
  module?: Record<string, unknown>;
}

function toFilesystemPath(value: string | URL): string {
  const raw = typeof value === "string" ? value : value.href;
  if (raw.startsWith("file:")) {
    try {
      return fromFileUrl(raw);
    } catch {
      let filePath = decodeURIComponent(new URL(raw).pathname);
      if (filePath.match(/^\/[A-Za-z]:/)) filePath = filePath.slice(1);
      return filePath;
    }
  }
  return raw;
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

/** Active plugins in registration order. */
export function listActiveAppPlugins(container: ServiceContainer): AppPlugin[] {
  const pluginManager = getPluginManager(container);
  const out: AppPlugin[] = [];
  for (const name of pluginManager.getRegisteredPlugins()) {
    if (pluginManager.getState(name) !== "active") continue;
    const plugin = pluginManager.getPlugin(name);
    if (plugin) out.push(plugin as AppPlugin);
  }
  return out;
}

/**
 * Collect plugin command directories. Plugins without `console` are skipped.
 * A relative `routesDir` is resolved against `baseDir` only (never against
 * the host project, so a plugin cannot accidentally scan host `routes/`).
 */
export async function collectPluginConsoleRouteRoots(
  plugins: AppPlugin[],
): Promise<ConsolePluginRouteRoot[]> {
  const roots: ConsolePluginRouteRoot[] = [];
  for (const plugin of plugins) {
    const cfg = plugin.console;
    if (!cfg) continue;
    const hasDirHint = cfg.routesDir != null || cfg.baseDir != null;
    if (!hasDirHint) continue;

    const routesRaw = toFilesystemPath(cfg.routesDir ?? "routes");
    let routesDir: string;
    if (isAbsolute(routesRaw)) {
      routesDir = routesRaw;
    } else if (cfg.baseDir != null) {
      routesDir = resolve(toFilesystemPath(cfg.baseDir), routesRaw);
    } else {
      continue;
    }

    if (!(await exists(routesDir))) continue;
    roots.push({
      pluginName: plugin.name,
      routesDir,
      basePath: cfg.basePath ? trimSlashes(String(cfg.basePath)) : "",
    });
  }
  return roots;
}

/** Collect single-file commands declared as `console.command`. */
export function collectPluginInlineCommands(
  plugins: AppPlugin[],
): ConsolePluginInlineCommand[] {
  const out: ConsolePluginInlineCommand[] = [];
  for (const plugin of plugins) {
    const command = plugin.console?.command;
    if (command == null) continue;
    if (typeof command === "string") {
      const routeName = trimSlashes(command);
      if (!routeName) continue;
      out.push({
        pluginName: plugin.name,
        routeName,
        module: plugin as unknown as Record<string, unknown>,
      });
      continue;
    }
    if (typeof command !== "object" || typeof command.name !== "string") {
      continue;
    }
    const routeName = trimSlashes(command.name);
    if (!routeName) continue;
    const filePath = command.file != null
      ? toFilesystemPath(command.file)
      : undefined;
    out.push({
      pluginName: plugin.name,
      routeName,
      filePath,
      module: filePath
        ? undefined
        : plugin as unknown as Record<string, unknown>,
    });
  }
  return out;
}

function matchesFilter(route: string, filter?: string): boolean {
  if (!filter) return true;
  return route === filter || route.startsWith(`${filter}/`);
}

const FALLBACK_ACTIONS = ["default", "run", "main"] as const;

export async function listPluginConsoleCommands(
  roots: ConsolePluginRouteRoot[],
  inline: ConsolePluginInlineCommand[] = [],
  filterPrefix?: string,
): Promise<ConsoleListedCommand[]> {
  const listed: ConsoleListedCommand[] = [];

  for (const root of roots) {
    const items = await listConsoleCommands(root.routesDir);
    for (const item of items) {
      const route = root.basePath
        ? `${root.basePath}/${item.route}`
        : item.route;
      if (!matchesFilter(route, filterPrefix)) continue;
      listed.push({
        ...item,
        route,
        file: root.basePath ? `${root.basePath}/${item.file}` : item.file,
      });
    }
  }

  for (const cmd of inline) {
    if (!matchesFilter(cmd.routeName, filterPrefix)) continue;
    let mod = cmd.module;
    if (!mod && cmd.filePath) {
      try {
        const { pathToFileURL } = await import("node:url");
        mod = await import(pathToFileURL(cmd.filePath).href) as Record<
          string,
          unknown
        >;
      } catch {
        continue;
      }
    }
    if (!mod) continue;
    const meta = mod.meta as
      | {
        description?: string;
        actions?: Record<string, { description?: string }>;
      }
      | undefined;
    // A single-file command is one route. Do not treat other exports
    // (plugin factories, hooks) as named actions.
    const hasFallback = FALLBACK_ACTIONS.some((name) =>
      typeof mod[name] === "function"
    );
    const file = cmd.filePath ?? `${cmd.pluginName}.plugin`;
    if (hasFallback) {
      listed.push({
        route: cmd.routeName,
        file,
        action: "default",
        description: meta?.description ??
          meta?.actions?.run?.description ??
          meta?.actions?.default?.description,
      });
    }
  }

  return listed;
}

/** First-seen route wins; then sort by route name. */
export function mergeConsoleCommandLists(
  ...lists: ConsoleListedCommand[][]
): ConsoleListedCommand[] {
  const seen = new Set<string>();
  const unique: ConsoleListedCommand[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (seen.has(item.route)) continue;
      seen.add(item.route);
      unique.push(item);
    }
  }
  unique.sort((a, b) => a.route.localeCompare(b.route));
  return unique;
}

function withMiddlewareRoot(
  resolved: ResolvedConsoleRoute,
  routesDir: string,
): ResolvedConsoleRoute {
  return { ...resolved, middlewareRoot: routesDir };
}

/**
 * Resolve a console route from the host directory first (host wins), then
 * inline plugin commands, then plugin route directories in registration order.
 */
export async function resolveConsoleRouteFromSources(
  hostRoutesDir: string,
  routePath: string,
  roots: ConsolePluginRouteRoot[] = [],
  inline: ConsolePluginInlineCommand[] = [],
): Promise<ResolvedConsoleRoute> {
  const candidates: string[] = [];

  if (await exists(hostRoutesDir)) {
    try {
      const host = await resolveConsoleRoute(hostRoutesDir, routePath);
      return withMiddlewareRoot(host, hostRoutesDir);
    } catch (err) {
      if (err instanceof ConsoleRouteNotFoundError) {
        candidates.push(...err.candidates);
      } else {
        throw err;
      }
    }
  }

  const segments = routePath.replace(/^\/+|\/+$/g, "");
  for (const cmd of inline) {
    if (segments === cmd.routeName) {
      if (cmd.filePath) {
        if (!(await exists(cmd.filePath))) continue;
        return {
          filePath: cmd.filePath,
          action: null,
          routeName: cmd.routeName,
          candidates: [...candidates, cmd.filePath],
          module: cmd.module,
        };
      }
      if (cmd.module) {
        return {
          filePath: cmd.filePath ?? "",
          action: null,
          routeName: cmd.routeName,
          candidates,
          module: cmd.module,
        };
      }
    }
  }

  for (const root of roots) {
    let inner = segments;
    if (root.basePath) {
      if (segments === root.basePath) continue;
      const head = `${root.basePath}/`;
      if (!segments.startsWith(head)) continue;
      inner = segments.slice(head.length);
    }
    if (!inner) continue;
    try {
      const resolved = await resolveConsoleRoute(root.routesDir, inner);
      return {
        ...withMiddlewareRoot(resolved, root.routesDir),
        routeName: root.basePath
          ? `${root.basePath}/${resolved.routeName}`
          : resolved.routeName,
        candidates: [...candidates, ...resolved.candidates],
      };
    } catch (err) {
      if (err instanceof ConsoleRouteNotFoundError) {
        candidates.push(...err.candidates);
      } else {
        throw err;
      }
    }
  }

  throw new ConsoleRouteNotFoundError(routePath, candidates);
}
