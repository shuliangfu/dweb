#!/usr/bin/env -S deno run -A

/**
 * dweb-cli 命令行工具入口
 *
 * 提供项目初始化、代码生成、数据库迁移、开发/构建/启动等 CLI 命令。
 * 通过 `deno run -A jsr:@dreamer/dweb/setup` 安装为全局命令 `dweb-cli` 后使用。
 *
 * 本文件及其静态可分析依赖必须保持极小：Deno 会把可静态分析的
 * `import()` 一并装进启动模块图。真正的命令树在 `cli-boot.ts`，
 * 用运行期拼出的说明符加载，这样第一个进程才能几乎立刻按项目
 * import map 转交（Deno 无法在同一进程里中途更换 import map）。
 *
 * @module
 */

/** Time from isolate start to this module body. */
const jsEntryMs = performance.now();

function envGet(name: string): string | undefined {
  try {
    const deno = (globalThis as {
      Deno?: { env?: { get?: (key: string) => string | undefined } };
    }).Deno;
    const value = deno?.env?.get?.(name);
    if (typeof value === "string") return value;
  } catch {
    // Permission denied or Deno.env unavailable
  }
  try {
    const proc = (globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }).process;
    return proc?.env?.[name];
  } catch {
    return undefined;
  }
}

function isPerfOn(): boolean {
  const value = (envGet("DWEB_PERF") ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" ||
    value === "on";
}

function isDenoRuntime(): boolean {
  const g = globalThis as { Deno?: unknown; Bun?: unknown };
  return typeof g.Deno !== "undefined" && typeof g.Bun === "undefined";
}

/** Main-module check without importing main-module.ts (that pulls runtime-adapter). */
function isMain(): boolean {
  if (typeof import.meta.main === "boolean") return import.meta.main;
  const proc = (globalThis as { process?: { argv?: string[] } }).process;
  const entry = proc?.argv?.[1];
  if (!entry || !import.meta.url) return false;
  let currentPath: string;
  try {
    currentPath = new URL(import.meta.url).pathname;
    if (/^\/[A-Za-z]:/.test(currentPath)) currentPath = currentPath.slice(1);
  } catch {
    return false;
  }
  const normEntry = entry.replace(/\\/g, "/");
  return currentPath === normEntry ||
    currentPath.endsWith(normEntry) ||
    normEntry.endsWith(currentPath);
}

/**
 * Load the real CLI without a statically-analyzable specifier, so Deno
 * does not put the command tree into this entry's module graph.
 */
async function loadCliBoot(): Promise<{ bootCli: () => Promise<void> }> {
  const specifier = `./cli-${"boot"}.ts`;
  return await import(specifier);
}

async function boot(): Promise<void> {
  if (!isMain()) return;

  if (isPerfOn()) {
    const { perfMark } = await import("./utils/perf-trace.ts");
    console.error(
      `[dweb-perf] cli  stage=cli_isolate_to_js  t=${jsEntryMs.toFixed(1)}ms`,
    );
    perfMark("cli_module_evaluated");
  }

  if (isDenoRuntime()) {
    const deno = (globalThis as {
      Deno: {
        args: string[];
        env: { get: (key: string) => string | undefined };
      };
    }).Deno;
    if (
      deno.env.get("DWEB_CLI_WITH_PROJECT_CONFIG") !== "1" &&
      deno.args[0] === "run"
    ) {
      const { reexecWithProjectImportMapDeno } = await import(
        "./utils/deno-cli-reexec.ts"
      );
      await reexecWithProjectImportMapDeno({ jsEntryMs });
    }
  }

  const { bootCli } = await loadCliBoot();
  await bootCli();
}

await boot();
