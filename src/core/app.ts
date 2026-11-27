/**
 * App 主类（框架核心入口）
 *
 * 整合 @dreamer/* 库，提供统一 API、生命周期管理、事件机制（EventEmitter）。
 * 协调配置、服务、中间件、插件、路由、渲染等模块的初始化与启动。
 *
 * @module
 */

import type { LifecycleHook, LifecycleStage } from "@dreamer/lifecycle";
import type { Middleware, MiddlewareContext } from "@dreamer/middleware";
import type { SocketContext } from "@dreamer/plugin";
import { ServiceContainer } from "@dreamer/service";
import { EventEmitter } from "node:events";
import { pathToFileURL } from "node:url";
import {
  isApiKind,
  isConsoleKind,
  resolveAppKind,
  resolveConsoleSlim,
} from "../types/app.ts";
import {
  args,
  cwd,
  exit,
  getEnv,
  join,
  readdir,
  readTextFile,
  realPath,
  relative,
  resolve,
  setEnv,
  type SignalHandler,
  writeTextFile,
} from "./runtime-adapter.ts";

import {
  type AppConfig,
  type AppConstructOptions,
  type AppLifecycleHook,
  type AppMiddleware,
  type AppPlugin,
  type AppStage,
  type AppStartOptions,
  type ConsoleAppMiddleware,
  type IApp,
  isSocketIOAdapter,
} from "../types/app.ts";
import { getClientOutputDir } from "../utils/build-dirs.ts";
import { setCacheOptions } from "../utils/constants.ts";
import { DwebErrorCode, throwDwebError } from "../utils/errors.ts";
import { $tr } from "../utils/i18n.ts";
import { getLogger, initializeLogger } from "../utils/logger.ts";
import {
  clientRouteComponentKey,
  isPathWithinProject,
  resolveRouterRoutesDirPath,
} from "../utils/path.ts";
import { parseRoutePath } from "../utils/route.ts";
import { serializeJsonForInlineScript } from "../utils/security.ts";
import { getDwebVersion } from "../utils/version.ts";
import {
  deepMergeConfig,
  getConfig,
  getConfigManager,
  inferConfigDirectoryFromEntry,
  initializeConfigManager,
  validateConfig,
} from "./config.ts";
import { getLifecycleManager, initializeLifecycle } from "./lifecycle.ts";
import {
  removeAppSignalHandlers,
  setupAppSignalHandlers,
} from "./app-signals.ts";
import {
  getServerMiddlewares,
  initializeMiddleware,
  pluginEventsMiddleware,
  registerMiddleware,
} from "./middleware.ts";
import { pluginEvents } from "./plugin-events.ts";
import {
  getPluginManager,
  initializePlugin,
  registerPlugin,
} from "./plugin.ts";
import { initializeServiceContainer } from "./service.ts";
import { resolveConfigConsoleMiddlewares } from "../feature/console-middleware.ts";
import { importLater } from "../utils/import-later.ts";
import { perfDump, perfMark } from "../utils/perf-trace.ts";

type WebHttp =
  & typeof import("../feature/render.ts")
  & typeof import("../feature/router.ts")
  & typeof import("../feature/server.ts")
  & typeof import("./app-render-pipeline.ts")
  & typeof import("./app-http-middlewares.ts");

type WebSsg =
  & typeof import("@dreamer/render")
  & typeof import("@dreamer/esbuild")
  & typeof import("../feature/render-utils.ts")
  & typeof import("../feature/load-route-module.ts")
  & typeof import("../feature/render.ts")
  & typeof import("../feature/router.ts");

type WebBuild = typeof import("../feature/build.ts");

/** HTTP / 渲染 / 实时通道：仅 web/api 启动路径加载，console 不进入此图。 */
async function loadWebHttp(): Promise<WebHttp> {
  const [
    renderMod,
    routerMod,
    serverMod,
    pipelineMod,
    httpMwMod,
  ] = await Promise.all([
    importLater<typeof import("../feature/render.ts")>(
      ["..", "feature", "render.ts"].join("/"),
      import.meta.url,
    ),
    importLater<typeof import("../feature/router.ts")>(
      ["..", "feature", "router.ts"].join("/"),
      import.meta.url,
    ),
    importLater<typeof import("../feature/server.ts")>(
      ["..", "feature", "server.ts"].join("/"),
      import.meta.url,
    ),
    importLater<typeof import("./app-render-pipeline.ts")>(
      [".", "app-render-pipeline.ts"].join("/"),
      import.meta.url,
    ),
    importLater<typeof import("./app-http-middlewares.ts")>(
      [".", "app-http-middlewares.ts"].join("/"),
      import.meta.url,
    ),
  ]);
  return {
    ...renderMod,
    ...routerMod,
    ...serverMod,
    ...pipelineMod,
    ...httpMwMod,
  };
}

/** build() 与 SSG 预渲染用到的重模块，按需加载。 */
async function loadWebBuild(): Promise<WebBuild> {
  return await importLater<typeof import("../feature/build.ts")>(
    ["..", "feature", "build.ts"].join("/"),
    import.meta.url,
  );
}

/** SSG 预渲染才需要的 render/router 图，--build 的 CSR/SSR 打包路径不预装。 */
async function loadWebSsg(): Promise<WebSsg> {
  const [renderPkg, esbuildMod, renderUtils, loadRoute, renderMod, routerMod] =
    await Promise.all([
      importLater<typeof import("@dreamer/render")>(
        ["@dreamer", "render"].join("/"),
        import.meta.url,
      ),
      importLater<typeof import("@dreamer/esbuild")>(
        ["@dreamer", "esbuild"].join("/"),
        import.meta.url,
      ),
      importLater<typeof import("../feature/render-utils.ts")>(
        ["..", "feature", "render-utils.ts"].join("/"),
        import.meta.url,
      ),
      importLater<typeof import("../feature/load-route-module.ts")>(
        ["..", "feature", "load-route-module.ts"].join("/"),
        import.meta.url,
      ),
      importLater<typeof import("../feature/render.ts")>(
        ["..", "feature", "render.ts"].join("/"),
        import.meta.url,
      ),
      importLater<typeof import("../feature/router.ts")>(
        ["..", "feature", "router.ts"].join("/"),
        import.meta.url,
      ),
    ]);
  return {
    ...renderPkg,
    ...esbuildMod,
    ...renderUtils,
    ...loadRoute,
    ...renderMod,
    ...routerMod,
  };
}

/**
 * App 类
 *
 * 框架的主入口，整合所有 @dreamer/* 库。
 *
 * 继承 EventEmitter，支持事件机制：
 * - app.on("event", handler) - 监听事件
 * - app.emit("event", ...args) - 触发事件
 * - app.once("event", handler) - 监听一次性事件
 * - app.off("event", handler) - 移除事件监听
 *
 * 内置事件：
 * - "init" - 应用初始化完成
 * - "start" - 应用启动
 * - "stop" - 应用停止
 * - "error" - 发生错误
 * - "build" - 构建完成
 *
 * @example
 * ```ts
 * const app = new App({ name: "my-app", version: "1.0.0" });
 * app.use(myMiddleware);
 * app.registerPlugin(myPlugin);
 * app.on("start", () => console.log("started"));
 * await app.start();
 * ```
 */
