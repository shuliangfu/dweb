/**
 * @dreamer/server 集成（HTTP 服务器）
 *
 * 初始化 HTTP 服务器，集成中间件与路由，支持开发/生产模式。
 * 导出 initializeServer、getServer、startServer、stopServer。
 *
 * @module
 */

import { Server, type ServerOptions } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import { existsSync, getEnv } from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";
import { $t } from "../utils/i18n.ts";
import { getLogger } from "../utils/logger.ts";
import {
  buildClientScript,
  clearClientScriptCache,
} from "./csr-client-builder.ts";

/**
 * 初始化 HTTP 服务器
 *
 * 创建 Server 实例，配置中间件、路由、HMR 等，注册到容器。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 服务器实例
 *
 * @example
 * ```ts
 * const server = initializeServer(container, config);
 * await startServer(container);
 * ```
 */
export function initializeServer(
  container: ServiceContainer,
  config: AppConfig,
): Server {
  // 从配置中获取服务器选项
  const serverConfig = (config.server || {}) as ServerOptions;

  // 获取日志实例
  const logger = getLogger(container);

  // 创建服务器实例
  // DENO_ENV 由 App 构造函数自动设置：
  // - 有 --build 参数时设置为 prod
  // - 无 --build 参数时设置为 dev
  // - 运行编译后的 server.js 时，默认为 prod
  const mode = (getEnv("DENO_ENV") || "prod") as "dev" | "prod";

  // 获取 host，优先使用 server.host，最后使用默认值
  const host = serverConfig.host || "127.0.0.1";

  // 构建 dev 配置（仅开发模式，自动启用 HMR 热重载）
  let devConfig: typeof serverConfig.dev = undefined;
  if (mode === "dev") {
    // 推断默认的 watch 目录：
    // 1. 如果用户配置了 server.dev.watch，使用用户配置
    // 2. 否则根据 router.routesDir 推断（例如 ./src/routes -> ./src）
    // 3. 都没有则使用默认值 ./src
    let defaultWatchPaths = ["./src"];
    if (config.router?.routesDir) {
      // 从 routesDir 推断 src 目录（取 routesDir 的父目录）
      // 例如：./src/routes -> ./src
      const routesDir = config.router.routesDir as string;
      const srcDir = routesDir.replace(/\/routes\/?$/, "") || "./src";
      defaultWatchPaths = [srcDir];
    }

    const userDevConfig = serverConfig.dev || {};
    // watch 默认排除：框架生成的 client.dep.tsx / client.tsx，避免写入后触发第二次 rebuild 导致 HMR 重复刷新和内容闪回
    const watchIgnoreGenerated = ["_client.dep.tsx", "_client.tsx"];
    const userWatch = userDevConfig.watch ?? { paths: defaultWatchPaths };
    let paths = Array.isArray(userWatch)
      ? userWatch
      : (userWatch as { paths?: string[] }).paths ?? defaultWatchPaths;
    // 无 src 目录时：若配置了 ./src 或 src 但该路径不存在，Deno.watchFs 会抛 "No path was found"
    // 将不存在的路径替换为 ./，兼容旧模板生成的项目
    paths = [
      ...new Set(paths.map((p) => {
        const normalized = p.replace(/\/$/, "") || p;
        if (
          (normalized === "./src" || normalized === "src") &&
          !existsSync("./src")
        ) {
          return "./";
        }
        return p;
      })),
    ];
    const userIgnore =
      Array.isArray(userWatch) || !userWatch || typeof userWatch !== "object"
        ? []
        : (userWatch as { ignore?: string[] }).ignore ?? [];
    const watchConfig = Array.isArray(userWatch)
      ? { paths: userWatch, ignore: [...watchIgnoreGenerated, ...userIgnore] }
      : {
        ...(userWatch as object),
        paths,
        ignore: [...watchIgnoreGenerated, ...userIgnore],
      };

    devConfig = {
      // HMR 配置：用户配置 > 默认启用
      hmr: userDevConfig.hmr ?? { enabled: true },
      // watch 配置：合并默认排除（client.dep.tsx、client.tsx）与用户配置
      watch: watchConfig,
      // 构建器：文件变更时重新构建并返回 chunkUrl，供 HMR 无感刷新
      builder: userDevConfig.builder ?? {
        async rebuild(options?: { changedPath?: string }) {
          // 使模块缓存失效，确保刷新页面时加载最新内容（项目内所有模块更新都能热重载）
          if (options?.changedPath) {
            const { invalidateModule } = await import("./module-cache.ts");
            invalidateModule(options.changedPath);
          }
          clearClientScriptCache();
          const result = await buildClientScript(container, config, options);
          return { outputFiles: [], chunkUrl: result.chunkUrl };
        },
      },
    };
  }

  // 默认 onListen：使用 $t 输出国际化日志；用户配置的 onListen 优先
  // 将 ::1、0.0.0.0 等统一显示为 127.0.0.1，便于用户复制访问（不同系统/运行时可能返回不同格式）
  const defaultOnListen = ({ port }: { port: number }) => {
    const key = mode === "dev"
      ? "log.devServerRunning"
      : "log.prodServerRunning";
    logger.info($t(key, { host, port: String(port) }));
  };
  const onListen = serverConfig.onListen ?? defaultOnListen;

  const server = new Server({
    mode,
    port: serverConfig.port || 8000,
    host, // @dreamer/server 使用 host
    logger,
    onListen,
    onError: serverConfig.onError,
    debug: serverConfig.debug,
    dev: devConfig,
    shutdownTimeout: serverConfig.shutdownTimeout || 10000,
  });

  // 将服务器注册到服务容器
  container.registerSingleton("server", () => server);

  return server;
}

/**
 * 获取服务器实例
 *
 * @param container 服务容器
 * @returns 服务器实例
 *
 * @example
 * ```ts
 * const server = getServer(container);
 * await server.start();
 * ```
 */
export function getServer(container: ServiceContainer): Server {
  return container.get<Server>("server");
}

/**
 * 启动服务器
 *
 * @param container 服务容器
 * @returns Promise<void>
 *
 * @example
 * ```ts
 * await startServer(container);
 * ```
 */
export async function startServer(container: ServiceContainer): Promise<void> {
  const server = getServer(container);
  await server.start();
}

/**
 * 停止服务器
 *
 * @param container 服务容器
 * @param timeout 超时时间（可选，毫秒）
 * @returns Promise<void>
 *
 * @example
 * ```ts
 * await stopServer(container, 5000);
 * ```
 */
export async function stopServer(
  container: ServiceContainer,
  timeout?: number,
): Promise<void> {
  const server = getServer(container);
  await server.stop(timeout);
}
