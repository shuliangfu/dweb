/**
 * dweb-cli run — Console 应用命令执行
 *
 * 用法：
 *   dweb-cli run hello/world
 *   dweb-cli run user/add admin admin@qq.com 13800138000
 *   dweb-cli run user/add --username admin --email admin@qq.com --phone 13800138000
 *   dweb-cli run crond/start -a console
 *   dweb-cli run --list
 *   dweb-cli run hello --list
 *   dweb-cli run slow/job --timeout 5000
 *
 * 退出码：0 成功；1 业务/未捕获错误；2 路由未找到或参数非法；124 超时
 */

import { error, info } from "@dreamer/console";
import {
  cwd,
  exists,
  exit,
  join,
  readTextFile,
  resolve,
} from "@dreamer/runtime-adapter";
import type { App } from "../core/app.ts";
import {
  getConfig,
  setConsoleConfigDirectoryOverride,
} from "../core/config.ts";
import { createConsoleContext } from "../feature/console-context.ts";
import type { ParsedOptions } from "../feature/command.ts";
import {
  formatConsoleCommandList,
  listConsoleCommands,
} from "../feature/console-list.ts";
import { loadConsoleAppEntry } from "../feature/console-app.ts";
import {
  loadConsoleMiddlewares,
  loadDirectoryConsoleMiddlewares,
} from "../feature/console-middleware.ts";
import {
  collectPluginConsoleRouteRoots,
  collectPluginInlineCommands,
  listActiveAppPlugins,
  listPluginConsoleCommands,
  mergeConsoleCommandLists,
  resolveConsoleRouteFromSources,
} from "../feature/console-plugin-routes.ts";
import {
  ConsoleActionNotFoundError,
  ConsoleModuleHelpError,
  ConsoleRouteNotFoundError,
  invokeConsoleAction,
} from "../feature/console-router.ts";
import { isConsoleKind } from "../types/app.ts";
import { resolveConsoleRoot } from "../utils/console-root.ts";
import { preloadProjectEnv } from "../utils/env-loader.ts";
import { findProjectRoot } from "../utils/project.ts";
import { reexecWithProjectImportMap } from "../utils/project-import-map.ts";
import { $tr } from "../utils/i18n.ts";
import {
  parseTrailingCommandArgs,
  takeRunPassthrough,
} from "../utils/run-passthrough.ts";
import { perfDump, perfMark } from "../utils/perf-trace.ts";

perfMark("run_module_evaluated");

async function cleanupApp(app: App | null): Promise<void> {
  if (!app) return;
  try {
    await app.stop();
  } catch {
    // ignore
  }
  try {
    await app.shutdown();
  } catch {
    // ignore
  }
}

/**
 * 从 console 根解析 routes 目录（不启 App；供 --list）
 */
async function resolveRoutesDir(
  projectRoot: string,
  consoleRoot: string,
): Promise<string> {
  const configPath = join(consoleRoot, "config", "main.ts");
  if (await exists(configPath)) {
    try {
      const text = await readTextFile(configPath);
      const m = text.match(/routesDir:\s*["']([^"']+)["']/);
      if (m?.[1]) {
        return resolve(projectRoot, m[1]);
      }
    } catch {
      // fall through
    }
  }
  return join(consoleRoot, "routes");
}

async function startConsoleApp(
  consoleRoot: string,
  configDir: string,
): Promise<App> {
  perfMark("console_import_app");
  const { App: AppClass } = await import("../core/app.ts");
  perfMark("console_load_entry");
  let app = await loadConsoleAppEntry(consoleRoot);
  if (!app) {
    perfMark("console_construct_app");
    app = new AppClass(
      { kind: "console", hotReload: false },
      { mode: "console", configDirectories: [configDir] },
    );
  }
  perfMark("console_app_start");
  await app.start({ mode: "console" });
  perfMark("console_app_ready");
  return app;
}

