/**
 * Plugin-provided page routes (file-route compatible).
 *
 * `@dreamer/router` only scans the host routes directory and has no addRoute
 * API. Plugins can append page RouteDefinitions from `onRoute` with
 * `meta.fullPath` pointing at a module that exports `default` and `load`.
 * This module stores those pages, attaches them to the scanned Router
 * (match / getRoutes / getClientRoutes), and records their files so
 * loadRouteModule and the client strip-load plugin can reach them.
 *
 * @module dweb/feature/plugin-page-routes
 */

import type { Route, RouteMatch, Router } from "@dreamer/router";
import type { ServiceContainer } from "@dreamer/service";
import type { RouteDefinition } from "../core/plugin-events.ts";

/** A page a plugin registered through `onRoute`. */
export interface PluginPageRoute {
  /** URL path, e.g. `/rbac/roles`. */
  path: string;
  /** Absolute file path (or file URL) of the route module. */
  fullPath: string;
  /**
   * Optional client-only module path (no `load` export).
   * When set, the browser bundle imports this file instead of `fullPath`.
   */
  clientFullPath?: string;
  /** Client ROUTE_LOADERS / hydration component key, e.g. `rbac/roles`. */
  component: string;
  type?: Route["type"];
  meta?: Route["meta"];
}

const pagesByContainer = new WeakMap<ServiceContainer, PluginPageRoute[]>();
const pluginPageFiles = new Set<string>();

/** Normalize a filesystem path or file URL for allow-list comparisons. */
export function normalizePluginPageFile(path: string): string {
  const raw = path.trim();
  if (raw.startsWith("file://")) {
    let filePath = decodeURIComponent(new URL(raw).pathname);
    if (filePath.match(/^\/[A-Za-z]:/)) filePath = filePath.slice(1);
    return filePath.replace(/\\/g, "/");
  }
  return raw.replace(/\\/g, "/");
}

function normalizeRoutePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") return "/";
  return trimmed.replace(/\/+$/, "") || "/";
}

