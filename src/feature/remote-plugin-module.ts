/**
 * Load JSR-hosted plugin page modules on Deno, Bun, and Node.
 *
 * Deno can `import()` `https://jsr.io/...` and exact-version `jsr:` URLs.
 * Bun and Node share one npm compatibility path: resolve the specifier onto
 * the host `node_modules` (`@scope/name` / `@jsr/scope__name` from
 * package.json `npm:@jsr/...` maps) and `import()` the local file URL.
 *
 * @module dweb/feature/remote-plugin-module
 */

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import {
  cwd,
  dirname,
  existsSync,
  IS_DENO,
  join,
} from "../core/runtime-adapter.ts";

/** `jsr:@scope/name@version/sub` → `@scope/name/sub`; `npm:pkg@version` → `pkg`. */
export function mapRemotePluginSpecifier(specifier: string): string | null {
  const raw = specifier.trim();
  const jsr = /^jsr:(?:@([^/]+)\/)?([^@/]+)(?:@[^/]+)?(\/.*)?$/.exec(raw);
  if (jsr) {
    const pkg = jsr[1] ? `@${jsr[1]}/${jsr[2]}` : jsr[2]!;
    return `${pkg}${jsr[3] ?? ""}`;
  }
  const npm = /^npm:((?:@[^/]+\/)?[^@/]+)(?:@[^/]+)?(\/.*)?$/.exec(raw);
  if (npm) return `${npm[1]}${npm[2] ?? ""}`;
  return null;
}

/**
 * Rewrite JSX pragmas and import specifiers so the npm compatibility layer
 * can resolve packages published with `jsr:` / `npm:` protocol URLs.
 */
export function rewriteRemotePluginSource(code: string): string {
  return code
    .replace(
      /(@jsxImportSource(?:Types)?)\s+((?:jsr|npm):[^\s*]+)/g,
      (_match, pragma: string, spec: string) =>
        `${pragma} ${mapRemotePluginSpecifier(spec) ?? spec}`,
    )
    .replace(
      /((?:from|import)\s*\(?\s*)(["'])((?:jsr|npm):[^"']+)\2/g,
      (_match, prefix: string, quote: string, spec: string) =>
        `${prefix}${quote}${mapRemotePluginSpecifier(spec) ?? spec}${quote}`,
    );
}

export interface RemotePluginNpmLocator {
  /** Candidate package names, e.g. `@dreamer/plugins`, `@jsr/dreamer__plugins`. */
  packages: string[];
  /** Path inside the package, e.g. `src/rbac/routes/api-path.ts`. */
  subpath: string;
}

/** Parse a `https://jsr.io/...` or `jsr:` plugin page into npm package + subpath. */
export function parseRemotePluginNpmLocator(
  specifier: string,
): RemotePluginNpmLocator | null {
  const raw = specifier.trim();
  const https = /^https?:\/\/jsr\.io\/(?:@([^/]+)\/)?([^/]+)\/[^/]+\/(.+)$/i
    .exec(raw);
  if (https) {
    return locatorFromParts(https[1], https[2]!, https[3]!);
  }
  const jsr = /^jsr:(?:@([^/]+)\/)?([^@/]+)(?:@[^/]+)?(\/.*)$/.exec(raw);
  if (jsr) {
    return locatorFromParts(jsr[1], jsr[2]!, jsr[3]!.replace(/^\//, ""));
  }
  return null;
}

function locatorFromParts(
  scope: string | undefined,
  name: string,
  subpath: string,
): RemotePluginNpmLocator | null {
  if (!name || !subpath) return null;
  const packages = scope
    ? [`@${scope}/${name}`, `@jsr/${scope}__${name}`]
    : [name, `@jsr/${name}`];
  return { packages, subpath };
}

function packageRootFromFile(file: string): string | null {
  let dir = dirname(file);
  while (true) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Shared Bun/Node resolution: `createRequire` from the host cwd, then join
 * the page subpath under the installed package root.
 * `package.json` is often blocked by exports, so resolve the package name
 * and walk up to the root.
 */
function resolveNpmCompatFile(
  locator: RemotePluginNpmLocator,
): string | null {
  const require = createRequire(join(cwd(), "package.json"));
  for (const name of locator.packages) {
    try {
      const root = packageRootFromFile(require.resolve(name));
      if (!root) continue;
      const file = join(root, locator.subpath);
      if (existsSync(file)) return file;
    } catch {
      // try the next candidate package name
    }
  }
  return null;
}

/**
 * Resolve a remote plugin page specifier to a file under the host
 * `node_modules` npm compatibility layer. Deno does not use this path.
 */
export function resolveRemotePluginPageToNpmFile(
  specifier: string,
): string | null {
  if (IS_DENO) return null;
  const locator = parseRemotePluginNpmLocator(specifier);
  if (!locator) return null;
  return resolveNpmCompatFile(locator);
}

/**
 * Import a registered remote plugin page.
 * Deno: native `import()` of the https / jsr URL.
 * Bun and Node: shared npm-layer file URL, never `import(https://...)`.
 */
export async function importRemotePluginModule(
  specifier: string,
): Promise<Record<string, unknown>> {
  const raw = specifier.trim();
  if (IS_DENO) {
    return await import(raw) as Record<string, unknown>;
  }
  const local = resolveRemotePluginPageToNpmFile(raw);
  if (!local) {
    throw new Error(
      `Cannot resolve plugin page module via npm compatibility layer: ${specifier}`,
    );
  }
  return await import(pathToFileURL(local).href) as Record<string, unknown>;
}
