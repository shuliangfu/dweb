/**
 * @dreamer/esbuild 集成
 *
 * 初始化构建工具（Builder），配置客户端/服务端构建，执行构建任务。
 * 使用 engine 字段、dev/prod 模式。导出 initializeBuild、getBuild、runBuildWithBuilder。
 *
 * 构建流程统一走 @dreamer/esbuild 的 Builder.build()，不直接调用 BuilderServer/BuilderClient。
 *
 * @module
 */

import {
  Builder,
  type BuilderConfig,
  type BuildOptions,
  type ClientConfig,
  type ServerConfig,
} from "@dreamer/esbuild";
import type { ServiceContainer } from "@dreamer/service";
import {
  args,
  cwd,
  exists,
  getEnv,
  join,
  mkdir,
  relative,
  remove,
} from "../core/runtime-adapter.ts";
import { type AppConfig, isApiKind } from "../types/app.ts";
import {
  getClientOutputDir,
  getInferredBuildOutputDirs,
  getMainModulePath,
} from "../utils/build-dirs.ts";
import { DwebErrorCode, throwDwebError } from "../utils/errors.ts";
import { $tr } from "../utils/i18n.ts";
import { getLogger } from "../utils/logger.ts";
import { resolveRouterRoutesDirPath } from "../utils/path.ts";
import { rewriteServerExternalSpecifiers } from "../utils/rewrite-server-externals.ts";
import {
  createDwebClientBundlePlugins,
  prepareClientBuildEntry,
} from "./csr-client-builder.ts";

/**
 * 从 AppConfig 解析 esbuild BuildOptions。
 *
 * 规范路径为嵌套 `app.build.build.*`（BuildAppConfig 继承 BuilderConfig.build）。
 * 兼容旧扁平写法 `app.build.clean` 等：嵌套有值优先，否则回落扁平。
 */
export function resolveAppBuildOptions(config: AppConfig): BuildOptions {
  const buildConfig = (config.build || {}) as Record<string, unknown>;
  const nested = (buildConfig.build && typeof buildConfig.build === "object")
    ? buildConfig.build as Record<string, unknown>
    : {};

  const pick = <T>(key: string): T | undefined => {
    if (
      Object.prototype.hasOwnProperty.call(nested, key) &&
      nested[key] !== undefined
    ) {
      return nested[key] as T;
    }
    if (
      Object.prototype.hasOwnProperty.call(buildConfig, key) &&
      buildConfig[key] !== undefined &&
      // 避免把嵌套的 build 对象本身当成 BuildOptions 字段
      key !== "build" &&
      key !== "server" &&
      key !== "client" &&
      key !== "assets" &&
      key !== "devCache"
    ) {
      return buildConfig[key] as T;
    }
    return undefined;
  };

  return {
    mode: pick<"dev" | "prod">("mode"),
    clean: pick<boolean>("clean"),
    cache: pick<boolean | string>("cache"),
    incremental: pick<boolean>("incremental"),
    watch: pick<BuildOptions["watch"]>("watch"),
    onProgress: pick<BuildOptions["onProgress"]>("onProgress"),
    silent: pick<boolean>("silent"),
    slowBuildThreshold: pick<number>("slowBuildThreshold"),
    validateConfig: pick<boolean>("validateConfig"),
    logLevel: pick<BuildOptions["logLevel"]>("logLevel"),
    reportHTML: pick<boolean | string>("reportHTML"),
  };
}

/**
 * 在插件 onBuild 之前清理服务端／客户端输出目录。
 *
 * 必须先于 Tailwind 等写入 `dist/client/assets` 的钩子，否则 Builder 内置 clean
 * 会在 onBuild 之后删掉刚生成的 CSS。
 */
