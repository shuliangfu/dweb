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
  getEnv,
  getEnvAll,
  IS_BUN,
  IS_NODE,
  join,
  makeTempFile,
  readTextFile,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { getPackageRoot, loadDwebDenoJson } from "./version.ts";
import { perfDump, perfMark } from "./perf-trace.ts";
import {
  buildRuntimeDenoConfig,
  importsFromConfig,
  mergeProjectImports,
  pathAliasesFromImports,
  projectImportMapAlreadyActive,
  resolvePathAlias,
} from "./project-import-map-pure.ts";

/** 子进程已带上项目 import map，避免再次重跑。 */
export const PROJECT_CONFIG_ENV = "DWEB_CLI_WITH_PROJECT_CONFIG";

export {
  buildRuntimeDenoConfig,
  importsFromConfig,
  mergeProjectImports,
  pathAliasesFromImports,
  pathFromFileUrl,
  projectImportMapAlreadyActive,
  resolveImportMapSpecifier,
  resolvePathAlias,
} from "./project-import-map-pure.ts";

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
  if (getEnv(PROJECT_CONFIG_ENV) === "1") {
    perfMark("reexec_skipped");
    return;
  }

  if (IS_BUN || IS_NODE) {
    perfMark("reexec_runtime_aliases");
    const aliases = await loadProjectPathAliases(projectRoot);
    if (Object.keys(aliases).length > 0) {
      await installRuntimeAliasResolver(aliases);
    }
    perfMark("reexec_runtime_aliases_done");
    return;
  }

  const configPath = (await exists(join(projectRoot, "deno.json")))
    ? join(projectRoot, "deno.json")
    : (await exists(join(projectRoot, "deno.jsonc")))
    ? join(projectRoot, "deno.jsonc")
    : null;
  if (!configPath) {
    perfMark("reexec_no_project_config");
    return;
  }

  const main = denoMainModule();
  if (!main) {
    perfMark("reexec_no_main_module");
    return;
  }
  perfMark("reexec_merge_config");

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
  if (
    projectImportMapAlreadyActive(
      projectImports,
      projectRoot,
      (specifier) => import.meta.resolve(specifier),
    )
  ) {
    perfMark("reexec_already_mapped");
    return;
  }
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
    perfMark("reexec_spawn");
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
      env: {
        ...getEnvAll(),
        [PROJECT_CONFIG_ENV]: "1",
        ...(getEnv("DWEB_PERF")
          ? {
            DWEB_PERF_EPOCH: getEnv("DWEB_PERF_EPOCH") ?? String(Date.now()),
          }
          : {}),
      },
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }).spawn();
    const status = await child.status;
    perfMark("reexec_child_done");
    perfDump("cli-parent");
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
