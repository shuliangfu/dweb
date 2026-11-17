/**
 * Bundle plugin page modules whose fullPath is an http(s) URL.
 *
 * JSR packages resolve `import.meta.url` to `https://jsr.io/.../pages/*.tsx`.
 * Deno fetches that URL during the client build. Bun and Node resolve it onto
 * the host npm compatibility layer and read the local file instead. Relative
 * imports stay in this plugin; `jsr:` / `npm:` specifiers are rewritten to
 * package names for the runtime resolver.
 *
 * @module dweb/feature/plugin-page-url-plugin
 */

import type { BuildPlugin } from "@dreamer/esbuild";
import { fileURLToPath, pathToFileURL } from "node:url";
import { IS_DENO, readTextFile } from "../core/runtime-adapter.ts";
import {
  getRegisteredPluginPageFiles,
  isRemotePluginModuleSpecifier,
  normalizePluginPageFile,
} from "./plugin-page-routes.ts";
import {
  resolveRemotePluginPageToNpmFile,
  rewriteRemotePluginSource,
} from "./remote-plugin-module.ts";
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

function toPluginHref(path: string): string {
  if (isHttpUrl(path) || path.startsWith("file:")) return path;
  return pathToFileURL(path).href;
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
        if (!IS_DENO) {
          const local = resolveRemotePluginPageToNpmFile(args.path);
          if (local) {
            return { path: pathToFileURL(local).href, namespace: NAMESPACE };
          }
        }
        return { path: args.path, namespace: NAMESPACE };
      });

      build.onResolve({ filter: /.*/, namespace: NAMESPACE }, (args) => {
        if (args.path.startsWith("./") || args.path.startsWith("../")) {
          return {
            path: new URL(args.path, toPluginHref(args.importer)).href,
            namespace: NAMESPACE,
          };
        }
        if (isHttpUrl(args.path)) {
          if (!IS_DENO) {
            const local = resolveRemotePluginPageToNpmFile(args.path);
            if (local) {
              return { path: pathToFileURL(local).href, namespace: NAMESPACE };
            }
          }
          return { path: args.path, namespace: NAMESPACE };
        }
        // Bare / rewritten package names: leave unresolved so the runtime resolver runs.
        return undefined;
      });

      build.onLoad({ filter: /.*/, namespace: NAMESPACE }, async (args) => {
        let contents: string;
        let loadPath = args.path;
        if (args.path.startsWith("file:")) {
          loadPath = fileURLToPath(args.path);
          contents = await readTextFile(loadPath);
        } else if (IS_DENO && isHttpUrl(args.path)) {
          const response = await fetch(args.path);
          if (!response.ok) {
            return {
              errors: [{
                text:
                  `Failed to fetch plugin page module ${args.path} (${response.status})`,
              }],
            };
          }
          contents = await response.text();
        } else {
          const local = resolveRemotePluginPageToNpmFile(args.path);
          if (!local) {
            return {
              errors: [{
                text:
                  `Cannot resolve plugin page module ${args.path} via npm compatibility layer`,
              }],
            };
          }
          loadPath = local;
          contents = await readTextFile(local);
        }
        contents = rewriteRemotePluginSource(contents);
        if (
          stripSet.has(normalizePluginPageFile(args.path)) ||
          stripSet.has(normalizePluginPageFile(loadPath))
        ) {
          contents = stripLoadExport(contents);
        }
        return { contents, loader: loaderFor(loadPath) };
      });
    },
  };
}