function componentFromDefinition(def: RouteDefinition): string {
  const meta = (def.meta ?? {}) as Record<string, unknown>;
  if (typeof meta.component === "string" && meta.component.trim()) {
    return meta.component.replace(/\\/g, "/").replace(/^\//, "").replace(
      /\.(tsx?|jsx?)$/i,
      "",
    );
  }
  if (typeof meta.file === "string" && meta.file.trim()) {
    const file = meta.file.replace(/\\/g, "/").replace(/^\//, "");
    if (!file.startsWith("/") && !/^[A-Za-z]:/.test(file)) {
      return file.replace(/\.(tsx?|jsx?)$/i, "");
    }
  }
  return normalizeRoutePath(def.path).replace(/^\//, "");
}

function isApiDefinition(def: RouteDefinition): boolean {
  const meta = (def.meta ?? {}) as Record<string, unknown>;
  if (meta.isApi === true) return true;
  if (meta.type === "api") return true;
  const method = (def.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "*") return true;
  return false;
}

function looksLikePageModule(fullPath: string): boolean {
  const path = normalizePluginPageFile(fullPath);
  return /\.(tsx?|jsx?)$/i.test(path) || path.startsWith("file://");
}

/**
 * Collect page routes a plugin added via `onRoute`.
 * Host file routes win when the path already exists.
 */
export function collectPluginPageRoutes(
  definitions: RouteDefinition[],
  existingPaths: Iterable<string> = [],
): PluginPageRoute[] {
  const taken = new Set(
    [...existingPaths].map((path) => normalizeRoutePath(path)),
  );
  const pages: PluginPageRoute[] = [];
  for (const def of definitions) {
    if (!def?.path || isApiDefinition(def)) continue;
    const meta = (def.meta ?? {}) as Record<string, unknown>;
    const fullPath = typeof meta.fullPath === "string"
      ? meta.fullPath.trim()
      : "";
    if (!fullPath || !looksLikePageModule(fullPath)) continue;
    const path = normalizeRoutePath(def.path);
    if (taken.has(path)) continue;
    taken.add(path);
    const type = meta.type === "dynamic" || meta.type === "wildcard" ||
        meta.type === "optional"
      ? meta.type
      : "static";
    const clientFullPath = typeof meta.clientFullPath === "string"
      ? meta.clientFullPath.trim()
      : "";
    pages.push({
      path,
      fullPath,
      clientFullPath: clientFullPath || undefined,
      component: componentFromDefinition(def),
      type,
      meta: def.meta as Route["meta"],
    });
  }
  return pages;
}

/** Remember plugin page files so loadRouteModule / strip-load can allow them. */
export function registerPluginPageFiles(paths: Iterable<string>): void {
  for (const path of paths) {
    if (!path) continue;
    pluginPageFiles.add(normalizePluginPageFile(path));
  }
}

/** Test helper: clear the process-wide plugin page file allow-list. */
export function resetPluginPageFiles(): void {
  pluginPageFiles.clear();
}

export function getRegisteredPluginPageFiles(): string[] {
  return [...pluginPageFiles];
}

/** True when `filePath` is a registered plugin page module. */
export function isRegisteredPluginPageFile(filePath: string): boolean {
  if (!filePath) return false;
  return pluginPageFiles.has(normalizePluginPageFile(filePath));
}

export function setPluginPageRoutes(
  container: ServiceContainer,
  pages: PluginPageRoute[],
): void {
  pagesByContainer.set(container, pages);
  registerPluginPageFiles(pages.map((page) => page.fullPath));
}

export function getPluginPageRoutes(
  container: ServiceContainer,
): PluginPageRoute[] {
  return pagesByContainer.get(container) ?? [];
}

function toRoute(page: PluginPageRoute): Route {
  return {
    path: page.path,
    file: `${page.component}.tsx`,
    fullPath: page.fullPath,
    type: page.type ?? "static",
    isApi: false,
    isSpecial: false,
    meta: page.meta,
  };
}

function matchPluginPage(
  pages: PluginPageRoute[],
  pathname: string,
): RouteMatch | null {
  const url = new URL(pathname, "http://localhost");
  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    query[key] = value;
  }
  const clean = normalizeRoutePath(url.pathname);
  const page = pages.find((item) => normalizeRoutePath(item.path) === clean);
  if (!page) return null;
  const route = toRoute(page);
  return {
    route,
    params: {},
    query,
    fullPath: pathname,
    isApi: false,
    meta: route.meta || {},
  };
}

type MutableRouter = Router & {
  match: Router["match"];
  getRoutes: Router["getRoutes"];
  getClientRoutes: Router["getClientRoutes"];
};

/**
 * Attach plugin pages to a scanned Router without changing @dreamer/router.
 * Host file matches stay first; plugin pages are used when the scan misses.
 */
export function attachPluginPageRoutes(
  router: Router,
  pages: PluginPageRoute[],
): void {
  if (pages.length === 0) return;
  const mutable = router as MutableRouter;
  const origMatch = mutable.match.bind(router);
  const origGetRoutes = mutable.getRoutes.bind(router);
  const origGetClientRoutes = mutable.getClientRoutes.bind(router);
  const asRoutes = pages.map(toRoute);

  mutable.getRoutes = () => [...origGetRoutes(), ...asRoutes];
  mutable.getClientRoutes = () => [
    ...origGetClientRoutes(),
    ...pages.map((page) => ({
      path: page.path,
      component: page.component,
      type: page.type ?? "static",
      meta: page.meta,
    })),
  ];
  mutable.match = async (pathname, options) => {
    const hit = await origMatch(pathname, options);
    if (hit) return hit;
    return matchPluginPage(pages, pathname);
  };
}

/**
 * Apply `onRoute` results: keep host routes, register new plugin pages.
 */
export function applyOnRoutePageDefinitions(
  container: ServiceContainer,
  router: Router,
  definitions: RouteDefinition[],
  scannedPaths: Iterable<string>,
): PluginPageRoute[] {
  const pages = collectPluginPageRoutes(definitions, scannedPaths);
  setPluginPageRoutes(container, pages);
  attachPluginPageRoutes(router, pages);
  return pages;
}
