/**
 * Import-map helpers with no runtime-adapter dependency.
 * Used by the Deno CLI trampoline so the first process can reexec
 * without loading `@dreamer/runtime-adapter`.
 *
 * @module
 */

function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, "/");
}

/** Convert a filesystem path to a file URL. */
export function pathToFileUrl(absPath: string): string {
  const n = normalizeSlashes(absPath);
  if (/^[A-Za-z]:\//.test(n)) return `file:///${n}`;
  return `file://${n.startsWith("/") ? n : `/${n}`}`;
}

/** Convert a file URL to a path. POSIX file URLs have no drive letter and
 *  `fromFileUrl` throws on Windows for those, so fall back to the pathname. */
export function pathFromFileUrl(target: string): string {
  const u = new URL(target);
  let p = decodeURIComponent(u.pathname);
  if (p.length >= 3 && /^\/[A-Za-z]:\//.test(p)) p = p.slice(1);
  return p;
}

export function isRemoteSpecifier(spec: string): boolean {
  return (
    spec.startsWith("npm:") ||
    spec.startsWith("jsr:") ||
    spec.startsWith("http://") ||
    spec.startsWith("https://")
  );
}

export function isAbsolutePath(spec: string): boolean {
  return spec.startsWith("/") || /^[A-Za-z]:[\\/]/.test(spec);
}

/** Resolve a relative or absolute filesystem path against `fromDir`. */
export function resolveFilePath(fromDir: string, rel: string): string {
  if (rel.startsWith("file:")) return normalizeSlashes(pathFromFileUrl(rel));
  if (isAbsolutePath(rel)) return normalizeSlashes(rel);
  const base = normalizeSlashes(fromDir);
  const baseUrl = pathToFileUrl(base.endsWith("/") ? base : `${base}/`);
  let out = normalizeSlashes(pathFromFileUrl(new URL(rel, baseUrl).href));
  // Match runtime-adapter resolve(): drop a trailing slash except at a root.
  if (out.length > 1 && out.endsWith("/") && !/^[A-Za-z]:\/$/.test(out)) {
    out = out.slice(0, -1);
  }
  return out;
}

export function resolveImportMapSpecifier(
  spec: string,
  fromDir: string,
): string {
  if (
    isRemoteSpecifier(spec) ||
    spec.startsWith("file:")
  ) {
    return spec;
  }
  if (spec.startsWith(".") || spec.startsWith("/") || isAbsolutePath(spec)) {
    const abs = resolveFilePath(fromDir, spec);
    const url = pathToFileUrl(abs);
    return spec.endsWith("/") && !url.endsWith("/") ? `${url}/` : url;
  }
  return spec;
}

/**
 * 合并 import map：先放框架依赖，再覆盖项目别名（如 `@common/`）。
 * 配置写在临时目录，相对路径都改成 file://，以免离开项目根后解析失败。
 */
export function mergeProjectImports(
  projectImports: Record<string, string> | undefined,
  projectDir: string | undefined,
  cliImports: Record<string, string> | undefined,
  cliDir: string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (cliImports) {
    for (const [key, val] of Object.entries(cliImports)) {
      out[key] = cliDir ? resolveImportMapSpecifier(val, cliDir) : val;
    }
  }
  if (projectImports) {
    for (const [key, val] of Object.entries(projectImports)) {
      out[key] = projectDir ? resolveImportMapSpecifier(val, projectDir) : val;
    }
  }
  return out;
}

export function buildRuntimeDenoConfig(
  project: Record<string, unknown>,
  imports: Record<string, string>,
): Record<string, unknown> {
  const { workspace: _workspace, ...rest } = project;
  return {
    ...rest,
    imports,
    // 合并后可能多出框架侧未锁定的包，关闭 lock 避免无故失败。
    lock: false,
  };
}

/**
 * Collect filesystem path aliases from an import map (deno.json or package.json).
 * Remote specs (`jsr:` / `npm:` / http) are skipped. `@common/*` → `@common/` prefix.
 * Values are absolute directory or file paths, not file URLs.
 */
export function pathAliasesFromImports(
  imports: Record<string, string> | undefined,
  fromDir: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!imports) return out;
  for (const [key, val] of Object.entries(imports)) {
    if (typeof val !== "string") continue;
    if (isRemoteSpecifier(val)) continue;
    let prefix = key;
    let target = val;
    if (prefix.endsWith("/*")) {
      prefix = `${prefix.slice(0, -1)}`;
      if (target.endsWith("/*")) target = target.slice(0, -1);
    }
    let abs: string;
    if (target.startsWith("file:")) {
      abs = pathFromFileUrl(target);
    } else if (
      target.startsWith(".") || target.startsWith("/") || isAbsolutePath(target)
    ) {
      abs = resolveFilePath(fromDir, target);
    } else {
      continue;
    }
    out[prefix] = abs;
  }
  return out;
}

/** Resolve a specifier against path aliases. Longer keys win. */
export function resolvePathAlias(
  specifier: string,
  aliases: Record<string, string>,
): string | undefined {
  const keys = Object.keys(aliases).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const target = aliases[key];
    if (key.endsWith("/")) {
      if (specifier.startsWith(key)) {
        return resolveFilePath(target, specifier.slice(key.length));
      }
    } else if (specifier === key) {
      return target;
    }
  }
  return undefined;
}

