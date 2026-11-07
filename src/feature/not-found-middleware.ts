/**
 * Unmatched page routes → project `_404` special file (SSR / Hybrid / CSR shell).
 *
 * Registered after `useRouter` so `handleRouter` has already run. When no
 * `ctx.response` was set, builds a synthetic RouteMatch for `getSpecialFile("_404")`
 * and invokes the same renderer used for normal pages. Skips `/api`, `/_`, and
 * `/assets` so API / framework assets keep the server plain-404 fallback.
 *
 * Sets the response **before** `next()` so later middlewares (e.g. plugin
 * onResponse CSS injection) still see the HTML body.
 */
import type { RouteMatch, Router } from "@dreamer/router";
import type { HttpContext } from "@dreamer/server";

/** Same signature as `@dreamer/server` SSRRenderCallback */
export type NotFoundRender = (
  ctx: HttpContext,
  match: RouteMatch,
) => Promise<Response | null>;

function shouldSkipNotFoundPage(pathname: string): boolean {
  const p = pathname || "/";
  if (p.startsWith("/api/") || p === "/api") return true;
  if (p.startsWith("/_/")) return true;
  if (p.startsWith("/assets/")) return true;
  // Client bundles / HMR / data endpoints
  if (p === "/_client.js" || p.startsWith("/_client")) return true;
  if (p === "/__data" || p.startsWith("/__data")) return true;
  if (p.startsWith("/__hmr")) return true;
  return false;
}

/** Build a synthetic match so existing renderers load `_404.tsx` as the page. */
export function buildNotFoundMatch(
  ctx: HttpContext,
  notFoundFullPath: string,
): RouteMatch {
  const path = ctx.path || "/";
  return {
    route: {
      path,
      file: "_404.tsx",
      fullPath: notFoundFullPath,
      type: "static",
      isApi: false,
      isSpecial: true,
      specialType: "_404",
    },
    params: {},
    query: { ...(ctx.query ?? {}) },
    fullPath: path,
    isApi: false,
    meta: {},
  };
}

/** Force HTTP 404 while preserving body / headers from the renderer. */
export function asNotFoundResponse(response: Response): Response {
  if (response.status === 404) return response;
  return new Response(response.body, {
    status: 404,
    statusText: response.statusText || "Not Found",
    headers: response.headers,
  });
}

/**
 * Create middleware: unmatched HTML navigations render project `_404`.
 *
 * @param router Initialized router (for `getSpecialFile`)
 * @param render Same renderer passed to `setSSRRender`
 */
export function createNotFoundMiddleware(
  router: Router,
  render: NotFoundRender,
): (ctx: HttpContext, next: () => Promise<void>) => Promise<void> {
  return async (ctx, next) => {
    if (
      !ctx.response &&
      !shouldSkipNotFoundPage(ctx.path || "/")
    ) {
      const notFoundPath = router.getSpecialFile("_404");
      if (notFoundPath) {
        try {
          const match = buildNotFoundMatch(ctx, notFoundPath);
          const response = await render(ctx, match);
          if (response) {
            ctx.response = asNotFoundResponse(response);
          }
        } catch {
          // Leave unset → `@dreamer/server` plain notFound fallback
        }
      }
    }
    await next();
  };
}