export class App extends EventEmitter implements IApp {
  /** 应用名称 */
  readonly name: string;
  /** 应用版本 */
  readonly version: string;
  /** 服务容器 */
  readonly container: ServiceContainer;
  /** 信号处理器（用于优雅关闭） */
  private signalHandlers: Map<string, SignalHandler> = new Map();
  /** 生命周期监听器（用于清理） */
  private lifecycleListeners: Array<{
    stage: LifecycleStage;
    hook: LifecycleHook;
  }> = [];
  /** 是否正在关闭（防止重复处理） */
  private isShuttingDown = false;
  /** 初始化 Promise（用于等待异步初始化完成） */
  private _initPromise: Promise<void>;
  /** 初始化完成标志 */
  private _initialized = false;
  /** 待注册的中间件队列（初始化前缓存） */
  private _pendingMiddlewares: Array<{
    middlewareOrPath: AppMiddleware | string;
    conditionOrMiddleware?: unknown | AppMiddleware;
    name?: string;
  }> = [];
  /** 待注册的插件队列（初始化前缓存） */
  private _pendingPlugins: AppPlugin[] = [];
  /** 待注册的生命周期钩子队列（初始化前缓存） */
  private _pendingHooks: Array<{ stage: AppStage; hook: AppLifecycleHook }> =
    [];
  /** 显式配置目录（CLI console 模式：入口非 main.ts） */
  private _configDirectories?: string[];
  /** 是否以 console 模式运行（不 listen / 强制关闭 hotReload） */
  private _consoleMode = false;
  /** 本进程是否已加载客户端构建器（仅 dev 听口后）。生产 --start 为 false。 */
  private _clientBuilderLoaded = false;
  /** console.slim / DWEB_CONSOLE_SLIM：跳过 banner 与 HTTP 中间件管理器 */
  private _consoleSlim = false;
  /** 来自已合并 config.middlewares 的 Console 中间件 */
  private _configConsoleMiddlewares: ConsoleAppMiddleware[] = [];
  /** 来自 console/main.ts 中 app.use() 的 Console 中间件 */
  private _entryConsoleMiddlewares: ConsoleAppMiddleware[] = [];
  /** start() 已完成（允许入口未调用 start，由 dweb-cli run 再调一次） */
  private _started = false;
  /** 当前生命周期阶段 */
  get stage(): AppStage {
    try {
      const lifecycleManager = getLifecycleManager(this.container);
      return lifecycleManager.getStage() as AppStage;
    } catch {
      // 初始化未完成时返回 "uninitialized"
      return "uninitialized";
    }
  }

  /**
   * 创建 App 实例
   *
   * @param config 应用配置（可选，从 config/main.ts 加载后合并）
   * @param options 可选；`configDirectories` 供 `dweb-cli run` 显式指定配置目录
   */
  constructor(config: AppConfig = {}, options?: AppConstructOptions) {
    // 调用 EventEmitter 构造函数
    super();
    perfMark("app_construct");

    this._configDirectories = options?.configDirectories;
    if (options?.mode === "console" || isConsoleKind(config)) {
      this._consoleMode = true;
    }

    // 自动设置 RUNTIME_ENV，无需用户手动配置（与 deno task 中 --dev/--build/--start 及 dweb-cli 注入一致）
    // 判断逻辑：
    // 0. 若已设置 RUNTIME_ENV（如 dweb-cli spawn 已注入），则不覆盖
    // 1. --build：构建阶段 → build
    // 2. __DWEB_PROD__：编译产物运行（builder-server / Bun 注入）→ start
    // 3. --start：显式生产启动（如 dist/server.js --start）→ start
    // 4. --dev：显式开发 → dev
    // 5. 其余默认 → dev
    // 直接调用 args() 而不是 this._isBuildMode()，因为此时实例还未完全初始化
    const existingRuntimeEnv = getEnv("RUNTIME_ENV");
    if (!existingRuntimeEnv) {
      const argv = args();
      const buildFlag = argv.includes("--build");
      const startFlag = argv.includes("--start");
      const devFlag = argv.includes("--dev");
      if (buildFlag) {
        setEnv("RUNTIME_ENV", "build");
      } else if ("__DWEB_PROD__" in globalThis) {
        setEnv("RUNTIME_ENV", "start");
      } else if (startFlag) {
        setEnv("RUNTIME_ENV", "start");
      } else if (devFlag) {
        setEnv("RUNTIME_ENV", "dev");
      } else {
        setEnv("RUNTIME_ENV", "dev");
      }
    }

    // 从配置中获取应用名称和版本
    this.name = config.name || "dweb-app";
    this.version = config.version || "1.0.0";

    // 初始化服务容器（必须最先初始化）
    this.container = initializeServiceContainer();

    // 将 App 实例注册到容器中（便于其他服务获取）
    this.container.registerSingleton("app", () => this);

    // 异步初始化配置和服务，保存 Promise 以便 start() 等待
    this._initPromise = this._initializeConfig(config).catch((error) => {
      // 如果 logger 还未初始化，使用 console 作为后备
      const msg = $tr("log.configInitFailed");
      try {
        const logger = getLogger(this.container);
        logger.error(`${msg}:`, error);
      } catch {
        console.error(`${msg}:`, error);
      }
      throw error;
    });
  }

  /**
   * 打印框架版本与应用名称（启动时便于识别运行环境）
   *
   * 框架版本：从 utils/version.ts 的 getDwebVersion() 读取 dweb deno.json
   * 应用名称：从 AppConfig.name 读取（config/main.ts 等）
   *
   * 依赖：需在 initializeLogger 之后调用，否则容器中尚无 logger 会抛错
   */
  private async _logFrameworkBanner(config: AppConfig): Promise<void> {
    const logger = getLogger(this.container);
    const version = await getDwebVersion();
    logger.info($tr("log.frameworkVersion", { version }));
    logger.info($tr("log.appName", {
      name: config.name ?? $tr("log.appNameNotConfigured"),
    }));
  }