export async function cleanBuildOutputDirs(
  config: AppConfig,
  log?: { info: (msg: string) => void },
): Promise<string[]> {
  const cwdPath = cwd();
  const serverRel =
    (config.build as { server?: { output?: string } } | undefined)
      ?.server?.output ?? getInferredBuildOutputDirs().server;
  const clientRel = getClientOutputDir(config);

  const toAbs = (p: string) =>
    (p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p)) ? p : join(cwdPath, p);

  const serverAbs = toAbs(serverRel).replace(/\\/g, "/");
  const clientAbs = toAbs(clientRel).replace(/\\/g, "/");

  const removed: string[] = [];

  const wipeAndEnsure = async (abs: string, label: string) => {
    try {
      if (await exists(abs)) {
        await remove(abs, { recursive: true });
        removed.push(label);
        log?.info($tr("clean.removed", { dir: label }));
      }
    } catch {
      // 目录可能不存在或并发删除，忽略
    }
    try {
      await mkdir(abs, { recursive: true });
    } catch {
      // 忽略
    }
  };

  // 客户端在服务端目录下时，只清父目录再重建两者，避免竞态
  const clientUnderServer = clientAbs === serverAbs ||
    clientAbs.startsWith(serverAbs.replace(/\/$/, "") + "/");
  if (clientUnderServer) {
    await wipeAndEnsure(serverAbs, serverRel);
    try {
      await mkdir(clientAbs, { recursive: true });
    } catch {
      // 忽略
    }
  } else {
    await wipeAndEnsure(serverAbs, serverRel);
    await wipeAndEnsure(clientAbs, clientRel);
  }

  return removed;
}

/**
 * 初始化构建工具
 *
 * 根据 build 与 render 配置创建 Builder 实例，注册到服务容器。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns Builder 实例
 *
 * @example
 * ```ts
 * const builder = initializeBuild(container, config);
 * await builder.build();
 * ```
 */
export function initializeBuild(
  container: ServiceContainer,
  config: AppConfig,
): Builder {
  // 从配置中获取构建选项（嵌套 build.build.*，兼容扁平）
  const buildConfig = (config.build || {}) as Record<string, unknown>;
  const resolvedBuildOpts = resolveAppBuildOptions(config);
  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact" | "view";
    mode?: "ssr" | "csr" | "ssg";
  };

  // 获取日志实例
  const logger = getLogger(container);

  // 构建 BuilderConfig
  // 处理客户端配置：优先使用 buildConfig.client，如果没有则从 renderConfig 生成
  // 纯 API 应用不生成客户端配置
  let clientConfig: ClientConfig | undefined;
  const existingClientConfig = buildConfig.client as ClientConfig | undefined;
  const apiApp = isApiKind(config);

  if (!apiApp) {
    if (existingClientConfig) {
      // 如果已有客户端配置，直接使用
      clientConfig = existingClientConfig;
    } else if (renderConfig.engine) {
      // 如果没有客户端配置但有渲染引擎，生成默认配置
      clientConfig = {
        engine: renderConfig.engine,
        output: "./dist/client",
        // 其他字段使用默认值或 undefined
      };
    }
  }

  // 构建调试：config.build.client.debug / config.build.server.debug 传递至 esbuild
  if (clientConfig) {
    const clientDebug = (buildConfig.client as { debug?: boolean } | undefined)
      ?.debug;
    if (clientDebug !== undefined) {
      clientConfig = { ...clientConfig, debug: clientDebug };
    }
  }
  const serverConfigForBuild = buildConfig.server as ServerConfig | undefined;
  const serverWithDebug = serverConfigForBuild
    ? {
      ...serverConfigForBuild,
      debug: (serverConfigForBuild as { debug?: boolean }).debug ??
        (buildConfig.server as { debug?: boolean })?.debug,
      logger,
    }
    : undefined;

  // 客户端配置传入 logger，便于 esbuild resolver 等调试日志输出
  if (clientConfig) {
    clientConfig = { ...clientConfig, logger };
  }

  const builderConfig: BuilderConfig = {
    // 服务端配置（如果有）
    server: serverWithDebug as BuilderConfig["server"],
    // 客户端配置
    client: clientConfig,
    // 资源处理配置
    assets: buildConfig.assets as BuilderConfig["assets"],
    // 构建选项
    build: {
      mode: resolvedBuildOpts.mode ||
        (getEnv("RUNTIME_ENV") === "dev" ? "dev" : "prod"),
      clean: resolvedBuildOpts.clean,
      cache: resolvedBuildOpts.cache,
      incremental: resolvedBuildOpts.incremental,
      watch: resolvedBuildOpts.watch,
      onProgress: resolvedBuildOpts.onProgress,
      silent: resolvedBuildOpts.silent,
      slowBuildThreshold: resolvedBuildOpts.slowBuildThreshold,
      validateConfig: resolvedBuildOpts.validateConfig,
      logLevel: resolvedBuildOpts.logLevel,
      reportHTML: resolvedBuildOpts.reportHTML,
    } as BuilderConfig["build"],
    validateConfig: resolvedBuildOpts.validateConfig ??
      (buildConfig.validateConfig as boolean | undefined),
    // 与 esbuild 支持的语种对齐：仅 en-US / zh-CN 透传，其余由 esbuild 自动检测
    lang: config.language === "en-US" || config.language === "zh-CN"
      ? config.language
      : undefined,
  };

  // 创建 Builder 实例
  const builder = new Builder(builderConfig);

  // 将构建器注册到服务容器
  container.registerSingleton("build", () => builder);

  // 开发态构建器就绪为诊断信息，用 debug 避免默认 info 刷屏
  if (!args().includes("--build")) {
    logger.debug($tr("log.buildToolReady"));
  }

  return builder;
}

