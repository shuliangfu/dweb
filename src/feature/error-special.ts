/**
 * Project error special pages: prefer `_500`, fall back to `_error`.
 *
 * Boundary (do not collide):
 * - `_404` — unmatched page routes (not-found-middleware → full page render)
 * - `_500` — unhandled render/load failures → HTTP 500 HTML (this module)
 * - `_error` — legacy alias for the same catch path when `_500` is absent
 * - admin `ErrorPage` / `routes/error/500` — explicit navigable UX routes, not framework catch
 */
import type { RouteMatch, Router } from "@dreamer/router";
import type { ServiceContainer } from "@dreamer/service";
import { getEnv } from "../core/runtime-adapter.ts";
import { getLogger } from "../utils/logger.ts";
import { loadRouteModule } from "./load-route-module.ts";

/** Special file types used for unhandled 5xx / render errors. */
export type ErrorSpecialType = "_500" | "_error";

export type ErrorSpecialResolve = {
  path: string;
  type: ErrorSpecialType;
};

/**
 * Prefer `_500`, then `_error`. Returns undefined when neither exists.
 */
export function resolveErrorSpecialFile(
  router: Pick<Router, "getSpecialFile">,
): ErrorSpecialResolve | undefined {
  const fiveHundred = router.getSpecialFile("_500");
  if (fiveHundred) return { path: fiveHundred, type: "_500" };
  const legacy = router.getSpecialFile("_error");
  if (legacy) return { path: legacy, type: "_error" };
  return undefined;
}

/** Build a synthetic match so callers can treat `_500` like a page file. */
export function buildErrorSpecialMatch(
  pathname: string,
  special: ErrorSpecialResolve,
  query: Record<string, string> = {},
): RouteMatch {
  const file = special.type === "_500" ? "_500.tsx" : "_error.tsx";
  return {
    route: {
      path: pathname || "/",
      file,
      fullPath: special.path,
      type: "static",
      isApi: false,
      isSpecial: true,
      specialType: special.type,
    },
    params: {},
    query: { ...query },
    fullPath: pathname || "/",
    isApi: false,
    meta: {},
  };
}

/** Force HTTP 500 while preserving body / headers from a renderer. */
export function asErrorResponse(response: Response): Response {
  if (response.status === 500) return response;
  return new Response(response.body, {
    status: 500,
    statusText: response.statusText || "Internal Server Error",
    headers: response.headers,
  });
}

/** Minimal renderSSR surface used by the catch path. */
export type ErrorRenderService = {
  renderSSR: (options: {
    engine: "react" | "preact" | "view";
    component: unknown;
    props?: Record<string, unknown>;
    debug?: boolean;
  }) => Promise<{ html: string }>;
};

export type RenderErrorSpecialOptions = {
  router: Pick<Router, "getSpecialFile">;
  container: ServiceContainer;
  renderService: ErrorRenderService;
  engine: "react" | "preact" | "view";
  routesDirPath: string;
  error: unknown;
  debug?: boolean;
  /** Extra response headers (e.g. Cache-Control in dev). */
  headers?: Record<string, string>;
};

/**
 * Try project `_500` then `_error` via renderSSR.
 * Returns a 500 Response, or null when no special page / load failed.
 */
export async function tryRenderErrorSpecialPage(
  opts: RenderErrorSpecialOptions,
): Promise<Response | null> {
  const resolved = resolveErrorSpecialFile(opts.router);
  if (!resolved) return null;
  try {
    const errorModule = await loadRouteModule(resolved.path, {
      logger: opts.container.has("logger")
        ? getLogger(opts.container)
        : undefined,
      engine: opts.engine,
      routesDirPath: opts.routesDirPath,
    });
    const ErrorComponent = errorModule?.default ?? errorModule?.Error;
    if (!ErrorComponent) return null;
    const isDev = getEnv("RUNTIME_ENV") === "dev";
    const result = await opts.renderService.renderSSR({
      engine: opts.engine,
      component: ErrorComponent,
      props: {
        error: isDev
          ? (opts.error instanceof Error
            ? opts.error.message
            : String(opts.error))
          : "An unexpected error occurred.",
        stack: isDev && opts.error instanceof Error
          ? opts.error.stack
          : undefined,
      },
      debug: opts.debug === true,
    });
    return new Response(result.html, {
      status: 500,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...(opts.headers ?? {}),
      },
    });
  } catch {
    return null;
  }
}