  /**
   * 初始化配置
   *
   * 从配置目录动态加载 main.ts、params.ts（本地配置文件，不会触发依赖下载）。
   * 入口文件传入的 config 会与加载的配置深度合并，优先级最高。
   *
   * @param config 应用配置（或覆盖项）
   */
  private async _initializeConfig(config: AppConfig): Promise<void> {
    perfMark("app_config_start");
    // 配置目录：显式传入（dweb-cli run）优先；否则从入口路径推断；再失败用默认
    let directories: string[] | undefined = this._configDirectories;
    if (!directories) {
      try {
        const configDir = inferConfigDirectoryFromEntry();
        directories = [configDir];
      } catch {
        directories = undefined; // 测试等场景下使用 initializeConfigManager 默认值
      }
    }

    const wantConsole = this._consoleMode || isConsoleKind(config);
    await initializeConfigManager(this.container, {
      directories,
      envPrefix: config.envPrefix,
      // console：禁止 hotReload 文件监听，否则 CLI 进程无法退出
      hotReload: wantConsole ? false : config.hotReload,
    });

    // 获取已加载的配置
    // 配置加载优先级（从低到高）：
    // 1. common/config/main.ts（公共框架配置）
    // 2. 应用/config/main.ts（应用框架配置）
    // 3. 入口文件 main.ts 传入的 config（最高优先级）
    const loadedConfig = getConfig(this.container);

    // 深度合并用户提供的配置（入口文件配置优先级最高）
    // 使用深度合并，对 plugins 和 middlewares 数组进行特殊处理
    const mergedConfig = deepMergeConfig(loadedConfig, config) as AppConfig;

    // console：即使 common 泄漏了 server/render，也不得 listen / 构建客户端
    if (wantConsole || isConsoleKind(mergedConfig)) {
      this._consoleMode = true;
      delete mergedConfig.server;
      mergedConfig.hotReload = false;
      if (mergedConfig.kind == null) {
        mergedConfig.kind = "console";
      }
    }

    // console 冷启动精简：仅 console 模式；env DWEB_CONSOLE_SLIM 覆盖 console.slim
    this._consoleSlim = this._consoleMode &&
      resolveConsoleSlim(mergedConfig, getEnv("DWEB_CONSOLE_SLIM"));
    if (this._consoleSlim) {
      mergedConfig.console = { ...mergedConfig.console, slim: true };
    }

    // 验证合并后的配置（自动验证，确保配置正确性）
    validateConfig(mergedConfig);

    // 开发态缓存选项：由 config.build.devCache 覆盖默认值（路由/CSS 缓存、模块版本 map）
    const devCache = (mergedConfig.build as {
      devCache?: {
        maxCssRouteCacheSize?: number;
        maxVersionMapSize?: number;
        evictionBatchInterval?: number;
      };
    } | undefined)?.devCache;
    if (devCache) setCacheOptions(devCache);

    // 重新注册配置到服务容器（先移除旧的，再注册新的）
    try {
      this.container.remove("config");
    } catch {
      // 如果服务不存在，忽略错误
    }
    this.container.registerSingleton("config", () => mergedConfig);

    // 初始化日志服务（依赖配置）
    perfMark("app_config_merged");
    // 与后续插件/路由中间件初始化并行装 HTTP 图，缩短听口前的串行等待
    let webHttpGraph: Promise<WebHttp> | undefined;
    if (
      mergedConfig.server && !this._consoleMode && !this._isBuildMode()
    ) {
      perfMark("app_http_graph_start");
      webHttpGraph = loadWebHttp();
    }
    initializeLogger(this.container, mergedConfig);

    if (!this._consoleSlim) {
      await this._logFrameworkBanner(mergedConfig);
    }

    // 初始化生命周期管理器（所有模式都需要；slim 仍保留以便 DB/插件钩子）
    initializeLifecycle(this.container, mergedConfig);

    // 初始化中间件系统（依赖配置和日志）。
    // console slim：跳过 HTTP 中间件管理器（CLI 用 console/middlewares，不走此链）
    if (!this._consoleSlim) {
      initializeMiddleware(this.container, mergedConfig);
    }

    // 初始化插件系统（依赖配置）
    initializePlugin(this.container, mergedConfig.pluginManagerOptions);

    // 数据库是插件和实时通道的基础：先创建管理器并立即连接。
    // 构建模式跳过连库，避免打包时要求活库。
    if (mergedConfig.database) {
      // 无数据库配置时不要把 @dreamer/database（含驱动）装进启动图
      const db = await importLater<typeof import("./database.ts")>(
        [".", "database.ts"].join("/"),
        import.meta.url,
      );
      db.initializeDatabase(this.container, mergedConfig);
      if (!this._isBuildMode()) {
        await db.connectDatabases(this.container, mergedConfig);
      }

      const lifecycleManager = getLifecycleManager(this.container);
      const dbStoppingHook: LifecycleHook = async () => {
        const { disconnectDatabases } = await importLater<
          typeof import("./database.ts")
        >([".", "database.ts"].join("/"), import.meta.url);
        await disconnectDatabases(this.container);
      };
      lifecycleManager.on("stopping", dbStoppingHook);
      this.lifecycleListeners.push({ stage: "stopping", hook: dbStoppingHook });
    }

    // Socket 在插件之前初始化（此时尚未 listen；HTTP 挂载仍在 server 就绪后）。
    // --build 不听口，不必装实时通道。
    if (mergedConfig.server && !this._consoleMode && !this._isBuildMode()) {
      await this._initializeRealtime(mergedConfig);
    }

    // 再按配置顺序注册插件并触发 onInit，之后才初始化服务器/构建 client
    // （以便 getHmrCssEntries 等能读到 tailwindConfig 等）
    perfMark("app_plugins_register");
    await this._registerPluginsFromConfig(mergedConfig);
    perfMark("app_plugins_ready");
    if (this._consoleMode) {
      // kind=console：config.middlewares 走命令管道，不注册到 HTTP 中间件管理器
      this._configConsoleMiddlewares = await resolveConfigConsoleMiddlewares(
        mergedConfig,
      );
    } else {
      await this._registerMiddlewaresFromConfig(mergedConfig);
    }
    // console 无 HTTP：跳过 routes 嵌套中间件（避免无 router 时的无用注册）
    if (!this._consoleMode) {
      await this._registerRoutesMiddleware(mergedConfig);
    }
    this._initialized = true;
    if (this._consoleMode) {
      for (const pending of this._pendingMiddlewares) {
        this._registerEntryConsoleMiddleware(pending);
      }
    } else {
      for (const pending of this._pendingMiddlewares) {
        this.use(
          pending.middlewareOrPath as AppMiddleware,
          pending.conditionOrMiddleware,
          pending.name,
        );
      }
    }
    this._pendingMiddlewares = [];
    for (const plugin of this._pendingPlugins) {
      await this.registerPlugin(plugin);
    }
    this._pendingPlugins = [];
    for (const pending of this._pendingHooks) {
      this.onLifecycle(pending.stage, pending.hook);
    }
    this._pendingHooks = [];
    await pluginEvents.emitOnInit(this.container);
    this.emit("init");
    perfMark("app_init_emitted");

    // 初始化服务器（依赖配置和日志）；console 模式不 listen。
    // --build 只打包，不听口、不跑 dev 渲染管道，避免再装 HTTP/socket 图。
    if (
      mergedConfig.server && !this._consoleMode && !this._isBuildMode()
    ) {
      const web = await (webHttpGraph ?? loadWebHttp());
      const apiApp = isApiKind(mergedConfig);
      perfMark("app_http_init");
      // 路由始终需要；纯 API 跳过渲染引擎（无 HTML 壳 / 无客户端包）
      if (!apiApp) {
        web.initializeRender(this.container, mergedConfig);
        perfMark("app_render_ready");
      }
      await web.initializeRouter(this.container, mergedConfig);
      perfMark("app_router_ready");

      // 初始化服务器
      web.initializeServer(this.container, mergedConfig);
      perfMark("app_server_ready");

      // 注册客户端资源目录（多应用时为 dist/<appDir>/client/assets），供 Tailwind 等插件在生产模式解析带 hash 的 CSS 路径
      if (!apiApp) {
        const clientOutputDirForAssets = getClientOutputDir(mergedConfig);
        const clientAssetsDirPath = join(
          cwd(),
          clientOutputDirForAssets,
          "assets",
        );
        if (!this.container.has("clientAssetsDir")) {
          this.container.registerSingleton(
            "clientAssetsDir",
            () => clientAssetsDirPath,
          );
        }
      }

      const server = web.getServer(this.container);
      const router = web.getRouter(this.container);

      const serverCfgForLog = (mergedConfig.server || {}) as { mode?: string };
      /** 仅 RUNTIME_ENV=dev 视为本地开发请求（禁用缓存等）；build/start 或 unset 均不走 dev 缓存策略 */
      const rt = getEnv("RUNTIME_ENV");
      const isRuntimeDev = rt === "dev";
      const serverModeOverride = serverCfgForLog.mode;
      const useDetailedRequestLog = serverModeOverride === "prod" ||
        rt === "start" ||
        rt === "build";

      // 框架默认 HTTP 中间件栈（dev 禁用缓存、安全头、可选 cors/压缩/限流、requestId、session、/health）
      perfMark("app_http_middlewares");
      web.registerFrameworkHttpMiddlewares(
        server,
        mergedConfig,
        this.container,
        {
          isRuntimeDev,
          useDetailedRequestLog,
        },
      );
      perfMark("app_http_middlewares_done");

      // 可选 @dreamer/upload@^2（AppConfig.upload）；未配置不装 upload 图
      if (mergedConfig.upload) {
        const upload = await importLater<typeof import("../feature/upload.ts")>(
          ["..", "feature", "upload.ts"].join("/"),
          import.meta.url,
        );
        await upload.registerUploadIntegration(
          server,
          this.container,
          mergedConfig,
        );
      }
      perfMark("app_upload_done");

      // socket 图仅在配置了 adapter 时加载（官方示例无实时通道）
      const socketAdapter =
        (mergedConfig.socket as { adapter?: string } | undefined)?.adapter;
      if (isSocketIOAdapter(socketAdapter)) {
        const socket = await importLater<
          typeof import("../feature/socket-io.ts")
        >(["..", "feature", "socket-io.ts"].join("/"), import.meta.url);
        const socketIoPath = socket.getSocketIoPath(this.container);
        if (socketIoPath) {
          server.use(
            socket.createSocketIoMiddleware(this.container),
            socketIoPath,
            "socket-io",
          );
          if (!this._isBuildMode()) {
            getLogger(this.container).debug(
              $tr("log.socketIoMounted", { path: socketIoPath }),
            );
          }
        }
      } else if (socketAdapter === "websocket") {
        const ws = await importLater<typeof import("../feature/websocket.ts")>(
          ["..", "feature", "websocket.ts"].join("/"),
          import.meta.url,
        );
        const websocketPath = ws.getWebSocketPath(this.container);
        if (websocketPath) {
          ws.registerWebSocketUpgrade(this.container, server);
          if (!this._isBuildMode()) {
            getLogger(this.container).debug(
              $tr("log.websocketMounted", { path: websocketPath }),
            );
          }
        }
      }

      // 将配置中注册的中间件（含 routes/_middleware.ts）应用到 HTTP 服务器，先于路由执行
      for (const reg of getServerMiddlewares(this.container)) {
        server.use(
          reg.middleware as Parameters<typeof server.use>[0],
          reg.condition as Parameters<typeof server.use>[1],
          reg.name,
        );
      }

      // 将路由集成到服务器，并把 dweb App 与服务容器注入 API 上下文。
      // 说明：extendApiContext 由新版 @dreamer/server 支持；类型交叉可兼容旧类型声明。
      type DwebRouterOptions =
        & NonNullable<
          Parameters<typeof server.useRouter>[1]
        >
        & {
          extendApiContext: () => Record<string, unknown>;
        };
      const routerOptions: DwebRouterOptions = {
        extendApiContext: () => ({
          app: this,
          container: this.container,
        }),
      };
      // onRequest must run before the router; onResponse still runs after next().
      server.use(pluginEventsMiddleware(this.container));
      server.useRouter(router, routerOptions);

      // 纯 API：不挂 HTML 渲染器、不构建/托管客户端脚本
      if (!apiApp) {
        perfMark("app_render_pipeline");
        await web.registerAppRenderPipeline(server, {
          container: this.container,
          router,
          config: mergedConfig,
          isBuildMode: () => this._isBuildMode(),
          deferEnsureClientBuild: true,
        });
        perfMark("app_render_pipeline_done");
      }

      // 注册生命周期钩子，在启动阶段启动服务器
      const lifecycleManager = getLifecycleManager(this.container);
      const serverStartedHook: LifecycleHook = async () => {
        perfMark("app_listen");
        await web.startServer(this.container);
        perfMark("app_listen_done");
        // 仅 dev 在听口后初始化 Builder / 客户端包；生产 --start 使用已构建资源，不再装 esbuild。
        if (getEnv("RUNTIME_ENV") === "dev") {
          const { initializeBuild } = await importLater<
            typeof import("../feature/build.ts")
          >(["..", "feature", "build.ts"].join("/"), import.meta.url);
          initializeBuild(this.container, mergedConfig);
          this._clientBuilderLoaded = true;
          perfMark("app_build_service_ready");
          if (!apiApp) {
            await web.finishDeferredClientBuild({
              container: this.container,
              router,
              config: mergedConfig,
              isBuildMode: () => this._isBuildMode(),
            });
            perfMark("app_client_build_done");
          }
        }
      };
      lifecycleManager.on("started", serverStartedHook);
      this.lifecycleListeners.push({
        stage: "started",
        hook: serverStartedHook,
      });
      perfMark("app_http_hooks_ready");
    }
    perfMark("app_config_done");
  }

