/**
 * 让 `dweb-cli run` 使用**当前项目**的 deno.json import map。
 *
 * 【Why】全局 / 本地安装的入口是 `dweb/src/cli.ts`（或 jsr:@dreamer/dweb/cli）。
 * Deno 会按入口文件解析 import map，用的是框架自己的 deno.json，
 * 不会读到项目里的 `@common/` 等别名。动态 import 控制台路由时就会报
 * “not a dependency and not in import map”。
 *
 * Deno：把项目 deno.json 与框架 deno.json 的 imports 合并（项目优先），
 * 再以 `--config` 重跑一次 CLI；交互输入（confirm）走 inherit stdin。
 * Bun / Node：读取 package.json（及 deno.json）里的路径别名，注册运行时解析。
 *
 * @module
 */

import {
  args,
  createCommand,
  cwd,
  execPath,
  exists,
  exit,
  fromFileUrl,
  getEnv,
  getEnvAll,
  IS_BUN,
  IS_NODE,
  isAbsolute,
  join,
  makeTempFile,
  readTextFile,
  remove,
  resolve,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { getPackageRoot, loadDwebDenoJson } from "./version.ts";

/** 子进程已带上项目 import map，避免再次重跑。 */
export const PROJECT_CONFIG_ENV = "DWEB_CLI_WITH_PROJECT_CONFIG";

export function resolveImportMapSpecifier(
  spec: string,
  fromDir: string,
): string {
  if (
    spec.startsWith("npm:") ||
    spec.startsWith("jsr:") ||
    spec.startsWith("http://") ||
    spec.startsWith("https://") ||
    spec.startsWith("file:")
  ) {
    return spec;
  }
  if (spec.startsWith(".") || spec.startsWith("/")) {
    const abs = resolve(fromDir, spec).replace(/\\/g, "/");
    const url = abs.startsWith("/") ? `file://${abs}` : `file:///${abs}`;
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
    if (
      val.startsWith("jsr:") ||
      val.startsWith("npm:") ||
      val.startsWith("http://") ||
      val.startsWith("https://")
    ) {
      continue;
    }
    let prefix = key;
    let target = val;
    if (prefix.endsWith("/*")) {
      prefix = `${prefix.slice(0, -1)}`;
      if (target.endsWith("/*")) target = target.slice(0, -1);
    }
    let abs: string;
    if (target.startsWith("file:")) {
      abs = fromFileUrl(target);
    } else if (
      target.startsWith(".") || target.startsWith("/") || isAbsolute(target)
    ) {
      abs = resolve(fromDir, target);
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
        return resolve(target, specifier.slice(key.length));
      }
    } else if (specifier === key) {
      return target;
    }
  }
  return undefined;
}

async function readJsonObject(
  path: string,
): Promise<Record<string, unknown> | undefined> {
  try {
    const parsed = JSON.parse(await readTextFile(path)) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore missing or invalid JSON
  }
  return undefined;
}