/**
 * 获取构建器实例
 *
 * @param container 服务容器
 * @returns 构建器实例
 *
 * @example
 * ```ts
 * const builder = getBuild(container);
 * await builder.build();
 * ```
 */
export function getBuild(container: ServiceContainer): Builder {
  return container.get<Builder>("build");
}

/**
 * 使用 @dreamer/esbuild 的 Builder 执行完整构建（服务端 + 客户端 + 资源）
 *
 * 不直接调用 BuilderServer/BuilderClient，统一走 Builder.build()。
 * 构建前会调用 prepareClientBuildEntry 生成 _client.tsx 入口。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @param options.skipClient 是否跳过客户端构建（如 SSG 模式）
 */
export async function runBuildWithBuilder(
  container: ServiceContainer,
  config: AppConfig,
  options?: {
    skipClient?:
      boolean; /** 显式覆盖；用于 App 已在 onBuild 前清理时传 false */
    clean?: boolean;
  },
): Promise<void> {
  const logger = getLogger(container);
  const buildConfig = (config.build || {}) as {
    server?: {
      entry?: string;
      output?: string;
      useNativeCompile?: boolean;
      external?: string[];
    };
    assets?: BuilderConfig["assets"];
  };
  const serverConfig = buildConfig.server || {};
  const cwdPath = cwd();

  // 服务端配置：未指定 entry 时，优先从 mainModule 推断，否则默认 src/main.ts
  let serverEntry = serverConfig.entry;
  if (!serverEntry) {
    const mainModulePath = getMainModulePath();
    if (mainModulePath) {
      serverEntry = relative(cwdPath, mainModulePath);
      if (serverEntry.startsWith("..")) serverEntry = join(".", serverEntry);
      else if (!serverEntry.startsWith(".")) {
        serverEntry = join(".", serverEntry);
      }
    } else {
      serverEntry = join(".", "src", "main.ts");
    }
  }

  // 统一检查入口是否存在，不存在则抛出（默认 src/main.ts 时尝试 main.ts）
  let absEntry = join(cwdPath, serverEntry);
  const defaultSrcMain = join(".", "src", "main.ts");
  if (
    !(await exists(absEntry)) &&
    (serverEntry === "./src/main.ts" || serverEntry === defaultSrcMain)
  ) {
    const rootMain = join(cwdPath, "main.ts");
    if (await exists(rootMain)) {
      serverEntry = join(".", "main.ts");
      absEntry = rootMain;
    }
  }

  // 如果入口不存在，则抛出错误
  if (!(await exists(absEntry))) {
    throwDwebError(DwebErrorCode.ENTRY_PATH_INVALID, {
      reason: $tr("errors.entryPathInvalidReasonServerEntryNotFound"),
      hint: $tr("errors.entryPathInvalidHintServerEntry"),
      path: absEntry,
    });
  }

  const useNativeCompile = serverConfig.useNativeCompile === true;
  const serverOutputDir = serverConfig.output ??
    getInferredBuildOutputDirs().server;
  const serverOutput = useNativeCompile
    ? join(serverOutputDir, "server")
    : serverOutputDir;

  const esbuildServerConfig: ServerConfig = {
    entry: serverEntry,
    output: serverOutput,
    useNativeCompile,
    external: (serverConfig as { external?: string[] }).external,
    externalNpm: !useNativeCompile,
    // 透传 compile（含 minify／legalComments）；esbuild 生产默认 legalComments:"none"
    compile: (serverConfig as { compile?: ServerConfig["compile"] }).compile,
    debug: (serverConfig as { debug?: boolean }).debug,
    logger,
  };

  // 客户端配置（非 SSG 时准备入口并构建）
  // 客户端构建必须带上 strip-load 插件，剔除路由模块的 load 导出及其依赖，避免 node:* 等打进浏览器 chunk
  // 纯 API 或显式 skipClient：跳过客户端
  const skipClient = options?.skipClient === true || isApiKind(config);
  let clientConfig: ClientConfig | undefined;
  if (!skipClient) {
    const prepared = await prepareClientBuildEntry(container, config);
    const buildClient = (config.build as { client?: { debug?: boolean } })
      ?.client;
    const routerConfig = (config.router || {}) as { routesDir?: string };
    const routesDirPath = resolveRouterRoutesDirPath(
      cwd(),
      routerConfig.routesDir ?? "./src/routes",
    );
    clientConfig = {
      entry: prepared.entry,
      output: prepared.output,
      engine: prepared.engine,
      bundle: prepared.bundle,
      debug: buildClient?.debug,
      logger,
      plugins: createDwebClientBundlePlugins(prepared.engine, routesDirPath),
    };
  }

  const resolvedBuildOpts = resolveAppBuildOptions(config);
  const builderConfig: BuilderConfig = {
    server: esbuildServerConfig,
    client: clientConfig,
    assets: buildConfig.assets,
    build: {
      mode: "prod",
      // App.build 若已在 onBuild 前清理，会传 clean:false，避免删掉插件刚写的 CSS
      clean: options?.clean !== undefined
        ? options.clean
        : resolvedBuildOpts.clean,
      cache: resolvedBuildOpts.cache,
    },
    lang: config.language === "en-US" || config.language === "zh-CN"
      ? config.language
      : undefined,
  };

  const builder = new Builder(builderConfig);
  await builder.build();

  // 向服务端产物注入 __DWEB_VERSION__，使生产运行时 getDwebVersion() 能拿到正确版本（否则 import.meta.url 指向 dist 会读到示例目录 deno.json 而回退到 3.0.0）
  if (!useNativeCompile) {
    const { getDwebVersion } = await import("../utils/version.ts");
    const version = await getDwebVersion();
    const serverJsPath = join(cwdPath, serverOutputDir, "server.js");
    const { readTextFile, writeTextFile } = await import(
      "../core/runtime-adapter.ts"
    );
    if (await exists(serverJsPath)) {
      const content = await readTextFile(serverJsPath);
      // 将 jsr:/npm:/@jsr/ external 改成裸包名，Bun/Node 才能解析（Deno import map 同样认裸名）
      const rewritten = rewriteServerExternalSpecifiers(content);
      const versionBanner = `globalThis.__DWEB_VERSION__ = ${
        JSON.stringify(version)
      };\n`;
      await writeTextFile(serverJsPath, versionBanner + rewritten);
    }
  }
}