  /**
   * 按约定注册 routes 下嵌套 _middleware.ts 链（根 + 子目录，从外到内执行）
   *
   * 实际模块在请求时由 Router 扫描结果动态加载，与嵌套 _layout 行为一致。
   *
   * @param _config 应用配置（保留参数以兼容调用方）
   */
  private async _registerRoutesMiddleware(_config: AppConfig): Promise<void> {
    const { createNestedRoutesMiddleware } = await importLater<
      typeof import("../feature/routes-middleware.ts")
    >(["..", "feature", "routes-middleware.ts"].join("/"), import.meta.url);
    registerMiddleware(
      this.container,
      createNestedRoutesMiddleware(this.container) as Middleware<
        MiddlewareContext
      >,
      undefined,
      "routes-middleware",
    );
  }

  /**
   * 从配置中注册插件
   *
   * @param config 应用配置
   */
  /**
   * 按 config.socket.adapter 初始化实时通信（socketio | websocket）。
   * 只创建服务实例并写入容器，不 listen；插件 onInit 之后再挂到 HTTP 服务器。
   */
  private async _initializeRealtime(config: AppConfig): Promise<void> {
    const socketConfig = config.socket as { adapter?: string } | undefined;
    const socketPluginHandlers = {
      onConnection: (ctx: SocketContext) =>
        pluginEvents.emitOnSocket(this.container, ctx),
      onDisconnect: (ctx: SocketContext) =>
        pluginEvents.emitOnSocketClose(this.container, ctx),
    };
    if (isSocketIOAdapter(socketConfig?.adapter)) {
      const { initializeSocketIo } = await importLater<
        typeof import("../feature/socket-io.ts")
      >(["..", "feature", "socket-io.ts"].join("/"), import.meta.url);
      initializeSocketIo(this.container, config, socketPluginHandlers);
    } else if (socketConfig?.adapter === "websocket") {
      const { initializeWebSocket } = await importLater<
        typeof import("../feature/websocket.ts")
      >(["..", "feature", "websocket.ts"].join("/"), import.meta.url);
      initializeWebSocket(this.container, config, socketPluginHandlers);
    }
  }

