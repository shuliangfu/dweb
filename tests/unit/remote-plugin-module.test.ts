/**
 * Remote plugin module specifier mapping and npm-layer resolution
 * (Bun/Node cannot import https://jsr.io URLs natively).
 */

import "../setup.ts";
import { IS_BUN, IS_DENO, IS_NODE } from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import {
  mapRemotePluginSpecifier,
  parseRemotePluginNpmLocator,
  resolveRemotePluginPageToNpmFile,
  rewriteRemotePluginSource,
} from "../../src/feature/remote-plugin-module.ts";

const REMOTE_API_PATH =
  "https://jsr.io/@dreamer/plugins/1.2.5/src/rbac/routes/api-path.ts";

describe("remote-plugin-module", () => {
  describe("mapRemotePluginSpecifier()", () => {
    it("maps jsr scoped packages and subpaths, dropping the version", () => {
      expect(mapRemotePluginSpecifier("jsr:@dreamer/view@^3.1.0")).toBe(
        "@dreamer/view",
      );
      expect(
        mapRemotePluginSpecifier("jsr:@dreamer/utils@^1.1.0/string"),
      ).toBe("@dreamer/utils/string");
      expect(mapRemotePluginSpecifier("jsr:@dreamer/view/jsx-runtime")).toBe(
        "@dreamer/view/jsx-runtime",
      );
    });

    it("maps npm: specifiers and unscoped jsr packages", () => {
      expect(mapRemotePluginSpecifier("npm:preact@^11.2.0")).toBe("preact");
      expect(mapRemotePluginSpecifier("npm:@dreamer/view@1.0.0/jsx-runtime"))
        .toBe("@dreamer/view/jsx-runtime");
      expect(mapRemotePluginSpecifier("jsr:chalk@1.0.0")).toBe("chalk");
    });

    it("returns null for bare and http(s) specifiers", () => {
      expect(mapRemotePluginSpecifier("@dreamer/view")).toBeNull();
      expect(mapRemotePluginSpecifier("./api-path.ts")).toBeNull();
      expect(mapRemotePluginSpecifier(REMOTE_API_PATH)).toBeNull();
    });
  });

  describe("rewriteRemotePluginSource()", () => {
    it("rewrites jsx pragmas and jsr imports from a published plugin page", () => {
      const src =
        `/** @jsxRuntime automatic *//** @jsxImportSource jsr:@dreamer/view@^3.1.0 *//** @jsxImportSourceTypes jsr:@dreamer/view@^3.1.0 */import type { JSXRenderable } from "jsr:@dreamer/view@^3.1.0";
import { Badge } from "jsr:@dreamer/ui-view@^1.3.16";
import { resolveRbacApi } from "./api-path.ts";
`;
      const out = rewriteRemotePluginSource(src);
      expect(out).toContain("@jsxImportSource @dreamer/view");
      expect(out).toContain("@jsxImportSourceTypes @dreamer/view");
      expect(out).not.toContain("jsr:@dreamer/view");
      expect(out).not.toContain("jsr:@dreamer/ui-view");
      expect(out).toContain('from "@dreamer/view"');
      expect(out).toContain('from "@dreamer/ui-view"');
      expect(out).toContain('from "./api-path.ts"');
    });
  });

  describe("parseRemotePluginNpmLocator()", () => {
    it("parses jsr.io URLs and exact-version jsr: specifiers", () => {
      const fromHttps = parseRemotePluginNpmLocator(REMOTE_API_PATH);
      expect(fromHttps?.packages).toEqual([
        "@dreamer/plugins",
        "@jsr/dreamer__plugins",
      ]);
      expect(fromHttps?.subpath).toBe("src/rbac/routes/api-path.ts");
      expect(
        parseRemotePluginNpmLocator(
          "jsr:@dreamer/plugins@1.2.5/src/rbac/routes/api-path.ts",
        ),
      ).toEqual(fromHttps);
    });

    it("returns null for bare paths and version-only packages", () => {
      expect(parseRemotePluginNpmLocator("@dreamer/plugins")).toBeNull();
      expect(parseRemotePluginNpmLocator("jsr:@dreamer/view@^3.1.0"))
        .toBeNull();
    });
  });

  describe("resolveRemotePluginPageToNpmFile()", () => {
    it("Bun and Node resolve jsr.io pages to the host npm package file", () => {
      if (IS_DENO) return;
      expect(IS_BUN || IS_NODE).toBe(true);
      const local = resolveRemotePluginPageToNpmFile(REMOTE_API_PATH);
      expect(local).not.toBeNull();
      const n = (local ?? "").replace(/\\/g, "/");
      expect(
        n.includes("node_modules/@dreamer/plugins/") ||
          n.includes("node_modules/@jsr/dreamer__plugins/"),
      ).toBe(true);
      expect(n.endsWith("src/rbac/routes/api-path.ts")).toBe(true);
    });

    it("Deno does not use the npm-layer file path for remote import", () => {
      if (!IS_DENO) return;
      expect(resolveRemotePluginPageToNpmFile(REMOTE_API_PATH)).toBeNull();
    });
  });
});
