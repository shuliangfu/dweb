/**
 * HMR current-route chunk resolution
 */

import { describe, expect, it } from "@dreamer/test";
import { generateClientDepContent } from "../../src/feature/csr-client-dep.ts";
import {
  RESOLVE_HMR_PAGE_MODULE_SOURCE,
  resolveHmrPageModule,
} from "../../src/feature/hmr-refresh.ts";

const routeChunkUrls = {
  about: "/about-aaaaaa.js",
  index: "/index-bbbbbb.js",
  "about/index": "/about-index-cccccc.js",
};

describe("resolveHmrPageModule", () => {
  it("preloads a different route page chunk while viewing /about", () => {
    expect(
      resolveHmrPageModule("/index-bbbbbb.js", routeChunkUrls, "about"),
    ).toEqual({
      action: "preload",
      url: "/index-bbbbbb.js",
      component: "index",
    });
  });

  it("does not confuse about/index with the root index chunk", () => {
    expect(
      resolveHmrPageModule("/index-bbbbbb.js", routeChunkUrls, "about/index"),
    ).toEqual({
      action: "preload",
      url: "/index-bbbbbb.js",
      component: "index",
    });
  });

  it("skips an unknown chunk that is not in the route map", () => {
    expect(
      resolveHmrPageModule("/missing-dddddd.js", routeChunkUrls, "about"),
    ).toEqual({ action: "skip" });
  });

  it("imports the current route chunk when chunkUrl matches it", () => {
    expect(
      resolveHmrPageModule("/about-aaaaaa.js", routeChunkUrls, "about"),
    ).toEqual({ action: "import", url: "/about-aaaaaa.js" });
  });

  it("treats leading slash and query as the same chunk url", () => {
    expect(
      resolveHmrPageModule("about-aaaaaa.js?t=1", routeChunkUrls, "about"),
    ).toEqual({ action: "import", url: "/about-aaaaaa.js" });
  });

  it("refreshes the current route when a shared update has no chunkUrl", () => {
    expect(
      resolveHmrPageModule(undefined, routeChunkUrls, "about"),
    ).toEqual({ action: "import", url: "/about-aaaaaa.js" });
  });

  it("falls back to the route loader when no chunk map is available", () => {
    expect(resolveHmrPageModule(undefined, undefined, "about")).toEqual({
      action: "loader",
    });
  });
});

describe("generated client.dep HMR helper", () => {
  it("inlines the same resolver used by unit tests", () => {
    const src = generateClientDepContent(
      "view",
      [{
        componentPath: "about",
        fullPath: "/tmp/routes/about.tsx",
        importName: "About",
      }],
      "/tmp/routes",
      false,
      [],
      "hybrid",
    );
    expect(src).toContain("function resolveHmrPageModule(");
    expect(src).toContain('action === "skip"');
    expect(src).toContain('action === "preload"');
    expect(src).toContain(RESOLVE_HMR_PAGE_MODULE_SOURCE);
    expect(src).toContain(
      "function normalizeHmrChunkUrl(url: string): string {",
    );
    expect(src).toContain("chunkUrl: string | undefined");
    expect(src).toContain("currentComponent: string");
    expect(src).toContain(
      '  | { action: "preload"; url: string; component: string }',
    );
  });
});