  private async _registerPluginsFromConfig(config: AppConfig): Promise<void> {
    const plugins = config.plugins;
    if (!plugins || plugins.length === 0) {
      return;
    }

    const pluginManager = getPluginManager(this.container);

    for (const plugin of plugins) {
      if (typeof plugin === "string") {
        // 如果是字符串，则作为文件路径加载（校验路径必须在项目目录内）
        try {
          const resolvedPath = plugin.startsWith("file://")
            ? plugin.slice(7)
            : await realPath(resolve(plugin));
          if (!isPathWithinProject(resolvedPath)) {
            throwDwebError(DwebErrorCode.MIDDLEWARE_LOAD_FAILED, {
              path: plugin,
              message: $tr("log.pathMustBeInProject"),
            });
          }
        } catch (e) {
          if (e && typeof e === "object" && "code" in e) throw e;
          // realPath 失败（文件不存在等）交给 loadFromFile 处理
        }
        await pluginManager.loadFromFile(plugin);
      } else {
        // 如果是插件对象，注册并激活
        pluginManager.register(plugin);
        await pluginManager.install(plugin.name);
        await pluginManager.activate(plugin.name);
      }
    }
  }

  /**
   * 从配置中注册中间件
   *
   * @param config 应用配置
   */
  private async _registerMiddlewaresFromConfig(
    config: AppConfig,
  ): Promise<void> {
    const middlewares = config.middlewares;
    if (!middlewares || middlewares.length === 0) {
      return;
    }

    for (const middlewareConfig of middlewares) {
      if (typeof middlewareConfig === "string") {
        // 如果是字符串，则作为文件路径加载
        const middleware = await this._loadMiddlewareFromFile(middlewareConfig);
        registerMiddleware(this.container, middleware);
      } else if (typeof middlewareConfig === "function") {
        // 如果是中间件函数，直接注册（此路径仅 HTTP；console 已在上游分流）
        registerMiddleware(
          this.container,
          middlewareConfig as Middleware<MiddlewareContext>,
        );
      } else if (
        typeof middlewareConfig === "object" &&
        "middleware" in middlewareConfig
      ) {
        // 如果是带条件的中间件对象
        let middleware: Middleware<MiddlewareContext>;
        if (typeof middlewareConfig.middleware === "string") {
          // 中间件是文件路径
          middleware = await this._loadMiddlewareFromFile(
            middlewareConfig.middleware,
          );
        } else {
          // 中间件是函数（此路径仅 HTTP）
          middleware = middlewareConfig.middleware as Middleware<
            MiddlewareContext
          >;
        }
        registerMiddleware(
          this.container,
          middleware,
          middlewareConfig.condition,
          middlewareConfig.name,
        );
      }
    }
  }

