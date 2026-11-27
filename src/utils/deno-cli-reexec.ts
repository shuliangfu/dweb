/**
 * Deno-only import-map reexec for `dweb-cli run`.
 *
 * This module must not import `@dreamer/runtime-adapter` or other heavy
 * framework graphs: the first Deno process should decide whether to hand
 * off and spawn almost immediately. Bun / Node do not use this path.
 *
 * @module
 */

import {
  buildRuntimeDenoConfig,
  importsFromConfig,
  mergeProjectImports,
  pathFromFileUrl,
  projectImportMapAlreadyActive,
  resolveFilePath,
} from "./project-import-map-pure.ts";

/** 子进程已带上项目 import map，避免再次重跑。 */
const PROJECT_CONFIG_ENV = "DWEB_CLI_WITH_PROJECT_CONFIG";

function perfOn(): boolean {
  try {
    const v = (Deno.env.get("DWEB_PERF") ?? "").trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes" || v === "on";
  } catch {
    return false;
  }
}

async function mark(name: string): Promise<void> {
  if (!perfOn()) return;
  const { perfMark } = await import("./perf-trace.ts");
  perfMark(name);
}

async function dump(label: string): Promise<void> {
  if (!perfOn()) return;
  const { perfDump } = await import("./perf-trace.ts");
  perfDump(label);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

function dirname(path: string): string {
  const n = path.replace(/\\/g, "/");
  const i = n.lastIndexOf("/");
  if (i <= 0) return n.startsWith("/") ? "/" : n;
  // Windows drive root "C:/"
  if (/^[A-Za-z]:$/.test(n.slice(0, i))) return n.slice(0, i + 1);
  return n.slice(0, i);
}

function joinPath(base: string, name: string): string {
  return resolveFilePath(base, name);
}

async function findProjectRoot(startDir: string): Promise<string> {
  let current = resolveFilePath(startDir, ".");
  while (true) {
    if (
      await fileExists(joinPath(current, "deno.json")) ||
      await fileExists(joinPath(current, "deno.jsonc")) ||
      await fileExists(joinPath(current, "package.json"))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return resolveFilePath(startDir, ".");
}

/** Package root when this file lives at `src/utils/deno-cli-reexec.ts`. */
function frameworkPackageRoot(): string | undefined {
  const url = import.meta.url;
  if (!url.startsWith("file:")) return undefined;
  const here = pathFromFileUrl(url);
  return dirname(dirname(dirname(here)));
}

async function readJson(
  path: string,
): Promise<Record<string, unknown> | undefined> {
  try {
    const parsed = JSON.parse(await Deno.readTextFile(path)) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return undefined;
}

/**
 * If this Deno process is not yet running with the project's import map,
 * merge configs and reexec. Returns only when reexec is skipped.
 * When a child is spawned, this function exits the process with the
 * child's status and does not return.
 */
export async function reexecWithProjectImportMapDeno(
  _opts?: { jsEntryMs?: number },
): Promise<void> {
  if (Deno.env.get(PROJECT_CONFIG_ENV) === "1") {
    await mark("reexec_skipped");
    return;
  }

  const projectRoot = await findProjectRoot(Deno.cwd());
  const configPath = (await fileExists(joinPath(projectRoot, "deno.json")))
    ? joinPath(projectRoot, "deno.json")
    : (await fileExists(joinPath(projectRoot, "deno.jsonc")))
    ? joinPath(projectRoot, "deno.jsonc")
    : null;
  if (!configPath) {
    await mark("reexec_no_project_config");
    return;
  }

  const main = Deno.mainModule;
  if (!main) {
    await mark("reexec_no_main_module");
    return;
  }

  const project = await readJson(configPath);
  if (!project) {
    await mark("reexec_no_project_config");
    return;
  }

  const projectImports = importsFromConfig(project);
  if (
    projectImportMapAlreadyActive(
      projectImports,
      projectRoot,
      (specifier) => import.meta.resolve(specifier),
    )
  ) {
    await mark("reexec_already_mapped");
    return;
  }

  await mark("reexec_merge_config");

  let cliImports: Record<string, string> | undefined;
  let cliDir: string | undefined;
  const root = frameworkPackageRoot();
  if (root) {
    const cliConfig = joinPath(root, "deno.json");
    if (await fileExists(cliConfig)) {
      cliImports = importsFromConfig(await readJson(cliConfig));
      cliDir = root;
    }
  }

  const imports = mergeProjectImports(
    projectImports,
    projectRoot,
    cliImports,
    cliDir,
  );
  const merged = buildRuntimeDenoConfig(project, imports);
  const runtimeConfigPath = await Deno.makeTempFile({
    prefix: "dweb-cli-runtime-",
    suffix: ".json",
  });
  await Deno.writeTextFile(
    runtimeConfigPath,
    `${JSON.stringify(merged, null, 2)}\n`,
  );

  const childEnv: Record<string, string> = {
    ...Deno.env.toObject(),
    [PROJECT_CONFIG_ENV]: "1",
  };
  const jsEntryMs = _opts?.jsEntryMs;
  const parentEpoch = Deno.env.get("DWEB_DEV_STARTED_AT") ??
    String(
      Math.round(
        Date.now() - (typeof jsEntryMs === "number" ? jsEntryMs : 0),
      ),
    );
  childEnv.DWEB_DEV_STARTED_AT = parentEpoch;
  if (perfOn()) {
    childEnv.DWEB_PERF_EPOCH = Deno.env.get("DWEB_PERF_EPOCH") ??
      parentEpoch;
  }

  let code = 1;
  try {
    await mark("reexec_spawn");
    const child = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "-A",
        "--minimum-dependency-age=0",
        "--config",
        runtimeConfigPath,
        main,
        ...Deno.args,
      ],
      cwd: Deno.cwd(),
      env: childEnv,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }).spawn();
    const status = await child.status;
    await mark("reexec_child_done");
    await dump("cli-parent");
    code = status.code ?? 1;
  } finally {
    try {
      await Deno.remove(runtimeConfigPath);
    } catch {
      // ignore
    }
  }
  Deno.exit(code);
}
