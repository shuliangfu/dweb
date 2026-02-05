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
import { ServiceContainer } from "@dreamer/service";
import { EventEmitter } from "node:events";
import {
  addSignalListener,
  args,
  cwd,
  exists,
  exit,
  getEnv,
  join,
  realPath,
  relative,
  removeSignalListener,
  resolve,
  setEnv,
  type SignalHandler,
} from "./runtime-adapter.ts";

import { BuilderServer } from "@dreamer/esbuild";
import { DwebErrorCode, throwDwebError } from "../utils/errors.ts";
import { initDwebI18n } from "../utils/i18n.ts";
import { requestId, requestLogger } from "@dreamer/middlewares";
import { expandDynamicRoute } from "@dreamer/render";
import { initializeBuild } from "../feature/build.ts";
import {
  buildClientScript,
  clearClientScriptCache,
  CLIENT_OUTPUT_MAIN_FILENAME,
  createClientScriptMiddleware,
  ensureClientEntryFile,
} from "../feature/csr-client-builder.ts";
import { loadRouteModule } from "../feature/load-route-module.ts";
import { createRendererCSR } from "../feature/render-csr.ts";
import { createRendererHybrid } from "../feature/render-hybrid.ts";
import { createRendererSSG } from "../feature/render-ssg.ts";
import { createRendererSSR } from "../feature/render-ssr.ts";
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
import type {
  AppConfig,
  AppLifecycleHook,
  AppMiddleware,
  AppPlugin,
  AppStage,
  IApp,
} from "../types/app.ts";
import { getInferredBuildOutputDirs } from "../utils/build-dirs.ts";
import { getLogger, initializeLogger } from "../utils/logger.ts";
import { getDwebVersion } from "../utils/version.ts";
import {
  deepMergeConfig,
  getConfig,
  getConfigManager,
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
  getServerMiddlewares,
  initializeMiddleware,
  pluginEventsMiddleware,
  registerMiddleware,
} from "./middleware.ts";
import {
  emitOnBuild,
  emitOnInit,
  emitOnShutdown,
  emitOnStart,
  emitOnStop,
} from "./plugin-events.ts";
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
   * @param config 应用配置（可选）
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
      // 构建模式
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
   * 从 configDirectory 动态加载 main.ts、params.ts（本地配置文件，不会触发依赖下载）。
   * 入口文件传入的 config 会与加载的配置深度合并，优先级最高。
   *
   * @param config 应用配置（可仅含 configDirectory，或含覆盖项）
   */
  private async _initializeConfig(config: AppConfig): Promise<void> {
    // 初始化配置管理器（从 configDirectory 动态加载 main.ts、params.ts；未指定时默认检查 ./config、./src/config）
    await initializeConfigManager(this.container, {
      directories: config.configDirectory
        ? [config.configDirectory]
        : undefined,
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
    await emitOnInit(this.container);
    this.emit("init");

    // 初始化服务器（依赖配置和日志）
    if (mergedConfig.server) {
      // 初始化渲染和路由（服务器需要这些功能）
      initializeRender(this.container, mergedConfig);
      await initializeRouter(this.container, mergedConfig);
      initializeBuild(this.container, mergedConfig);

      // 初始化服务器
      initializeServer(this.container, mergedConfig);
      // 根据 config.socket.type 初始化实时通信（socketio | websocket）
      const socketConfig = mergedConfig.socket as
        | { type?: string }
        | undefined;
      if (socketConfig?.type === "socketio") {
        initializeSocketIo(this.container, mergedConfig);
      } else if (socketConfig?.type === "websocket") {
        initializeWebSocket(this.container, mergedConfig);
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

      // 框架级中间件：Request ID、请求日志（先于用户中间件执行）
      server.use(requestId());
      const serverCfgForLog = (mergedConfig.server || {}) as { mode?: string };
      const envModeForLog = getEnv("DENO_ENV") || getEnv("BUN_ENV") ||
        getEnv("NODE_ENV") || "dev";
      const isProd = (serverCfgForLog.mode || envModeForLog) === "prod";
      server.use(
        requestLogger({
          logger: getLogger(this.container),
          skip: (ctx) => ctx.path.startsWith("/.well-known/"),
          detailed: isProd,
        }),
      );

      // socket.type 为 socketio 时：路径前缀匹配委托给 Socket.IO 处理
      const socketIoPath = getSocketIoPath(this.container);
      if (socketIoPath) {
        server.use(
          createSocketIoMiddleware(this.container),
          socketIoPath,
          "socket-io",
        );
        getLogger(this.container).info(
          $t("log.socketIoMounted", { path: socketIoPath }),
        );
      }

      // socket.type 为 websocket 时：路径前缀匹配委托给 WebSocket 处理
      const websocketPath = getWebSocketPath(this.container);
      if (websocketPath) {
        server.use(
          createWebSocketMiddleware(this.container),
          websocketPath,
          "websocket",
        );
        getLogger(this.container).info(
          $t("log.websocketMounted", { path: websocketPath }),
        );
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

        renderLogger.info($t("log.renderModeCsr"));
      } else if (renderMode === "hybrid") {
        // Hybrid 模式：服务端渲染完整 HTML + 客户端 hydrate
        const hybridRenderer = createRendererHybrid(
          this.container,
          router,
          mergedConfig,
        );
        server.setSSRRender(hybridRenderer);

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

        renderLogger.info($t("log.renderModeHybrid"));
      } else if (renderMode === "ssg") {
        // SSG 模式：从预渲染输出目录提供静态 HTML
        const ssgRenderer = createRendererSSG(
          this.container,
          router,
          mergedConfig,
        );
        server.setSSRRender(ssgRenderer);

        renderLogger.info($t("log.renderModeSsg"));
      } else {
        // SSR 模式：服务端渲染完整 HTML
        const ssrRenderer = createRendererSSR(this.container, router);
        server.setSSRRender(ssrRenderer);

        renderLogger.info($t("log.renderModeSsr"));
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
    const middlewarePath = join(routesDir, "_middleware.ts");
    const absPath = join(cwd(), routesDir, "_middleware.ts");
    if (!(await exists(absPath))) {
      return;
    }
    try {
      const middleware = await this._loadMiddlewareFromFile(middlewarePath);
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
        // 如果是字符串，则作为文件路径加载
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
      const module = await import(`file://${resolvedPath}`);

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
      return;
    }

    // 等待初始化完成（框架版本与应用名称已在 _initializeConfig 中首先打印）
    await this._initPromise;

    const lifecycleManager = getLifecycleManager(this.container);

    // 初始化应用
    await lifecycleManager.initialize();

    // 注册信号监听器（优雅关闭）
    this._setupSignalHandlers();

    // 触发 onStart 事件（应用启动时）
    await emitOnStart(this.container);

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

    // 供 CSS 插件在 onBuild 中推送编译结果，用于 SSG 模板内联样式（可选）
    const pluginBuildCssParts: string[] = [];
    if (!this.container.has("pluginBuildCssParts")) {
      this.container.registerSingleton(
        "pluginBuildCssParts",
        () => pluginBuildCssParts,
      );
    }

    try {
      // 触发插件的 onBuild 钩子（Tailwind/UnoCSS 等会直接写入各自的 output 目录）
      await emitOnBuild(this.container, { mode: "prod", target: "client" });
      logger.info($t("log.pluginBuildComplete"));

      const renderMode = (config.render as { mode?: string })?.mode ?? "ssr";
      // SSG 模式：只生成静态 HTML，不构建客户端 JS（start 时从 client 目录读 HTML）
      if (renderMode !== "ssg") {
        // 构建客户端脚本（生产模式，支持代码分割）
        await buildClientScript(this.container, config);
        logger.debug($t("log.clientBuildComplete"));
      }

      // 先构建服务端（避免服务端构建时清空 dist 导致后续 SSG 产物丢失）
      await this._buildServer();

      // SSG 模式：预渲染静态 HTML 到 client 目录（与其它前端产物一致），start 时从该目录读取（在服务端构建之后执行，确保不被覆盖）
      if (renderMode === "ssg") {
        const router = getRouter(this.container);
        const renderService = getRender(this.container);
        const renderCfg = config.render as {
          engine?: "react" | "preact";
          ssg?: {
            outputDir?: string;
            routes?: string[];
            dynamicRoutes?: Record<string, string[]>;
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
            const mod = await loadRouteModule(fullPath);
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
          // 使用插件在 onBuild 中推送的 CSS 内容（Tailwind/UnoCSS 等），注入到 SSG 模板的 <head> 中
          const cssParts = this.container.tryGet<string[]>(
            "pluginBuildCssParts",
          ) ?? [];
          const inlineCss = cssParts.length > 0
            ? "<style>" + cssParts.join("\n") + "</style>"
            : "";
          const defaultTemplate =
            '<!DOCTYPE html><html><head><meta charset="utf-8">' +
            inlineCss +
            "</head><body><!--ssr-outlet--></body></html>";

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
            template: defaultTemplate,
            onFileGenerated,
          };
          await renderService.renderSSG(ssgOptions);
        }
      }

      logger.info($t("log.buildComplete"));

      // 触发 EventEmitter 事件
      this.emit("build");
    } finally {
      // 无事件监听器需要移除
    }

    // 清理客户端脚本缓存
    clearClientScriptCache();

    // 清理生命周期监听器（防止内存泄漏）
    this._removeLifecycleListeners();

    // 停止 ConfigManager 文件监听（build 模式不经历 shutdown，需单独清理）
    this._stopConfigWatching();

    // 构建模式不需要调用 shutdown()，直接退出
    // shutdown() 需要在 stopped 阶段调用，但 build 模式没有经历完整生命周期
  }

  /**
   * 构建服务端代码
   *
   * 使用 @dreamer/esbuild 的 BuilderServer 将 TypeScript 编译为 JavaScript
   */
  private async _buildServer(): Promise<void> {
    const logger = this._getLogger();
    const config = getConfig(this.container);

    try {
      // 获取构建配置
      const buildConfig = (config.build || {}) as {
        server?: {
          entry?: string;
          output?: string;
          /** 是否使用原生编译器生成可执行文件（默认 true） */
          useNativeCompile?: boolean;
        };
      };
      const serverConfig = buildConfig.server || {};

      // 入口：优先用配置；未配置时用「当前执行的入口文件」（多应用时 deno run src/backend/main.ts --build 即以此为入口）
      let entry = serverConfig.entry;
      if (!entry) {
        const mainModulePath = this._getMainModulePath();
        if (mainModulePath) {
          const cwdPath = cwd();
          entry = relative(cwdPath, mainModulePath);
          if (entry.startsWith("..")) {
            entry = "./" + entry;
          } else if (!entry.startsWith(".")) {
            entry = "./" + entry;
          }
        } else {
          entry = "./src/main.ts";
        }
      }
      // useNativeCompile：默认 false（生成 server.js），设为 true 时用 deno compile 生成可执行文件
      const useNativeCompile = serverConfig.useNativeCompile === true;
      // 输出目录：未配置时与 client 一致，按当前入口推断应用目录（src/backend/main.ts → dist/backend）
      const outputDir = serverConfig.output ??
        getInferredBuildOutputDirs().server;
      // 根据编译模式调整输出路径
      // useNativeCompile: true -> 可执行文件路径 (dist/server)
      // useNativeCompile: false -> 目录路径 (dist)，esbuild 会生成 server.js
      const output = useNativeCompile ? `${outputDir}/server` : outputDir;

      logger.info(
        $t("log.serverBuildOutput", {
          path: `${output}${useNativeCompile ? "" : "/server.js"}`,
        }),
      );

      // 创建服务端构建器
      // useNativeCompile: true - 使用 deno compile / bun build --compile 生成可执行文件
      // useNativeCompile: false - 使用 esbuild 生成 JS 文件（文件更小，但需要运行时）
      const builder = new BuilderServer({
        entry,
        output,
        useNativeCompile,
        // 用户自定义的外部依赖（可选）
        external: (serverConfig as { external?: string[] }).external,
        // 服务端编译成 JS 时，自动将 npm 包标记为 external
        // Deno 运行时可以直接解析 npm 包，无需打包
        externalNpm: !useNativeCompile,
      });

      // 执行构建
      const result = await builder.build("prod");

      logger.info(
        $t("log.serverBuildComplete", { duration: String(result.duration) }),
      );
    } catch (error) {
      logger.error($t("log.serverBuildFailed") + ":", error);
      throw error;
    }
  }

  /**
   * 获取当前执行的入口文件绝对路径（用于多应用构建时推断 build entry）
   * Deno: mainModule；Bun/Node: process.argv[1]
   */
  private _getMainModulePath(): string | null {
    const g = globalThis as Record<string, unknown>;
    const deno = g.Deno as { mainModule?: string } | undefined;
    if (deno?.mainModule) {
      try {
        const url = new URL(deno.mainModule);
        if (url.protocol === "file:") {
          return url.pathname || null;
        }
      } catch {
        return null;
      }
    }
    const proc = g.process as { argv?: string[] } | undefined;
    const scriptPath = proc?.argv?.[1];
    if (scriptPath) {
      return resolve(cwd(), scriptPath);
    }
    return null;
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
    await emitOnStop(this.container);

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
    await emitOnShutdown(this.container);

    // 移除信号监听器
    this._removeSignalHandlers();

    // 移除生命周期监听器（防止内存泄漏）
    this._removeLifecycleListeners();

    // 停止 ConfigManager 的文件监听（hotReload 时创建，防止内存泄漏）
    this._stopConfigWatching();

    // 清理客户端脚本缓存（防止内存泄漏）
    clearClientScriptCache();

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