  /**
   * 从文件加载中间件
   *
   * @param path 中间件文件路径（相对 cwd 或绝对路径）
   * @returns 中间件函数
   */
  private async _loadMiddlewareFromFile(
    path: string,
  ): Promise<Middleware<MiddlewareContext>> {
    try {
      // 解析为绝对路径并用 file:// 加载，确保从项目根目录正确导入
      const resolvedPath = path.startsWith("file://")
        ? path.slice(7)
        : await realPath(resolve(path));
      if (!isPathWithinProject(resolvedPath)) {
        throwDwebError(DwebErrorCode.MIDDLEWARE_LOAD_FAILED, {
          path,
          message: $tr("log.pathMustBeInProject"),
        });
      }
      // 使用 pathToFileURL 正确编码路径中的特殊字符（空格、#、? 等），避免 import 异常
      const moduleUrl = pathToFileURL(resolvedPath).href;
      const module = await import(moduleUrl);

      // 尝试获取中间件函数
      // 支持 export default 或命名导出 export const middleware
      let middleware: Middleware<MiddlewareContext> | undefined;

      if (module.default) {
        middleware = module.default;
      } else if (module.middleware) {
        middleware = module.middleware;
      } else {
        // 尝试查找符合 Middleware 接口的函数
        for (const key of Object.keys(module)) {
          const value = module[key];
          if (typeof value === "function") {
            middleware = value as Middleware<MiddlewareContext>;
            break;
          }
        }
      }

      if (!middleware) {
        throwDwebError(DwebErrorCode.MIDDLEWARE_FILE_NO_EXPORT, { path });
      }

      return middleware;
    } catch (error) {
      throwDwebError(DwebErrorCode.MIDDLEWARE_LOAD_FAILED, {
        path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 注册中间件
   *
   * @param middleware 中间件函数或路径
   * @param conditionOrMiddleware 匹配条件或中间件函数
   * @param name 中间件名称（可选）
   */
  use(
    middleware: AppMiddleware | ConsoleAppMiddleware,
    condition?: unknown,
    name?: string,
  ): void;
  use(
    path: string,
    middleware: AppMiddleware,
    name?: string,
  ): void;
  use(
    middlewareOrPath: AppMiddleware | ConsoleAppMiddleware | string,
    conditionOrMiddleware?: unknown | AppMiddleware,
    name?: string,
  ): void {
    // 如果初始化未完成，缓存调用
    if (!this._initialized) {
      this._pendingMiddlewares.push({
        middlewareOrPath: middlewareOrPath as AppMiddleware | string,
        conditionOrMiddleware,
        name,
      });
      return;
    }

    if (this._consoleMode) {
      this._registerEntryConsoleMiddleware({
        middlewareOrPath: middlewareOrPath as AppMiddleware | string,
        conditionOrMiddleware,
        name,
      });
      return;
    }

    if (typeof middlewareOrPath === "string") {
      // use(path, middleware, name?)
      const middleware = conditionOrMiddleware as AppMiddleware;
      registerMiddleware(
        this.container,
        middleware,
        { path: middlewareOrPath },
        name,
      );
    } else {
      // use(middleware, condition?, name?)
      const middleware = middlewareOrPath as AppMiddleware;
      registerMiddleware(
        this.container,
        middleware,
        conditionOrMiddleware,
        name,
      );
    }
  }

  /**
   * 将入口 `app.use()` 登记为 Console 中间件（仅 kind=console）。
   * 仅支持函数；文件路径请写在 config.middlewares 或在入口 import 后再 use。
   */
  private _registerEntryConsoleMiddleware(pending: {
    middlewareOrPath: AppMiddleware | string;
    conditionOrMiddleware?: unknown | AppMiddleware;
    name?: string;
  }): void {
    const fn = typeof pending.middlewareOrPath === "function"
      ? pending.middlewareOrPath
      : undefined;
    if (typeof fn === "function") {
      this._entryConsoleMiddlewares.push(fn as unknown as ConsoleAppMiddleware);
    }
  }

  /** 配置层 Console 中间件（已解析为函数，按合并后的 config 顺序） */
  getConfigConsoleMiddlewares(): ConsoleAppMiddleware[] {
    return [...this._configConsoleMiddlewares];
  }

  /** 入口 `app.use()` 注册的 Console 中间件 */
  getEntryConsoleMiddlewares(): ConsoleAppMiddleware[] {
    return [...this._entryConsoleMiddlewares];
  }

  /**
   * 注册插件
   *
   * @param plugin 插件对象
   */
  async registerPlugin(plugin: AppPlugin): Promise<void> {
    // 如果初始化未完成，缓存调用
    if (!this._initialized) {
      this._pendingPlugins.push(plugin);
      return;
    }
    await registerPlugin(this.container, plugin);
  }

  /**
   * 注册生命周期钩子
   *
   * @param stage 生命周期阶段（如 "starting"、"running"、"stopping" 等）
   * @param hook 钩子函数
   *
   * @example
   * ```typescript
   * app.onLifecycle("starting", () => {
   *   console.log("应用正在启动...");
   * });
   *
   * app.onLifecycle("running", () => {
   *   console.log("应用已运行");
   * });
   * ```
   */
  onLifecycle(stage: AppStage, hook: AppLifecycleHook): void {
    // 如果初始化未完成，缓存调用
    if (!this._initialized) {
      this._pendingHooks.push({ stage, hook });
      return;
    }
    const lifecycleManager = getLifecycleManager(this.container);
    lifecycleManager.on(stage as LifecycleStage, hook);
  }

  /**
   * 检测是否为 build 模式（命令行参数 --build）
   */
  private _isBuildMode(): boolean {
    return args().includes("--build");
  }

  /**
   * 启动应用
   *
   * 自动检测 --build 参数：
   * - 如果有 --build 参数，执行 build() 只构建不启动服务器
   * - 如果没有 --build 参数，正常启动服务器（console 模式不 listen）
   *
   * @param options `mode: "console"` 时跳过 HTTP；结束后调用方须 shutdown
   */
  async start(options?: AppStartOptions): Promise<void> {
    perfMark("app_start");
    if (options?.mode === "console") {
      this._consoleMode = true;
    }

    // 检测是否为 build 模式
    if (this._isBuildMode()) {
      await this.build();
      // 构建完成后显式退出，避免插件/监听器等未释放句柄导致进程卡住
      exit(0);
    }

    // 等待初始化完成（框架版本与应用名称已在 _initializeConfig 中首先打印）
    await this._initPromise;
    perfMark("app_start_init_waited");

    // 若配置最终解析为 console，与显式 mode 对齐
    try {
      if (isConsoleKind(getConfig(this.container))) {
        this._consoleMode = true;
      }
    } catch {
      // config 可能尚未就绪（极少见）
    }

    // 入口不必调用 start()；dweb-cli run 会再调一次，避免重复生命周期
    if (this._started) {
      return;
    }

    const lifecycleManager = getLifecycleManager(this.container);

    // 初始化应用
    await lifecycleManager.initialize();
    perfMark("app_lifecycle_initialized");

    // 信号监听：slim console 由 run.ts 显式 stop/shutdown，跳过装饰性注册
    if (!this._consoleSlim) {
      this._setupSignalHandlers();
    }

    // 触发 onStart 事件（应用启动时）
    await pluginEvents.emitOnStart(this.container);

    // 触发 EventEmitter 事件
    this.emit("start");
    perfMark("app_on_start_emitted");

    // 启动应用（HTTP listen 仅在非 console 且已挂 server hook 时发生）
    await lifecycleManager.start();
    this._started = true;
    perfMark("app_started");
    if (!this._consoleMode) {
      perfDump("app-start");
    }
  }

  /** 是否以 console（CLI）模式运行 */
  isConsoleMode(): boolean {
    return this._consoleMode;
  }

  /** console 冷启动精简是否生效（`console.slim` / `DWEB_CONSOLE_SLIM`） */
  isConsoleSlim(): boolean {
    return this._consoleSlim;
  }

  /** 当前解析的应用种类（依赖已加载配置） */
  getKind(): ReturnType<typeof resolveAppKind> {
    try {
      return resolveAppKind(getConfig(this.container));
    } catch {
      return this._consoleMode ? "console" : "web";
    }
  }

  /**
   * 构建应用（只构建不启动服务器）
   *
   * 用于生产环境构建，会：
   * 1. 构建客户端脚本（代码分割、压缩）
   * 2. 构建服务端代码（编译为 JavaScript）
   * 3. 输出到 dist 目录
   *
   * 不会启动服务器，构建完成后自动退出
   */
  async build(): Promise<void> {
    perfMark("app_build_start");
    perfMark("app_build_web_graph");
    const build = await loadWebBuild();
    perfMark("app_build_web_graph_done");
    // 等待初始化完成（框架版本与应用名称已在 _initializeConfig 中首先打印）
    await this._initPromise;
    perfMark("app_build_init_waited");

    const logger = this._getLogger();
    const config = getConfig(this.container);

    logger.info($tr("log.buildStart"));

    // 获取构建配置，基础输出目录（多应用时按入口推断，如 dist/backend）
    const clientOutputDir = getClientOutputDir(config);

    // 供 CSS 插件在 onBuild 中推送 link 标签，用于 SSG 模板注入
    const pluginBuildCssLinks: string[] = [];
    if (!this.container.has("pluginBuildCssLinks")) {
      this.container.registerSingleton(
        "pluginBuildCssLinks",
        () => pluginBuildCssLinks,
      );
    }

    try {
      const apiApp = isApiKind(config);
      const resolvedBuildOpts = build.resolveAppBuildOptions(config);

      // 先清理输出目录，再跑 onBuild：避免 Tailwind 写入 CSS 后被 Builder.clean 删掉
      if (resolvedBuildOpts.clean) {
        logger.info($tr("clean.running"));
        perfMark("app_build_clean");
        const removed = await build.cleanBuildOutputDirs(config, logger);
        if (removed.length === 0) {
          logger.info($tr("clean.nothingToClean"));
        }
      }

      // 触发插件的 onBuild 钩子（Tailwind/UnoCSS 等会直接写入各自的 output 目录）
      perfMark("app_build_plugins");
      await pluginEvents.emitOnBuild(this.container, {
        mode: "prod",
        target: apiApp ? "server" : "client",
      });
      logger.info($tr("log.pluginBuildComplete"));
      perfMark("app_build_plugins_done");

      const renderMode = (config.render as { mode?: string })?.mode ?? "ssr";
      // 使用 @dreamer/esbuild 的 Builder 统一构建（服务端 + 客户端 + 资源）
      // SSR/SSG 也构建客户端，以便静态 HTML 可做客户端激活（事件响应）
      // 纯 API：只构建服务端，跳过客户端包
      // clean:false — 已在 onBuild 前清理，避免再次清空插件产物
      perfMark("app_build_esbuild");
      await build.runBuildWithBuilder(this.container, config, {
        skipClient: apiApp,
        clean: false,
      });
      perfMark("app_build_esbuild_done");

      // SSG 模式：预渲染静态 HTML 到 client 目录（与其它前端产物一致），start 时从该目录读取（在服务端构建之后执行，确保不被覆盖）
      if (!apiApp && renderMode === "ssg") {
        const ssg = await loadWebSsg();
        const web = { ...build, ...ssg };
        // --build 跳过了 HTTP init 时，补上预渲染所需的 router/render
        if (!this.container.has("render")) {
          web.initializeRender(this.container, config);
        }
        if (!this.container.has("router")) {
          await web.initializeRouter(this.container, config);
        }
        const router = web.getRouter(this.container);
        const renderService = web.getRender(this.container);
        const renderCfg = config.render as {
          debug?: boolean;
          engine?: "react" | "preact" | "view";
          ssg?: {
            outputDir?: string;
            routes?: string[];
            dynamicRoutes?: Record<string, string[]>;
            hydrate?: boolean;
          };
        };

        // 计算要预渲染的路径：优先用配置的 routes；否则展开 dynamicRoutes 并合并静态路由
        let routePaths: string[] = [];
        if (renderCfg.ssg?.routes && renderCfg.ssg.routes.length > 0) {
          routePaths = [...renderCfg.ssg.routes];
        } else {
          const allRoutes = router.getRoutes() as Array<{
            path: string;
            fullPath: string;
            isApi?: boolean;
            type?: string;
          }>;
          const staticRoutes = allRoutes.filter(
            (r) => !r.isApi && (r.type === "static" || !r.type),
          );
          routePaths = staticRoutes.map((r) => r.path);
        }
        // 展开 dynamicRoutes（如 { "/user/[id]": ["1","2","3"] }）
        const dynamicRoutes = renderCfg.ssg?.dynamicRoutes ?? {};
        for (const [pattern, params] of Object.entries(dynamicRoutes)) {
          const expanded = web.expandDynamicRoute(pattern, params);
          for (const p of expanded) {
            if (!routePaths.includes(p)) routePaths.push(p);
          }
        }

        if (routePaths.length === 0) {
          logger.warn($tr("log.ssgNoPaths"));
        } else {
          const ssgEngine = renderCfg.engine ?? "preact";
          const routerConfigSsg = (config.router || {}) as {
            routesDir?: string;
          };
          const routesDirSsg = routerConfigSsg.routesDir ?? "./src/routes";
          const ssgRoutesDirPath = resolveRouterRoutesDirPath(
            cwd(),
            routesDirSsg,
          );
          const ssgOutputDir = renderCfg.ssg?.outputDir ?? clientOutputDir;
          const absOutputDir = join(cwd(), ssgOutputDir);
          /** 按路径加载模块（支持 .ts/.tsx，用于 loadRouteComponent、loadRouteLayouts） */
          const loadModuleByPath = async (fullPath: string) => {
            const mod = await web.loadRouteModule(fullPath, {
              logger: this.container.has("logger")
                ? getLogger(this.container)
                : undefined,
              engine: ssgEngine,
              routesDirPath: ssgRoutesDirPath,
            });
            return mod?.default ?? mod?.Page ?? mod?.App ?? mod?.Layout ?? null;
          };

          /** 按路径加载页面组件（支持动态路由与 query 如 /user?id=1，通过 pathname 做 router.match） */
          const loadRouteComponent = async (routePath: string) => {
            const { pathname } = parseRoutePath(routePath);
            const match = await router.match(pathname);
            if (!match || match.isApi || !match.route?.fullPath) return null;
            return await loadModuleByPath(match.route.fullPath);
          };

          /** 加载路由数据（含 params；若 route 带 query 则附带 query 对象供页面使用） */
          const loadRouteData = async (
            routePath: string,
          ): Promise<Record<string, unknown>> => {
            const { pathname, search } = parseRoutePath(routePath);
            const match = await router.match(pathname);
            if (!match || match.isApi) return {};
            const data: Record<string, unknown> = { params: match.params };
            if (search) {
              data.query = Object.fromEntries(
                new URLSearchParams(search.slice(1)),
              );
            }
            return data;
          };

          /** 加载布局组件（_app -> 嵌套 _layout 链，从外到内，用于 SSG 预渲染） */
          const loadRouteLayouts = async (
            routePath: string,
          ): Promise<
            Array<{ component: unknown; props?: Record<string, unknown> }>
          > => {
            const layouts: Array<{
              component: unknown;
              props?: Record<string, unknown>;
            }> = [];
            const appPath = router.getSpecialFile("_app");
            if (appPath) {
              const AppComponent = await loadModuleByPath(appPath);
              if (AppComponent) layouts.push({ component: AppComponent });
            }
            const layoutPaths = router.getLayoutPathsForPath(routePath);
            const loadOpts = {
              logger: this.container.has("logger")
                ? getLogger(this.container)
                : undefined,
              engine: ssgEngine,
              routesDirPath: ssgRoutesDirPath,
            };
            const layoutModules = await Promise.all(
              layoutPaths.map((p) => web.loadRouteModule(p, loadOpts)),
            );
            const inheritBreakIndex = layoutModules.findIndex(
              (m) =>
                m && (m as Record<string, unknown>).inheritLayout === false,
            );
            const toUse = inheritBreakIndex >= 0
              ? layoutModules.slice(inheritBreakIndex)
              : layoutModules;
            for (const mod of toUse) {
              const LayoutComponent =
                (mod as Record<string, unknown>)?.default ??
                  (mod as Record<string, unknown>)?.Layout;
              if (LayoutComponent) layouts.push({ component: LayoutComponent });
            }
            return layouts;
          };
          // 使用插件在 onBuild 中推送的 link 标签，在 _app 输出的 </head> 前注入
          const cssLinks = this.container.tryGet<string[]>(
            "pluginBuildCssLinks",
          ) ?? [];
          const headInject = cssLinks.length > 0 ? cssLinks.join("\n") : "";

          const engine = ssgEngine;
          const cwdPath = cwd();

          /** 每生成一个 HTML 就立即输出日志，避免数据多时长时间无输出像卡住 */
          const onFileGenerated = (filePath: string) => {
            const rel = relative(cwdPath, filePath);
            logger.info(
              $tr("log.ssgFileGenerated", {
                path: rel.startsWith("..") ? filePath : rel,
              }),
            );
          };

          const ssgOptions: Parameters<typeof renderService.renderSSG>[0] = {
            engine,
            routes: routePaths,
            outputDir: absOutputDir,
            loadRouteComponent,
            loadRouteLayouts,
            loadRouteData,
            template: undefined, // 直接使用 _app 输出，不包 defaultTemplate
            headInject, // 在 _app 的 </head> 前注入 link 标签
            onFileGenerated,
            debug: renderCfg.debug === true,
          };
          await renderService.renderSSG(ssgOptions);

          // SSG 构建后：仅当 render.ssg.hydrate 不为 false 时，为每个预渲染 HTML 注入 hydration 与客户端脚本
          if (renderCfg.ssg?.hydrate !== false) {
            const routerConfig = (config.router || {}) as {
              routesDir?: string;
            };
            const routesDirPath = resolveRouterRoutesDirPath(
              cwd(),
              routerConfig.routesDir ?? "./src/routes",
            );
            const clientRoutes = web.collectClientRoutes(router, routesDirPath);
            const containerId = "app";
            const clientScript = "/_client.js";
            /** 递归收集目录下所有 .html 文件路径 */
            const collectHtmlFiles = async (dir: string): Promise<string[]> => {
              const entries = await readdir(dir);
              const results: string[] = [];
              for (const e of entries) {
                const full = join(dir, e.name);
                if (e.isDirectory) {
                  results.push(...(await collectHtmlFiles(full)));
                } else if (e.name.toLowerCase().endsWith(".html")) {
                  results.push(full);
                }
              }
              return results;
            };
            const htmlFiles = await collectHtmlFiles(absOutputDir);
            for (const filePath of htmlFiles) {
              const relPath = relative(absOutputDir, filePath).replace(
                /\\/g,
                "/",
              );
              const route = web.filePathToRoute(relPath);
              const { pathname } = parseRoutePath(route);
              const match = await router.match(pathname);
              if (!match || match.isApi) continue;
              const pageProps = await loadRouteData(route);
              const normalizedComponent = clientRouteComponentKey(
                match.route,
                routesDirPath,
              );
              /** 与预渲染页面对应的真实 pathname（去尾斜杠），供客户端与 location.pathname 比较以执行 hydrate */
              const hydrationPathname = pathname.replace(/\/$/, "") || "/";
              const hydrationData = {
                page: pageProps,
                route: match.route.path,
                pathname: hydrationPathname,
                params: match.params,
                query:
                  (pageProps?.query as Record<string, string> | undefined) ??
                    match.query ??
                    {},
                component: normalizedComponent,
              };
              const ssgRouterDebug =
                (config.router as { debug?: boolean } | undefined)?.debug ===
                  true;
              const bootstrapStatements: string[] = [
                `globalThis.__DATA__ = ${
                  serializeJsonForInlineScript(hydrationData)
                };`,
              ];
              if (ssgRouterDebug) {
                bootstrapStatements.push(
                  "globalThis.__DWEB_ROUTER_DEBUG__ = globalThis.__DWEB_ROUTER_DEBUG__ ?? true;",
                );
              }
              bootstrapStatements.push("globalThis.__DWEB_DEV__ = false;");
              bootstrapStatements.push(
                `globalThis.__DWEB_ROUTES__ = ${
                  serializeJsonForInlineScript(clientRoutes)
                };`,
              );
              bootstrapStatements.push(
                `globalThis.__DWEB_ENGINE__ = "${engine}";`,
              );
              bootstrapStatements.push(
                `globalThis.__DWEB_CONTAINER_ID__ = "${containerId}";`,
              );
              bootstrapStatements.push(`globalThis.__DWEB_MODE__ = "ssg";`);
              // SSG 产物始终按生产紧凑输出（无开发注释／换行）
              const bootstrapScript = web.wrapInlineClientBootstrapScript(
                bootstrapStatements,
                { isDev: false },
              );
              const clientConfigScript =
                `${bootstrapScript}<script type="module" src="${clientScript}"></script>`;
              let html = await readTextFile(filePath);
              if (!web.hasContainerElementInHtml(html, containerId)) {
                logger.warn(
                  `[dweb] SSG 文件 ${relPath} 未找到挂载容器，跳过 hydration 注入`,
                );
                continue;
              }
              if (html.includes("</body>")) {
                html = html.replace("</body>", `${clientConfigScript}</body>`);
              } else {
                html += clientConfigScript;
              }
              await writeTextFile(filePath, html);
            }
          }

          // SSG 模式：对输出目录运行资源处理（复制、压缩、hash、更新 HTML 中的路径）
          const assetsConfig = (config.build as { assets?: unknown })?.assets;
          if (assetsConfig && typeof assetsConfig === "object") {
            const processor = new web.AssetsProcessor(
              assetsConfig as ConstructorParameters<
                typeof web.AssetsProcessor
              >[0],
              absOutputDir,
            );
            await processor.processAssets();
          }
        }
      }

      logger.info($tr("log.buildComplete"));
      perfMark("app_build_complete");
      perfDump("app-build");

      // 触发 onBuildComplete 插件事件（构建全部完成后）
      await pluginEvents.emitOnBuildComplete(this.container, {});

      // 触发 EventEmitter 事件
      this.emit("build");
    } finally {
      // 无事件监听器需要移除
    }

    // 清理客户端脚本缓存（build 模式未使用增量 context，无需 disposeBuilder）
    await (await importLater<
      typeof import("../feature/csr-client-builder.ts")
    >(
      ["..", "feature", "csr-client-builder.ts"].join("/"),
      import.meta.url,
    ))
      .clearClientScriptCache();

    // 清理生命周期监听器（防止内存泄漏）
    this._removeLifecycleListeners();

    // 停止 ConfigManager 文件监听（build 模式不经历 shutdown，需单独清理）
    this._stopConfigWatching();

    // 构建模式不需要调用 shutdown()，直接退出
    // shutdown() 需要在 stopped 阶段调用，但 build 模式没有经历完整生命周期
  }

  /**
   * 获取日志实例（安全获取，如果未初始化则返回后备 logger）
   */
  private _getLogger() {
    try {
      return getLogger(this.container);
    } catch {
      // 如果 logger 未初始化，返回一个简单的后备 logger
      return {
        error: (...args: unknown[]) => console.error(...args),
        warn: (...args: unknown[]) => console.warn(...args),
        info: (...args: unknown[]) => console.log(...args),
        debug: (...args: unknown[]) => console.debug(...args),
      };
    }
  }

  /**
   * 设置信号处理器（优雅关闭）— 实现见 app-signals.ts
   */
  private _setupSignalHandlers(): void {
    this.signalHandlers = setupAppSignalHandlers(
      this._getLogger(),
      () => this.isShuttingDown,
      () => {
        this.isShuttingDown = true;
      },
      () => this.stop(),
      () => this.shutdown(),
    );
  }

  /**
   * 移除信号处理器
   */
  private _removeSignalHandlers(): void {
    removeAppSignalHandlers(this.signalHandlers);
  }

  /**
   * 停止 ConfigManager 的文件监听（hotReload 时创建，防止内存泄漏）
   */
  private _stopConfigWatching(): void {
    try {
      if (this.container.has("configManager")) {
        const configManager = getConfigManager(this.container);
        configManager.stopWatching();
      }
    } catch {
      // 配置管理器可能未初始化，忽略错误
    }
  }

  /**
   * 移除生命周期监听器（防止内存泄漏）
   */
  private _removeLifecycleListeners(): void {
    try {
      const lifecycleManager = getLifecycleManager(this.container);
      for (const { stage, hook } of this.lifecycleListeners) {
        lifecycleManager.off(stage, hook);
      }
    } catch {
      // 生命周期管理器可能未初始化，忽略错误
    }
    this.lifecycleListeners = [];
  }

  /**
   * 停止应用
   */
  async stop(): Promise<void> {
    // 触发 onStop 事件（应用停止时）
    await pluginEvents.emitOnStop(this.container);

    // 触发 EventEmitter 事件
    this.emit("stop");

    // 移除信号监听器（应用已停止，不再需要响应信号）
    this._removeSignalHandlers();

    const lifecycleManager = getLifecycleManager(this.container);
    await lifecycleManager.stop();
  }

  /**
   * 关闭应用
   */
  async shutdown(): Promise<void> {
    // 触发 onShutdown 事件（应用关闭时）
    await pluginEvents.emitOnShutdown(this.container);

    // 移除信号监听器
    this._removeSignalHandlers();

    // 移除生命周期监听器（防止内存泄漏）
    this._removeLifecycleListeners();

    // 停止 ConfigManager 的文件监听（hotReload 时创建，防止内存泄漏）
    this._stopConfigWatching();

    // 清理客户端脚本缓存并释放增量构建 context（防止内存泄漏）。
    // 仅当本进程确实加载过客户端构建器时才 import：console 与生产
    // --start 都不会装该图。否则 importLater 会按 import.meta.url 解析到
    // dist/server.js 旁边，变成应用目录下的 feature/csr-client-builder.ts。
    if (this._clientBuilderLoaded) {
      await (await importLater<
        typeof import("../feature/csr-client-builder.ts")
      >(
        ["..", "feature", "csr-client-builder.ts"].join("/"),
        import.meta.url,
      ))
        .clearClientScriptCache({
          disposeBuilder: true,
        });
    }

    const lifecycleManager = getLifecycleManager(this.container);
    await lifecycleManager.shutdown();
  }
}

/**
 * 从服务容器中获取 App 实例
 *
 * @param container 服务容器
 * @returns App 实例
 *
 * @example
 * ```typescript
 * const app = getApp(container);
 * app.on("custom-event", (data) => console.log(data));
 * ```
 */
export function getApp(container: ServiceContainer): App {
  return container.get<App>("app");
}
