/**
 * Bundle plugin page modules whose fullPath is an http(s) URL.
 *
 * JSR packages resolve `import.meta.url` to `https://jsr.io/.../pages/*.tsx`.
 * Deno can `import()` that URL, but it is not a package export (`jsr:` deep
 * imports fail) and is not a filesystem path. This plugin fetches those
 * modules (and their same-origin relative imports) during the client build
 * so esbuild can pack them; bare / jsr: / npm: imports stay on the default
 * Deno resolver.
 *
 * @module dweb/feature/plugin-page-url-plugin
 */

import type { BuildPlugin } from "@dreamer/esbuild";
import {
  getRegisteredPluginPageFiles,
  isRemotePluginModuleSpecifier,
  normalizePluginPageFile,
} from "./plugin-page-routes.ts";
import { stripLoadExport } from "./strip-load-plugin.ts";

const NAMESPACE = "dweb-plugin-page-url";

function isHttpUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function loaderFor(url: string): "tsx" | "ts" | "jsx" | "js" {
  const path = (url.split("?")[0] ?? url).toLowerCase();
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".jsx")) return "jsx";
  if (path.endsWith(".ts") || path.endsWith(".mts")) return "ts";
  return "js";
}

/**
 * esbuild plugin that inlines http(s) plugin page modules for the browser bundle.
 */
export function createPluginPageUrlPlugin(
  extraFiles: string[] = getRegisteredPluginPageFiles(),
): BuildPlugin {
  const stripSet = new Set(
    extraFiles
      .filter((item) => isRemotePluginModuleSpecifier(item) || isHttpUrl(item))
      .map((item) => normalizePluginPageFile(item)),
  );
  return {
    name: "dweb-plugin-page-url",
    setup(build) {
      build.onResolve({ filter: /^https?:\/\// }, (args) => {
        if (/\.css$/i.test(args.path)) return undefined;
        if (!stripSet.has(normalizePluginPageFile(args.path))) {
          return undefined;
        }
        return { path: args.path, namespace: NAMESPACE };
      });

      build.onResolve({ filter: /.*/, namespace: NAMESPACE }, (args) => {
        if (args.path.startsWith("./") || args.path.startsWith("../")) {
          return {
            path: new URL(args.path, args.importer).href,
            namespace: NAMESPACE,
          };
        }
        if (isHttpUrl(args.path)) {
          return { path: args.path, namespace: NAMESPACE };
        }
        // Bare / jsr: / npm: imports: leave unresolved so the Deno resolver runs.
        return undefined;
      });

      build.onLoad({ filter: /.*/, namespace: NAMESPACE }, async (args) => {
        const response = await fetch(args.path);
        if (!response.ok) {
          return {
            errors: [{
              text:
                `Failed to fetch plugin page module ${args.path} (${response.status})`,
            }],
          };
        }
        let contents = await response.text();
        if (stripSet.has(normalizePluginPageFile(args.path))) {
          contents = stripLoadExport(contents);
        }
        return { contents, loader: loaderFor(args.path) };
      });
    },
  };
}
