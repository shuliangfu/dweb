/**
 * Console 命令上下文
 *
 * 传给 `routes/*.ts` 导出的动作方法（如 `world(ctx)` / `start(ctx)`）。
 */

import type { Logger } from "@dreamer/logger";
import type { ServiceContainer } from "@dreamer/service";
import type { ParsedOptions } from "@dreamer/console";
import type { App } from "../core/app.ts";
import type { AppConfig } from "../types/app.ts";
import { getConfig } from "../core/config.ts";
import { getLogger } from "../utils/logger.ts";
import { cwd } from "../core/runtime-adapter.ts";

/**
 * Console 命令执行上下文
 */
export interface ConsoleContext {
  /** console 模式启动的 App（无 HTTP listen） */
  app: App;
  /** 与 Web 相同的 DI 容器 */
  container: ServiceContainer;
  /** 已合并的应用配置 */
  config: AppConfig;
  /** 位置参数（路由之后） */
  args: string[];
  /** 解析后的 CLI 选项（含传给命令的 `--foo`） */
  options: ParsedOptions;
  /** 项目根（cwd） */
  cwd: string;
  /** 统一日志 */
  log: Logger;
  /** Ctrl+C / 超时取消 */
  signal: AbortSignal;
  /** 当前命令路由名，如 `hello/world` */
  name: string;
}

export interface CreateConsoleContextOptions {
  app: App;
  routeName: string;
  args?: string[];
  options?: ParsedOptions;
  signal?: AbortSignal;
  cwd?: string;
}

/**
 * 构建 ConsoleContext
 */
export function createConsoleContext(
  opts: CreateConsoleContextOptions,
): ConsoleContext {
  const { app } = opts;
  return {
    app,
    container: app.container,
    config: getConfig(app.container),
    args: opts.args ?? [],
    options: opts.options ?? {},
    cwd: opts.cwd ?? cwd(),
    log: getLogger(app.container),
    signal: opts.signal ?? new AbortController().signal,
    name: opts.routeName,
  };
}