function importsFromConfig(
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

/**
 * Path aliases for Bun / Node: package.json `imports` overlay deno.json `imports`.
 * Package.json wins when both define the same key.
 */
export async function loadProjectPathAliases(
  projectRoot: string,
): Promise<Record<string, string>> {
  const aliases: Record<string, string> = {};
  const denoPath = (await exists(join(projectRoot, "deno.json")))
    ? join(projectRoot, "deno.json")
    : (await exists(join(projectRoot, "deno.jsonc")))
    ? join(projectRoot, "deno.jsonc")
    : null;
  if (denoPath) {
    Object.assign(
      aliases,
      pathAliasesFromImports(
        importsFromConfig(await readJsonObject(denoPath)),
        projectRoot,
      ),
    );
  }
  const pkgPath = join(projectRoot, "package.json");
  if (await exists(pkgPath)) {
    Object.assign(
      aliases,
      pathAliasesFromImports(
        importsFromConfig(await readJsonObject(pkgPath)),
        projectRoot,
      ),
    );
  }
  return aliases;
}

type BunPluginBuild = {
  onResolve: (
    opts: { filter: RegExp },
    cb: (args: { path: string }) => { path: string } | null,
  ) => void;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Register Bun and Node resolvers so `@common/…` aliases work at runtime.
 * Node + tsx resolves through `Module._resolveFilename`, so that hook is required.
 */
export async function installRuntimeAliasResolver(
  aliases: Record<string, string>,
): Promise<void> {
  const keys = Object.keys(aliases);
  if (keys.length === 0) return;

  if (IS_BUN) {
    const bun = (globalThis as {
      Bun?: {
        plugin?: (plugin: {
          name: string;
          setup: (build: BunPluginBuild) => void;
        }) => void;
      };
    }).Bun;
    bun?.plugin?.({
      name: "dweb-project-aliases",
      setup(build) {
        const filter = new RegExp(`^(${keys.map(escapeRegExp).join("|")})`);
        build.onResolve({ filter }, (args) => {
          const dest = resolvePathAlias(args.path, aliases);
          return dest ? { path: dest } : null;
        });
      },
    });
    return;
  }

  if (!IS_NODE) return;

  const moduleNs = await import("node:module");
  const registerHooks = (
    moduleNs as {
      registerHooks?: (hooks: {
        resolve: (
          specifier: string,
          context: unknown,
          nextResolve: (specifier: string, context: unknown) => unknown,
        ) => unknown;
      }) => void;
    }
  ).registerHooks;
  if (typeof registerHooks === "function") {
    const { pathToFileURL } = await import("node:url");
    registerHooks({
      resolve(specifier, context, nextResolve) {
        const dest = resolvePathAlias(specifier, aliases);
        if (dest) {
          return { shortCircuit: true, url: pathToFileURL(dest).href };
        }
        return nextResolve(specifier, context);
      },
    });
  }

  const require = moduleNs.createRequire(import.meta.url);
  const Module = require("module") as {
    _resolveFilename: (
      request: string,
      parent: unknown,
      isMain: boolean,
      options: unknown,
    ) => string;
  };
  const original = Module._resolveFilename;
  Module._resolveFilename = function (
    request: string,
    parent: unknown,
    isMain: boolean,
    options: unknown,
  ): string {
    const dest = typeof request === "string"
      ? resolvePathAlias(request, aliases)
      : undefined;
    if (dest) return dest;
    return original.call(this, request, parent, isMain, options);
  };
}

function denoMainModule(): string | undefined {
  const deno = (globalThis as { Deno?: { mainModule?: string } }).Deno;
  return typeof deno?.mainModule === "string" ? deno.mainModule : undefined;
}

/**
 * 若当前进程还没用上项目 import map，则合并配置并以子进程重跑 CLI。
 * 重跑成功或失败都会 exit，不回到调用方。
 */
export async function reexecWithProjectImportMap(
  projectRoot: string,
): Promise<void> {
  if (getEnv(PROJECT_CONFIG_ENV) === "1") return;

  if (IS_BUN || IS_NODE) {
    const aliases = await loadProjectPathAliases(projectRoot);
    if (Object.keys(aliases).length > 0) {
      await installRuntimeAliasResolver(aliases);
    }
    return;
  }

  const configPath = (await exists(join(projectRoot, "deno.json")))
    ? join(projectRoot, "deno.json")
    : (await exists(join(projectRoot, "deno.jsonc")))
    ? join(projectRoot, "deno.jsonc")
    : null;
  if (!configPath) return;

  const main = denoMainModule();
  if (!main) return;

  let project: Record<string, unknown> = {};
  try {
    project = JSON.parse(await readTextFile(configPath)) as Record<
      string,
      unknown
    >;
  } catch {
    return;
  }

  let cliImports: Record<string, string> | undefined;
  let cliDir: string | undefined;
  try {
    const root = getPackageRoot();
    const cliConfig = join(root, "deno.json");
    if (await exists(cliConfig)) {
      const parsed = JSON.parse(await readTextFile(cliConfig)) as {
        imports?: Record<string, string>;
      };
      cliImports = parsed.imports;
      cliDir = root;
    } else {
      const remote = await loadDwebDenoJson();
      cliImports = remote?.imports;
    }
  } catch {
    // 框架配置读不到时仍用项目自己的 imports。
  }

  const projectImports =
    (project.imports && typeof project.imports === "object")
      ? project.imports as Record<string, string>
      : undefined;
  const imports = mergeProjectImports(
    projectImports,
    projectRoot,
    cliImports,
    cliDir,
  );
  const merged = buildRuntimeDenoConfig(project, imports);
  const runtimeConfigPath = await makeTempFile({
    prefix: "dweb-cli-runtime-",
    suffix: ".json",
  });
  await writeTextFile(
    runtimeConfigPath,
    `${JSON.stringify(merged, null, 2)}\n`,
  );

  let code = 1;
  try {
    const child = createCommand(execPath(), {
      args: [
        "run",
        "-A",
        "--minimum-dependency-age=0",
        "--config",
        runtimeConfigPath,
        main,
        ...args(),
      ],
      cwd: cwd(),
      env: { ...getEnvAll(), [PROJECT_CONFIG_ENV]: "1" },
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }).spawn();
    const status = await child.status;
    try {
      child.unref();
    } catch {
      // ignore
    }
    code = status.code ?? 1;
  } finally {
    try {
      await remove(runtimeConfigPath);
    } catch {
      // ignore
    }
  }
  exit(code);
}