async function runList(
  projectRoot: string,
  appName: string | undefined,
  filter: string | undefined,
): Promise<void> {
  await preloadProjectEnv({ projectRoot, app: appName });
  perfMark("list_env_loaded");
  let consoleRoot: string;
  try {
    consoleRoot = await resolveConsoleRoot(projectRoot, { app: appName });
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    exit(2);
    return;
  }
  const configDir = join(consoleRoot, "config");
  setConsoleConfigDirectoryOverride(configDir);
  let routesDir = await resolveRoutesDir(projectRoot, consoleRoot);
  let pluginCommands: Awaited<ReturnType<typeof listPluginConsoleCommands>> =
    [];
  let app: App | null = null;
  try {
    app = await startConsoleApp(consoleRoot, configDir);
    const config = getConfig(app.container);
    const routesDirRaw = (config.router as { routesDir?: string } | undefined)
      ?.routesDir;
    routesDir = routesDirRaw
      ? resolve(projectRoot, routesDirRaw)
      : join(consoleRoot, "routes");
    const plugins = listActiveAppPlugins(app.container);
    perfMark("list_plugin_scan");
    pluginCommands = await listPluginConsoleCommands(
      await collectPluginConsoleRouteRoots(plugins),
      collectPluginInlineCommands(plugins),
      filter,
    );
    perfMark("list_plugin_scan_done");
  } catch {
    // Host filesystem list still works if the App cannot start.
    app = null;
  }
  perfMark("list_host_scan");
  const commands = mergeConsoleCommandLists(
    await listConsoleCommands(routesDir, filter),
    pluginCommands,
  );
  perfMark("list_format");
  info($tr("run.listHeader"));
  console.log(formatConsoleCommandList(commands));
  if (commands.length > 0) {
    info($tr("run.listFooter"));
  }
  perfMark("list_cleanup");
  await cleanupApp(app);
  perfMark("list_done");
  perfDump("cli-run-list");
  exit(0);
}

/**
 * run 命令主入口
 */
