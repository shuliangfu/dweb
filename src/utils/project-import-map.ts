/**
 * 让 `dweb-cli run` 使用**当前项目**的 deno.json import map。
 *
 * 【Why】全局 / 本地安装的入口是 `dweb/src/cli.ts`（或 jsr:@dreamer/dweb/cli）。
 * Deno 会按入口文件解析 import map，用的是框架自己的 deno.json，
 * 不会读到项目里的 `@common/` 等别名。动态 import 控制台路由时就会报
 * “not a dependency and not in import map”。
 *
 * 做法：把项目 deno.json 与框架 deno.json 的 imports 合并（项目优先），
 * 再以 `--config` 重跑一次 CLI；交互输入（confirm）走 inherit stdin。
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