const PROBE = "__dweb_reexec_probe";

/** Build a resolve probe and the expected target for one import-map entry. */
export function importMapProbe(
  key: string,
  value: string,
  projectDir: string,
): { probe: string; expected: string } {
  if (key.endsWith("/*")) {
    const prefix = key.slice(0, -1);
    const target = value.endsWith("/*") ? value.slice(0, -1) : value;
    return {
      probe: `${prefix}${PROBE}`,
      expected: resolveImportMapSpecifier(`${target}${PROBE}`, projectDir),
    };
  }
  if (key.endsWith("/")) {
    const target = value.endsWith("/") ? value : `${value}/`;
    return {
      probe: `${key}${PROBE}`,
      expected: resolveImportMapSpecifier(`${target}${PROBE}`, projectDir),
    };
  }
  return {
    probe: key,
    expected: resolveImportMapSpecifier(value, projectDir),
  };
}

function normalizeResolveResult(value: string): string {
  if (value.startsWith("file:")) {
    let p = normalizeSlashes(pathFromFileUrl(value));
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  }
  if (value.startsWith("/") || isAbsolutePath(value)) {
    let p = normalizeSlashes(value);
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  }
  return value;
}

export function sameResolvedTarget(actual: string, expected: string): boolean {
  return normalizeResolveResult(actual) === normalizeResolveResult(expected);
}

/**
 * True when the current process already resolves every project import to the
 * same target the merged config would use. Remote (`jsr:` / `npm:` / http)
 * entries only need to resolve at all (version ranges may not string-match).
 * Filesystem aliases must point at the same path.
 *
 * Empty import maps return false so a project-only compilerOptions config
 * still triggers reexec.
 */
export function projectImportMapAlreadyActive(
  projectImports: Record<string, string> | undefined,
  projectDir: string,
  resolveSpec: (specifier: string) => string,
): boolean {
  if (!projectImports) return false;
  const entries = Object.entries(projectImports);
  if (entries.length === 0) return false;
  for (const [key, val] of entries) {
    if (typeof val !== "string") return false;
    const { probe, expected } = importMapProbe(key, val, projectDir);
    let actual: string;
    try {
      actual = resolveSpec(probe);
    } catch {
      return false;
    }
    if (isRemoteSpecifier(val) || isRemoteSpecifier(expected)) continue;
    if (!sameResolvedTarget(actual, expected)) return false;
  }
  return true;
}

export function importsFromConfig(
  config: Record<string, unknown> | undefined,
): Record<string, string> | undefined {
  const imports = config?.imports;
  if (!imports || typeof imports !== "object" || Array.isArray(imports)) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(imports as Record<string, unknown>)) {
    if (typeof val === "string") out[key] = val;
  }
  return out;
}