export async function main(
  args: string[],
  options: ParsedOptions,
): Promise<void> {
  const projectRoot = await findProjectRoot(cwd());
  await reexecWithProjectImportMap(projectRoot);
  perfMark("run_main_begin");
  const appOpt = options.app;
  const appName = typeof appOpt === "string" && appOpt.length > 0
    ? appOpt
    : undefined;

  // 预加载应用与项目环境变量
  await preloadProjectEnv({ projectRoot, app: appName });

  const wantList = options.list === true;

  if (wantList) {
    await runList(projectRoot, appName, args[0]);
    return;
  }

  const routePath = args[0];
  if (!routePath || typeof routePath !== "string") {
    error($tr("run.missingRoute"));
    info($tr("run.usageHint"));
    exit(2);
    return;
  }

  const timeoutRaw = options.timeout;
  const timeoutMs = typeof timeoutRaw === "number" && timeoutRaw > 0
    ? timeoutRaw
    : typeof timeoutRaw === "string" && Number(timeoutRaw) > 0
    ? Number(timeoutRaw)
    : undefined;

  let consoleRoot: string;
  try {
    consoleRoot = await resolveConsoleRoot(projectRoot, { app: appName });
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    exit(2);
    return;
  }

  const configDir = join(consoleRoot, "config");
  // 让 console/main.ts 里 `new App({ kind: "console" })` 能自动加载本目录配置
  setConsoleConfigDirectoryOverride(configDir);
  let app: App | null = null;

  // 合并：位置参数尾巴 + cli 预处理摘出的命令选项
  const trailingRaw = [...args.slice(1), ...takeRunPassthrough()];
  const trailing = parseTrailingCommandArgs(trailingRaw);

  try {
    app = await startConsoleApp(consoleRoot, configDir);

    const config = getConfig(app.container);
    if (!isConsoleKind(config)) {
      error($tr("run.notConsoleKind", {
        kind: String(config.kind ?? "web"),
        root: consoleRoot,
      }));
      await cleanupApp(app);
      exit(2);
      return;
    }

    const routesDirRaw = (config.router as { routesDir?: string } | undefined)
      ?.routesDir;
    const routesDir = routesDirRaw
      ? resolve(projectRoot, routesDirRaw)
      : join(consoleRoot, "routes");

    perfMark("run_resolve_route");
    const plugins = listActiveAppPlugins(app.container);
    const pluginRoots = await collectPluginConsoleRouteRoots(plugins);
    const inlineCommands = collectPluginInlineCommands(plugins);
    const resolved = await resolveConsoleRouteFromSources(
      routesDir,
      routePath,
      pluginRoots,
      inlineCommands,
    );
    const directoryRoot = resolved.middlewareRoot ?? routesDir;
    // 外 → 内：全局 middlewares/ → config.middlewares → app.use() → 目录 _middleware.ts
    const directoryMiddlewares = resolved.filePath
      ? await loadDirectoryConsoleMiddlewares(directoryRoot, resolved.filePath)
      : [];
    perfMark("run_load_middlewares");
    const middlewares = [
      ...await loadConsoleMiddlewares(join(consoleRoot, "middlewares")),
      ...app.getConfigConsoleMiddlewares(),
      ...app.getEntryConsoleMiddlewares(),
      ...directoryMiddlewares,
    ];
    const ac = new AbortController();
    const ctx = createConsoleContext({
      app,
      routeName: resolved.routeName,
      args: trailing.args,
      options: trailing.options,
      cwd: projectRoot,
      signal: ac.signal,
    });

    perfMark("run_invoke_command");
    const invokePromise = invokeConsoleAction(resolved, ctx, { middlewares });
    let code: number;
    if (timeoutMs != null) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        code = await Promise.race([
          invokePromise,
          new Promise<number>((_, reject) => {
            timer = setTimeout(() => {
              ac.abort();
              reject(new ConsoleTimeoutError(timeoutMs));
            }, timeoutMs);
          }),
        ]);
      } finally {
        if (timer != null) clearTimeout(timer);
      }
    } else {
      code = await invokePromise;
    }

    perfMark("run_command_done");
    await cleanupApp(app);
    app = null;
    perfMark("run_cleanup_done");
    perfDump("cli-run");
    exit(code);
  } catch (err) {
    await cleanupApp(app);
    app = null;

    if (err instanceof ConsoleTimeoutError) {
      error($tr("run.timeout", { ms: String(err.timeoutMs) }));
      exit(124);
      return;
    }

    // 模块 help：用户写了 `run hello` 但只有 hello/world 等具名动作
    if (err instanceof ConsoleModuleHelpError) {
      info($tr("run.moduleHelpHeader"));
      console.log(err.helpText);
      exit(2);
      return;
    }

    if (
      err instanceof ConsoleRouteNotFoundError ||
      err instanceof ConsoleActionNotFoundError
    ) {
      error(err.message);
      // 尝试提示相近命令
      try {
        const routesDir = await resolveRoutesDir(projectRoot, consoleRoot);
        const all = await listConsoleCommands(routesDir);
        const needle = routePath.replace(/^\/+|\/+$/g, "");
        const hints = all
          .filter((c) =>
            c.route.includes(needle) || needle.includes(c.route.split("/")[0]!)
          )
          .slice(0, 5);
        if (hints.length > 0) {
          info($tr("run.didYouMean"));
          for (const h of hints) {
            console.log(`  ${h.route}`);
          }
        } else {
          info($tr("run.hintList"));
        }
      } catch {
        info($tr("run.hintList"));
      }
      exit(2);
      return;
    }

    error(
      $tr("run.failedWithMessage", {
        message: err instanceof Error ? err.message : String(err),
      }),
    );
    exit(1);
  }
}

/** 命令超时 */
export class ConsoleTimeoutError extends Error {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`Console command timed out after ${timeoutMs}ms`);
    this.name = "ConsoleTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}
