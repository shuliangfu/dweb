/**
 * dweb-cli run — Console 应用命令执行
 *
 * 用法：
 *   dweb-cli run hello/world
 *   dweb-cli run crond/start -a console
 *   dweb-cli run user/seed -- --force
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
import { App } from "../core/app.ts";
import { getConfig } from "../core/config.ts";
import { createConsoleContext } from "../feature/console-context.ts";
import type { ParsedOptions } from "../feature/command.ts";
import {
  formatConsoleCommandList,
  listConsoleCommands,
} from "../feature/console-list.ts";
import { loadConsoleMiddlewares } from "../feature/console-middleware.ts";
import {
  ConsoleActionNotFoundError,
  ConsoleModuleHelpError,
  ConsoleRouteNotFoundError,
  invokeConsoleAction,
  resolveConsoleRoute,
} from "../feature/console-router.ts";
import { isConsoleKind } from "../types/app.ts";
import { resolveConsoleRoot } from "../utils/console-root.ts";
import { preloadProjectEnv } from "../utils/env-loader.ts";
import { findProjectRoot } from "../utils/project.ts";
import { $tr } from "../utils/i18n.ts";
import {
  parseTrailingCommandArgs,
  takeRunPassthrough,
} from "../utils/run-passthrough.ts";

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

async function runList(
  projectRoot: string,
  appName: string | undefined,
  filter: string | undefined,
): Promise<void> {
  await preloadProjectEnv({ projectRoot, app: appName });
  let consoleRoot: string;
  try {
    consoleRoot = await resolveConsoleRoot(projectRoot, { app: appName });
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    exit(2);
    return;
  }
  const routesDir = await resolveRoutesDir(projectRoot, consoleRoot);
  const commands = await listConsoleCommands(routesDir, filter);
  info($tr("run.listHeader"));
  console.log(formatConsoleCommandList(commands));
  if (commands.length > 0) {
    info($tr("run.listFooter"));
  }
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
  let app: App | null = null;

  // 合并：位置参数尾巴 + cli 预处理的 -- 透传
  const trailingRaw = [...args.slice(1), ...takeRunPassthrough()];
  const trailing = parseTrailingCommandArgs(trailingRaw);

  try {
    app = new App(
      { kind: "console", hotReload: false },
      { mode: "console", configDirectories: [configDir] },
    );
    await app.start({ mode: "console" });

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

    const resolved = await resolveConsoleRoute(routesDir, routePath);
    const middlewares = await loadConsoleMiddlewares(
      join(consoleRoot, "middlewares"),
    );
    const ac = new AbortController();
    const ctx = createConsoleContext({
      app,
      routeName: resolved.routeName,
      args: trailing.args,
      options: trailing.options,
      cwd: projectRoot,
      signal: ac.signal,
    });

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

    await cleanupApp(app);
    app = null;
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
