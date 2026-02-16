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
  addSignalListener,
  args,
  cwd,
  exists,
  exit,
  getEnv,
  join,
  readdir,
  readTextFile,
  realPath,
  relative,
  removeSignalListener,
  resolve,
  setEnv,
  type SignalHandler,
  writeTextFile,
} from "./runtime-adapter.ts";

import { AssetsProcessor } from "@dreamer/esbuild";
import { requestId, requestLogger } from "@dreamer/middlewares";
import { expandDynamicRoute } from "@dreamer/render";
import { session } from "@dreamer/session";
import { initializeBuild, runBuildWithBuilder } from "../feature/build.ts";
import {
  buildClientScript,
  clearClientScriptCache,
  CLIENT_OUTPUT_MAIN_FILENAME,
  createClientScriptMiddleware,
  ensureClientEntryFile,
} from "../feature/csr-client-builder.ts";
import {
  createLoadDataMiddleware,
  DWEB_DATA_PATH,
} from "../feature/load-data-middleware.ts";
import { loadRouteModule } from "../feature/load-route-module.ts";
import { createRendererCSR } from "../feature/render-csr.ts";
import { createRendererHybrid } from "../feature/render-hybrid.ts";
import { createRendererSSG, fileToPathname } from "../feature/render-ssg.ts";
import { createRendererSSR } from "../feature/render-ssr.ts";
import {
  collectClientRoutes,
  hasContainerElementInHtml,
} from "../feature/render-utils.ts";
import { getRender, initializeRender } from "../feature/render.ts";
import { getRouter, initializeRouter } from "../feature/router.ts";
import { getServer, initializeServer, startServer } from "../feature/server.ts";
import {
  createSocketIoMiddleware,
  getSocketIoPath,
  initializeSocketIo,
} from "../feature/socket-io.ts";
import {
  createWebSocketMiddleware,
  getWebSocketPath,
  initializeWebSocket,
} from "../feature/websocket.ts";
import {
  type AppConfig,
  type AppLifecycleHook,
  type AppMiddleware,
  type AppPlugin,
  type AppStage,
  type IApp,
  isSocketIOAdapter,
} from "../types/app.ts";
import { getInferredBuildOutputDirs } from "../utils/build-dirs.ts";
import { DwebErrorCode, throwDwebError } from "../utils/errors.ts";
import { $t, initDwebI18n } from "../utils/i18n.ts";
import { getLogger, initializeLogger } from "../utils/logger.ts";
import {
  extractComponentPathFromRouteFile,
  isPathWithinProject,
} from "../utils/path.ts";
import { getDwebVersion } from "../utils/version.ts";
import {
  deepMergeConfig,
  getConfig,
  getConfigManager,
  inferConfigDirectoryFromEntry,
  initializeConfigManager,
  validateConfig,
} from "./config.ts";
import {
  connectDatabases,
  disconnectDatabases,
  initializeDatabase,
} from "./database.ts";
import { getLifecycleManager, initializeLifecycle } from "./lifecycle.ts";
import {
  createDevNoCacheMiddleware,
  createHealthCheckMiddleware,
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

await initDwebI18n();

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
   */
  constructor(config: AppConfig = {}) {
    // 调用 EventEmitter 构造函数
    super();

    // 自动设置环境变量，无需用户手动配置
    // 判断逻辑：
    // 1. --build 参数：设置 DENO_ENV=prod（构建模式）
    // 2. __DWEB_PROD__ 全局标志：说明是编译后的生产代码，保持 prod
    // 3. 其他情况：设置 DENO_ENV=dev（开发模式）
    // 直接调用 args() 而不是 this._isBuildMode()，因为此时实例还未完全初始化
    if (args().includes("--build")) {
      setEnv("DENO_ENV", "prod");
    } else if ("__DWEB_PROD__" in globalThis) {
      // 编译后的生产代码（由 builder-server 注入标志）
      setEnv("DENO_ENV", "prod");
    } else {
      // 开发模式
      setEnv("DENO_ENV", "dev");
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
      const msg = $t("log.configInitFailed");
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
    logger.info($t("log.frameworkVersion", { version }));
    logger.info($t("log.appName", {
      name: config.name ?? $t("log.appNameNotConfigured"),
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
    // 配置目录：从入口路径推断（src/main.ts → src/config 等），推断失败时用默认
    let configDir: string | undefined;
    try {
      configDir = inferConfigDirectoryFromEntry();
    } catch {
      configDir = undefined; // 测试等场景下使用 initializeConfigManager 默认值
    }
    await initializeConfigManager(this.container, {
      directories: configDir ? [configDir] : undefined,
      envPrefix: config.envPrefix,
      hotReload: config.hotReload,
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

    // 验证合并后的配置（自动验证，确保配置正确性）
    validateConfig(mergedConfig);

    // 重新注册配置到服务容器（先移除旧的，再注册新的）
    try {
      this.container.remove("config");
    } catch {
      // 如果服务不存在，忽略错误
    }
    this.container.registerSingleton("config", () => mergedConfig);

    // 初始化日志服务（依赖配置）
    initializeLogger(this.container, mergedConfig);

    await this._logFrameworkBanner(mergedConfig);

    // 初始化生命周期管理器（所有模式都需要）
    initializeLifecycle(this.container, mergedConfig);

    // 初始化中间件系统（依赖配置和日志）
    initializeMiddleware(this.container, mergedConfig);

    // 初始化插件系统（依赖配置）
    initializePlugin(this.container, mergedConfig.pluginManagerOptions);

    // 初始化数据库（如果配置了）
    if (mergedConfig.database) {
      initializeDatabase(this.container, mergedConfig);

      // 注册生命周期钩子，在启动阶段连接数据库
      const lifecycleManager = getLifecycleManager(this.container);
      const dbStartingHook: LifecycleHook = async () => {
        await connectDatabases(this.container, mergedConfig);
      };
      lifecycleManager.on("starting", dbStartingHook);
      this.lifecycleListeners.push({ stage: "starting", hook: dbStartingHook });

      // 注册生命周期钩子，在停止阶段断开数据库
      const dbStoppingHook: LifecycleHook = async () => {
        await disconnectDatabases(this.container);
      };
      lifecycleManager.on("stopping", dbStoppingHook);
      this.lifecycleListeners.push({ stage: "stopping", hook: dbStoppingHook });
    }

    // 先注册插件并触发 onInit，再初始化服务器/构建 client（以便 getHmrCssEntries 等能读到 tailwindConfig 等）
    await this._registerPluginsFromConfig(mergedConfig);
    await this._registerMiddlewaresFromConfig(mergedConfig);
    await this._registerRoutesMiddleware(mergedConfig);
    this._initialized = true;
    for (const pending of this._pendingMiddlewares) {
      this.use(
        pending.middlewareOrPath as AppMiddleware,
        pending.conditionOrMiddleware,
        pending.name,
      );
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

    // 初始化服务器（依赖配置和日志）
    if (mergedConfig.server) {
      // 初始化渲染和路由（服务器需要这些功能）
      initializeRender(this.container, mergedConfig);
      await initializeRouter(this.container, mergedConfig);
      initializeBuild(this.container, mergedConfig);

      // 初始化服务器
      initializeServer(this.container, mergedConfig);
      // 根据 config.socket.adapter 初始化实时通信（socketio | websocket）
      const socketConfig = mergedConfig.socket as
        | { adapter?: string }
        | undefined;
      const socketPluginHandlers = {
        onConnection: (ctx: SocketContext) =>
          pluginEvents.emitOnSocket(this.container, ctx),
        onDisconnect: (ctx: SocketContext) =>
          pluginEvents.emitOnSocketClose(this.container, ctx),
      };
      if (isSocketIOAdapter(socketConfig?.adapter)) {
        initializeSocketIo(this.container, mergedConfig, socketPluginHandlers);
      } else if (socketConfig?.adapter === "websocket") {
        initializeWebSocket(this.container, mergedConfig, socketPluginHandlers);
      }

      // 注册客户端资源目录（多应用时为 dist/<appDir>/client/assets），供 Tailwind 等插件在生产模式解析带 hash 的 CSS 路径
      const buildCfgForAssets = (mergedConfig.build || {}) as {
        client?: { output?: string };
      };
      const clientOutputDirForAssets = buildCfgForAssets.client?.output ??
        getInferredBuildOutputDirs().client;
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

      const server = getServer(this.container);
      const router = getRouter(this.container);

      const serverCfgForLog = (mergedConfig.server || {}) as { mode?: string };
      const envModeForLog = getEnv("DENO_ENV") || getEnv("BUN_ENV") ||
        getEnv("NODE_ENV") || "dev";
      const isProd = (serverCfgForLog.mode || envModeForLog) === "prod";

      // 开发模式：最先注册，在 next() 后统一为所有响应加上禁用缓存头，避免浏览器/代理缓存导致改代码不生效
      server.use(createDevNoCacheMiddleware(!isProd), undefined, "dev-no-cache");

      // 框架级中间件：Request ID、请求日志（先于用户中间件执行）
      server.use(requestId());
      server.use(
        requestLogger({
          logger: getLogger(this.container),
          skip: (ctx) => ctx.path.startsWith("/.well-known/"),
          detailed: isProd,
        }),
      );

      // Session 中间件（config.session 为 SessionOptions，store 由用户选用 @dreamer/session 的适配器）
      if (mergedConfig.session) {
        server.use(session(mergedConfig.session), undefined, "session");
      }

      // 内置健康检查：GET /health 触发 onHealthCheck 插件事件并返回聚合状态
      server.use(
        createHealthCheckMiddleware(this.container),
        "/health",
        "health-check",
      );

      // socket.adapter 为 socketio 时：路径前缀匹配委托给 Socket.IO 处理
      const socketIoPath = getSocketIoPath(this.container);
      if (socketIoPath) {
        server.use(
          createSocketIoMiddleware(this.container),
          socketIoPath,
          "socket-io",
        );
        if (!this._isBuildMode()) {
          getLogger(this.container).info(
            $t("log.socketIoMounted", { path: socketIoPath }),
          );
        }
      }

      // socket.adapter 为 websocket 时：路径前缀匹配委托给 WebSocket 处理
      const websocketPath = getWebSocketPath(this.container);
      if (websocketPath) {
        server.use(
          createWebSocketMiddleware(this.container),
          websocketPath,
          "websocket",
        );
        if (!this._isBuildMode()) {
          getLogger(this.container).info(
            $t("log.websocketMounted", { path: websocketPath }),
          );
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

      // 将路由集成到服务器
      server.useRouter(router);

      // 根据渲染模式选择渲染器
      const renderMode = (mergedConfig.render as { mode?: string })?.mode ||
        "ssr";
      const renderLogger = getLogger(this.container);

      if (renderMode === "csr") {
        // CSR 模式：返回 HTML 外壳 + 客户端脚本
        const csrRenderer = createRendererCSR(
          this.container,
          router,
          mergedConfig,
        );
        server.setSSRRender(csrRenderer);

        // 客户端页面切换时请求此接口获取该路由 load() 数据
        server.use(
          createLoadDataMiddleware(this.container, router, mergedConfig),
          DWEB_DATA_PATH,
          "load-data",
        );

        // 注册客户端脚本服务中间件（处理 /_client.js 请求）
        const clientScriptMiddleware = createClientScriptMiddleware(
          this.container,
          mergedConfig,
        );
        server.use(clientScriptMiddleware);

        // 获取运行模式
        const serverCfg = (mergedConfig.server || {}) as { mode?: string };
        const envMode = getEnv("DENO_ENV") || getEnv("BUN_ENV") ||
          getEnv("NODE_ENV") || "dev";
        const runMode = serverCfg.mode || envMode;
        const isProd = runMode === "prod";

        // 检查预构建文件是否存在；未配置时按当前入口推断应用目录（如 dist/backend/client）
        const buildCfg = (mergedConfig.build || {}) as {
          client?: { output?: string };
        };
        const clientOutputDir = buildCfg.client?.output ??
          getInferredBuildOutputDirs().client;
        const prebuiltClientPath = join(
          cwd(),
          clientOutputDir,
          CLIENT_OUTPUT_MAIN_FILENAME,
        );
        const hasPrebuiltClient = await exists(prebuiltClientPath);

        // 开发模式：始终生成 _client.tsx 并执行客户端构建（内存构建），保证 HMR 无感刷新可用
        // build 模式（--build）下不在此处构建，由 build() 统一构建，避免重复
        if (!isProd) {
          await ensureClientEntryFile(this.container, mergedConfig);
          if (!this._isBuildMode()) {
            await buildClientScript(this.container, mergedConfig);
          }
        } else if (!hasPrebuiltClient && !this._isBuildMode()) {
          await buildClientScript(this.container, mergedConfig);
        }

        if (!this._isBuildMode()) {
          renderLogger.info($t("log.renderModeCsr"));
        }
      } else if (renderMode === "hybrid") {
        // Hybrid 模式：服务端渲染完整 HTML + 客户端 hydrate
        const hybridRenderer = createRendererHybrid(
          this.container,
          router,
          mergedConfig,
        );
        server.setSSRRender(hybridRenderer);

        // 客户端页面切换时请求此接口获取该路由 load() 数据
        server.use(
          createLoadDataMiddleware(this.container, router, mergedConfig),
          DWEB_DATA_PATH,
          "load-data",
        );

        // 注册客户端脚本服务中间件（处理 /_client.js 请求）
        const clientScriptMiddleware = createClientScriptMiddleware(
          this.container,
          mergedConfig,
        );
        server.use(clientScriptMiddleware);

        // 获取运行模式
        const serverCfg = (mergedConfig.server || {}) as { mode?: string };
        const envMode = getEnv("DENO_ENV") || getEnv("BUN_ENV") ||
          getEnv("NODE_ENV") || "dev";
        const runMode = serverCfg.mode || envMode;
        const isProd = runMode === "prod";

        // 开发模式：始终生成 _client.tsx 并执行客户端构建（内存），保证 HMR 无感刷新可用
        // 生产模式：仅当无预构建产物时才构建；build 模式（--build）下不在此处构建，由 build() 统一构建，避免重复
        const buildCfg = (mergedConfig.build || {}) as {
          client?: { output?: string };
        };
        const clientOutputDir = buildCfg.client?.output ??
          getInferredBuildOutputDirs().client;
        const prebuiltClientPath = join(
          cwd(),
          clientOutputDir,
          CLIENT_OUTPUT_MAIN_FILENAME,
        );
        const hasPrebuiltClient = await exists(prebuiltClientPath);

        if (!isProd) {
          await ensureClientEntryFile(this.container, mergedConfig);
          if (!this._isBuildMode()) {
            await buildClientScript(this.container, mergedConfig);
          }
        } else if (!hasPrebuiltClient && !this._isBuildMode()) {
          await buildClientScript(this.container, mergedConfig);
        }

        if (!this._isBuildMode()) {
          renderLogger.info($t("log.renderModeHybrid"));
        }
      } else if (renderMode === "ssg") {
        // SSG 模式：从预渲染输出目录提供静态 HTML，并注册客户端脚本以便激活
        const ssgRenderer = createRendererSSG(
          this.container,
          router,
          mergedConfig,
        );
        server.setSSRRender(ssgRenderer);

        const clientScriptMiddleware = createClientScriptMiddleware(
          this.container,
          mergedConfig,
        );
        server.use(clientScriptMiddleware);

        if (!this._isBuildMode()) {
          renderLogger.info($t("log.renderModeSsg"));
        }
      } else {
        // SSR 模式：服务端渲染完整 HTML + 客户端激活（事件响应）
        const ssrRenderer = createRendererSSR(
          this.container,
          router,
          mergedConfig,
        );
        server.setSSRRender(ssrRenderer);

        const clientScriptMiddleware = createClientScriptMiddleware(
          this.container,
          mergedConfig,
        );
        server.use(clientScriptMiddleware);

        const serverCfg = (mergedConfig.server || {}) as { mode?: string };
        const envMode = getEnv("DENO_ENV") || getEnv("BUN_ENV") ||
          getEnv("NODE_ENV") || "dev";
        const runMode = serverCfg.mode || envMode;
        const isProd = runMode === "prod";
        const buildCfg = (mergedConfig.build || {}) as {
          client?: { output?: string };
        };
        const clientOutputDir = buildCfg.client?.output ??
          getInferredBuildOutputDirs().client;
        const prebuiltClientPath = join(
          cwd(),
          clientOutputDir,
          CLIENT_OUTPUT_MAIN_FILENAME,
        );
        const hasPrebuiltClient = await exists(prebuiltClientPath);
        if (!isProd) {
          await ensureClientEntryFile(this.container, mergedConfig);
          if (!this._isBuildMode()) {
            await buildClientScript(this.container, mergedConfig);
          }
        } else if (!hasPrebuiltClient && !this._isBuildMode()) {
          await buildClientScript(this.container, mergedConfig);
        }

        if (!this._isBuildMode()) {
          renderLogger.info($t("log.renderModeSsr"));
        }
      }

      // 注册插件事件中间件（触发 onRequest/onResponse 事件）
      server.use(pluginEventsMiddleware(this.container));

      // 注册生命周期钩子，在启动阶段启动服务器
      const lifecycleManager = getLifecycleManager(this.container);
      const serverStartedHook: LifecycleHook = async () => {
        await startServer(this.container);
      };
      lifecycleManager.on("started", serverStartedHook);
      this.lifecycleListeners.push({
        stage: "started",
        hook: serverStartedHook,
      });
    }
  }

  /**
   * 按约定自动加载并注册 routes/_middleware.ts（路由级中间件）
   *
   * @param config 应用配置
   */
  private async _registerRoutesMiddleware(config: AppConfig): Promise<void> {
    const routerConfig = (config.router || {}) as { routesDir?: string };
    const routesDir = routerConfig.routesDir || "./src/routes";
    const absPath = join(cwd(), routesDir, "_middleware.ts");
    if (!(await exists(absPath))) {
      return;
    }
    try {
      const middleware = await this._loadMiddlewareFromFile(absPath);
      registerMiddleware(
        this.container,
        middleware,
        undefined,
        "routes-middleware",
      );
    } catch (error) {
      const logger = getLogger(this.container);
      logger.warn(
        $t("log.routesMiddlewareSkipped", {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  /**
   * 从配置中注册插件
   *
   * @param config 应用配置
   */
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
              message: $t("log.pathMustBeInProject"),
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
        // 如果是中间件函数，直接注册
        registerMiddleware(this.container, middlewareConfig);
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
          // 中间件是函数
          middleware = middlewareConfig.middleware;
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
          message: $t("log.pathMustBeInProject"),
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
    middleware: AppMiddleware,
    condition?: unknown,
    name?: string,
  ): void;
  use(
    path: string,
    middleware: AppMiddleware,
    name?: string,
  ): void;
  use(
    middlewareOrPath: AppMiddleware | string,
    conditionOrMiddleware?: unknown | AppMiddleware,
    name?: string,
  ): void {
    // 如果初始化未完成，缓存调用
    if (!this._initialized) {
      this._pendingMiddlewares.push({
        middlewareOrPath,
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
      const middleware = middlewareOrPath;
      registerMiddleware(
        this.container,
        middleware,
        conditionOrMiddleware,
        name,
      );
    }
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
   * 检测是否为 build 模式（通过命令行参数 --build）
   *
   * 使用 @dreamer/runtime-adapter 的 args() 函数获取命令行参数
   * 自动兼容 Deno、Bun、Node 环境
   */
  private _isBuildMode(): boolean {
    return args().includes("--build");
  }

  /**
   * 启动应用
   *
   * 自动检测 --build 参数：
   * - 如果有 --build 参数，执行 build() 只构建不启动服务器
   * - 如果没有 --build 参数，正常启动服务器
   */
  async start(): Promise<void> {
    // 检测是否为 build 模式
    if (this._isBuildMode()) {
      await this.build();
      // 构建完成后显式退出，避免插件/监听器等未释放句柄导致进程卡住
      exit(0);
    }

    // 等待初始化完成（框架版本与应用名称已在 _initializeConfig 中首先打印）
    await this._initPromise;

    const lifecycleManager = getLifecycleManager(this.container);

    // 初始化应用
    await lifecycleManager.initialize();

    // 注册信号监听器（优雅关闭）
    this._setupSignalHandlers();

    // 触发 onStart 事件（应用启动时）
    await pluginEvents.emitOnStart(this.container);

    // 触发 EventEmitter 事件
    this.emit("start");

    // 启动应用
    await lifecycleManager.start();
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
    // 等待初始化完成（框架版本与应用名称已在 _initializeConfig 中首先打印）
    await this._initPromise;

    const logger = this._getLogger();
    const config = getConfig(this.container);

    logger.info($t("log.buildStart"));

    // 获取构建配置，基础输出目录（多应用时按入口推断，如 dist/backend）
    const buildConfig = (config.build || {}) as {
      client?: { output?: string };
    };
    const clientOutputDir = buildConfig.client?.output ??
      getInferredBuildOutputDirs().client;

    // 供 CSS 插件在 onBuild 中推送 link 标签，用于 SSG 模板注入
    const pluginBuildCssLinks: string[] = [];
    if (!this.container.has("pluginBuildCssLinks")) {
      this.container.registerSingleton(
        "pluginBuildCssLinks",
        () => pluginBuildCssLinks,
      );
    }

    try {
      // 触发插件的 onBuild 钩子（Tailwind/UnoCSS 等会直接写入各自的 output 目录）
      await pluginEvents.emitOnBuild(this.container, {
        mode: "prod",
        target: "client",
      });
      logger.info($t("log.pluginBuildComplete"));

      const renderMode = (config.render as { mode?: string })?.mode ?? "ssr";
      // 使用 @dreamer/esbuild 的 Builder 统一构建（服务端 + 客户端 + 资源）
      // SSR/SSG 也构建客户端，以便静态 HTML 可做客户端激活（事件响应）
      await runBuildWithBuilder(this.container, config, {
        skipClient: false,
      });

      // SSG 模式：预渲染静态 HTML 到 client 目录（与其它前端产物一致），start 时从该目录读取（在服务端构建之后执行，确保不被覆盖）
      if (renderMode === "ssg") {
        const router = getRouter(this.container);
        const renderService = getRender(this.container);
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
          const expanded = expandDynamicRoute(pattern, params);
          for (const p of expanded) {
            if (!routePaths.includes(p)) routePaths.push(p);
          }
        }

        if (routePaths.length === 0) {
          logger.warn($t("log.ssgNoPaths"));
        } else {
          const ssgOutputDir = renderCfg.ssg?.outputDir ?? clientOutputDir;
          const absOutputDir = join(cwd(), ssgOutputDir);
          /** 按路径加载模块（支持 .ts/.tsx，用于 loadRouteComponent、loadRouteLayouts） */
          const loadModuleByPath = async (fullPath: string) => {
            const mod = await loadRouteModule(fullPath, {
              logger: this.container.has("logger")
                ? getLogger(this.container)
                : undefined,
            });
            return mod?.default ?? mod?.Page ?? mod?.App ?? mod?.Layout ?? null;
          };

          /** 按路径加载页面组件（支持动态路由，通过 router.match 匹配） */
          const loadRouteComponent = async (routePath: string) => {
            const match = await router.match(routePath);
            if (!match || match.isApi || !match.route?.fullPath) return null;
            return await loadModuleByPath(match.route.fullPath);
          };

          /** 加载路由数据（含 params，供动态路由页面使用） */
          const loadRouteData = async (
            routePath: string,
          ): Promise<Record<string, unknown>> => {
            const match = await router.match(routePath);
            if (!match || match.isApi) return {};
            return { params: match.params };
          };

          /** 加载布局组件（_app -> _layout，从外到内，用于 SSG 预渲染） */
          const loadRouteLayouts = async (
            _routePath: string,
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
            const layoutPath = router.getSpecialFile("_layout");
            if (layoutPath) {
              const LayoutComponent = await loadModuleByPath(layoutPath);
              if (LayoutComponent) layouts.push({ component: LayoutComponent });
            }
            return layouts;
          };
          // 使用插件在 onBuild 中推送的 link 标签，在 _app 输出的 </head> 前注入
          const cssLinks = this.container.tryGet<string[]>(
            "pluginBuildCssLinks",
          ) ?? [];
          const headInject = cssLinks.length > 0 ? cssLinks.join("\n") : "";

          const engine = renderCfg.engine ?? "preact";
          const cwdPath = cwd();

          /** 每生成一个 HTML 就立即输出日志，避免数据多时长时间无输出像卡住 */
          const onFileGenerated = (filePath: string) => {
            const rel = relative(cwdPath, filePath);
            logger.info(
              $t("log.ssgFileGenerated", {
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
            const routesDir = routerConfig.routesDir ?? "./src/routes";
            const routesDirPath = join(
              cwd(),
              routesDir.replace(/^\.\/?/, "") || routesDir,
            );
            const clientRoutes = collectClientRoutes(router, routesDirPath);
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
              const pathname = fileToPathname(relPath);
              const match = await router.match(pathname);
              if (!match || match.isApi) continue;
              const pageProps = await loadRouteData(pathname);
              const rawComponent = match.route.file || match.route.path || "";
              const normalizedComponent = typeof rawComponent === "string"
                ? extractComponentPathFromRouteFile(
                  routesDirPath,
                  rawComponent,
                ) ||
                  rawComponent.replace(/\\/g, "/").replace(/\.(tsx?|jsx?)$/, "")
                    .trim()
                : rawComponent;
              const hydrationData = {
                page: pageProps,
                route: match.route.path,
                params: match.params,
                query: match.query,
                component: normalizedComponent,
              };
              const clientConfigScript = `
<script>
  globalThis.__DATA__ = ${JSON.stringify(hydrationData)};
  globalThis.__DWEB_DEV__ = false;
  globalThis.__DWEB_ROUTES__ = ${JSON.stringify(clientRoutes)};
  globalThis.__DWEB_ENGINE__ = "${engine}";
  globalThis.__DWEB_CONTAINER_ID__ = "${containerId}";
  globalThis.__DWEB_MODE__ = "ssg";
</script>
<script type="module" src="${clientScript}"></script>`;
              let html = await readTextFile(filePath);
              if (!hasContainerElementInHtml(html, containerId)) {
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
            const processor = new AssetsProcessor(
              assetsConfig as ConstructorParameters<typeof AssetsProcessor>[0],
              absOutputDir,
            );
            await processor.processAssets();
          }
        }
      }

      logger.info($t("log.buildComplete"));

      // 触发 onBuildComplete 插件事件（构建全部完成后）
      await pluginEvents.emitOnBuildComplete(this.container, {});

      // 触发 EventEmitter 事件
      this.emit("build");
    } finally {
      // 无事件监听器需要移除
    }

    // 清理客户端脚本缓存（build 模式未使用增量 context，无需 disposeBuilder）
    await clearClientScriptCache();

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
   * 设置信号处理器（优雅关闭）
   */
  private _setupSignalHandlers(): void {
    const logger = this._getLogger();

    // SIGINT 处理器（Ctrl+C）
    const sigintHandler: SignalHandler = () => {
      // 防止重复处理
      if (this.isShuttingDown) {
        return;
      }
      this.isShuttingDown = true;
      logger.info("\n" + $t("log.sigintShutdown"));
      // 异步执行 stop 和 shutdown，不阻塞信号处理
      this.stop()
        .then(() => this.shutdown())
        .then(() => {
          // 正常退出
          exit(0);
        })
        .catch((error) => {
          const errorMessage = error instanceof Error
            ? error.message
            : String(error);
          logger.error($t("log.shutdownError") + ":", errorMessage);
          // 异常退出
          exit(1);
        });
    };
    addSignalListener("SIGINT", sigintHandler);
    this.signalHandlers.set("SIGINT", sigintHandler);

    // SIGTERM 处理器（终止信号）
    const sigtermHandler: SignalHandler = () => {
      // 防止重复处理
      if (this.isShuttingDown) {
        return;
      }
      this.isShuttingDown = true;
      logger.info("\n" + $t("log.sigtermShutdown"));
      // 异步执行 stop 和 shutdown，不阻塞信号处理
      this.stop()
        .then(() => this.shutdown())
        .then(() => {
          // 正常退出
          exit(0);
        })
        .catch((error) => {
          const errorMessage = error instanceof Error
            ? error.message
            : String(error);
          logger.error($t("log.shutdownError") + ":", errorMessage);
          // 异常退出
          exit(1);
        });
    };
    addSignalListener("SIGTERM", sigtermHandler);
    this.signalHandlers.set("SIGTERM", sigtermHandler);
  }

  /**
   * 移除信号处理器
   */
  private _removeSignalHandlers(): void {
    for (const [signal, handler] of this.signalHandlers.entries()) {
      removeSignalListener(signal as "SIGINT" | "SIGTERM", handler);
    }
    this.signalHandlers.clear();
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

    // 清理客户端脚本缓存并释放增量构建 context（防止内存泄漏）
    await clearClientScriptCache({ disposeBuilder: true });

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
