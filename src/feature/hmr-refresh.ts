/**
 * Resolve which module HMR should load for the current page.
 *
 * The current route's chunk is imported and the page re-renders.
 * A chunkUrl for another route page (for example editing /about while
 * viewing /index) must not be rendered into the current URL; it is
 * preloaded into the route module cache so the next navigation shows
 * the latest page without a full refresh.
 * Shared updates have no chunkUrl and refresh the current route instead.
 */

export type HmrPageModuleResolution =
  | { action: "skip" }
  | { action: "import"; url: string }
  | { action: "preload"; url: string; component: string }
  | { action: "loader" };

export function normalizeHmrChunkUrl(url: string): string {
  const noQuery = url.split("?")[0].split("#")[0];
  return noQuery.startsWith("/") ? noQuery : "/" + noQuery;
}

function findComponentByChunkUrl(
  chunkNorm: string,
  routeChunkUrls: Record<string, string> | undefined,
): { component: string; url: string } | undefined {
  if (!routeChunkUrls) return undefined;
  for (const [component, url] of Object.entries(routeChunkUrls)) {
    if (
      typeof url === "string" &&
      url.length > 0 &&
      normalizeHmrChunkUrl(url) === chunkNorm
    ) {
      return { component, url };
    }
  }
  return undefined;
}

export function resolveHmrPageModule(
  chunkUrl: string | undefined,
  routeChunkUrls: Record<string, string> | undefined,
  currentComponent: string,
): HmrPageModuleResolution {
  const currentUrl = routeChunkUrls && currentComponent
    ? routeChunkUrls[currentComponent]
    : undefined;
  const currentNorm = typeof currentUrl === "string" && currentUrl.length > 0
    ? normalizeHmrChunkUrl(currentUrl)
    : "";
  const changedNorm = typeof chunkUrl === "string" && chunkUrl.length > 0
    ? normalizeHmrChunkUrl(chunkUrl)
    : "";

  if (changedNorm) {
    if (
      currentNorm && changedNorm === currentNorm &&
      typeof currentUrl === "string"
    ) {
      return { action: "import", url: currentUrl };
    }
    const match = findComponentByChunkUrl(changedNorm, routeChunkUrls);
    if (match) {
      return { action: "preload", url: match.url, component: match.component };
    }
    return { action: "skip" };
  }
  if (currentNorm && typeof currentUrl === "string") {
    return { action: "import", url: currentUrl };
  }
  return { action: "loader" };
}

/**
 * Browser-side copy inlined into generated client.dep.tsx.
 * Keep this source free of template placeholders.
 */
export const RESOLVE_HMR_PAGE_MODULE_SOURCE = [
  "type HmrPageModuleResolution =",
  '  | { action: "skip" }',
  '  | { action: "import"; url: string }',
  '  | { action: "preload"; url: string; component: string }',
  '  | { action: "loader" };',
  "function normalizeHmrChunkUrl(url: string): string {",
  '  const noQuery = url.split("?")[0].split("#")[0];',
  '  return noQuery.startsWith("/") ? noQuery : "/" + noQuery;',
  "}",
  "function findComponentByChunkUrl(",
  "  chunkNorm: string,",
  "  routeChunkUrls: Record<string, string> | undefined,",
  "): { component: string; url: string } | undefined {",
  "  if (!routeChunkUrls) return undefined;",
  "  for (const component of Object.keys(routeChunkUrls)) {",
  "    const url = routeChunkUrls[component];",
  '    if (typeof url === "string" && url.length > 0 && normalizeHmrChunkUrl(url) === chunkNorm) {',
  "      return { component: component, url: url };",
  "    }",
  "  }",
  "  return undefined;",
  "}",
  "function resolveHmrPageModule(",
  "  chunkUrl: string | undefined,",
  "  routeChunkUrls: Record<string, string> | undefined,",
  "  currentComponent: string,",
  "): HmrPageModuleResolution {",
  "  const currentUrl =",
  "    routeChunkUrls && currentComponent",
  "      ? routeChunkUrls[currentComponent]",
  "      : undefined;",
  '  const currentNorm = typeof currentUrl === "string" && currentUrl.length > 0',
  "    ? normalizeHmrChunkUrl(currentUrl)",
  '    : "";',
  '  const changedNorm = typeof chunkUrl === "string" && chunkUrl.length > 0',
  "    ? normalizeHmrChunkUrl(chunkUrl)",
  '    : "";',
  "  if (changedNorm) {",
  '    if (currentNorm && changedNorm === currentNorm && typeof currentUrl === "string") {',
  '      return { action: "import", url: currentUrl };',
  "    }",
  "    const match = findComponentByChunkUrl(changedNorm, routeChunkUrls);",
  "    if (match) {",
  '      return { action: "preload", url: match.url, component: match.component };',
  "    }",
  '    return { action: "skip" };',
  "  }",
  '  if (currentNorm && typeof currentUrl === "string") {',
  '    return { action: "import", url: currentUrl };',
  "  }",
  '  return { action: "loader" };',
  "}",
].join("\n");
