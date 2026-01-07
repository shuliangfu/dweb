/**
 * 应用核心类模块
 * 作为框架的统一入口，管理所有组件和服务
 *
 * @module core/application
 */

import type {
  AppConfig,
  Middleware,
  MiddlewareConfig,
  Plugin,
  Request,
  Response,
  Session,
} from "../common/types/index.ts";
import type { Logger } from "../features/logger.ts";
import { Server } from "./server.ts";
import { Router } from "./router.ts";
import { RouteHandler } from "./route-handler.ts";
import { MiddlewareManager } from "./middleware.ts";
import { PluginManager } from "./plugin.ts";
import {
  ServiceContainer,
  type ServiceFactory,
  ServiceLifetime,
  type ServiceToken,
} from "./service-container.ts";
import { ConfigManager } from "./config-manager.ts";
import { ApplicationContext } from "./application-context.ts";
import { LifecycleManager, LifecyclePhase } from "./lifecycle-manager.ts";
import { CookieManager } from "../features/cookie.ts";
import { SessionManager } from "../features/session.ts";
import { normalizeRouteConfig } from "./config.ts";
import { RenderAdapterManager } from "./render/manager.ts";
import { PreactRenderAdapter } from "./render/preact.ts";
import type { RenderAdapter, RenderEngine } from "./render/adapter.ts";
import { DefaultErrorHandler, type ErrorHandler } from "./error-handler.ts";
import * as path from "@std/path";
import { EventEmitter } from "node:events";
import { contentSecurityPolicy, helmet } from "../middleware/security.ts";
import { DatabaseManager } from "../features/database/manager.ts";
import {
  type CacheAdapter,
  FileCacheAdapter,
  MemoryCacheAdapter,
} from "./cache/mod.ts";
import { QueueManager } from "../features/queue/manager.ts";
import { isMultiAppMode } from "./config.ts";

/**
 * 应用核心类
 * 作为框架的统一入口，管理所有组件和服务
 *
 * @example
 * ```ts
 * import { Application } from "@dreamer/dweb/core/application";
 *
 * const app = new Application("dweb.config.ts");
 * await app.initialize();
 *
 * app.use(middleware);
 * app.plugin(plugin);
 *
 * await app.start();
 * ```
 */
export class Application extends EventEmitter {
  /** 应用上下文 */
  private context: ApplicationContext;
  /** 配置管理器 */
  private configManager: ConfigManager;
  /** 服务容器 */
  private serviceContainer: ServiceContainer;
  /** 生命周期管理器 */
  private lifecycleManager: LifecycleManager;
  /** 服务器实例 */
  private _server: Server;
  /** 路由管理器 */
  private router: Router | null = null;
  /** 路由处理器 */
  private routeHandler: RouteHandler | null = null;
  /** 中间件管理器 */
  private middlewareManager: MiddlewareManager;
  /** 插件管理器 */
  private pluginManager: PluginManager;
  /** 渲染适配器管理器 */
  private renderAdapterManager: RenderAdapterManager;
  /** 队列管理器 */
  private queueManager: QueueManager | null = null;
  /** 错误处理器 */
  private errorHandler: ErrorHandler | null = null;

  /**
   * 构造函数
   *
   * @param configPath - 配置文件路径（可选，如果不提供则自动查找）
   * @param appName - 应用名称（可选，用于多应用模式）
   */
  constructor(configPath?: string, appName?: string) {
    super();
    // 初始化核心组件
    this.configManager = new ConfigManager(configPath, appName);
    this.serviceContainer = new ServiceContainer();
    this.context = new ApplicationContext(this);
    this.lifecycleManager = new LifecycleManager(this);

    // 初始化管理器
    this.middlewareManager = new MiddlewareManager();
    this.pluginManager = new PluginManager();

    // 初始化渲染适配器管理器
    this.renderAdapterManager = new RenderAdapterManager();

    // 注册默认适配器（Preact）
    this.renderAdapterManager.register(new PreactRenderAdapter());

    // 初始化队列管理器
    this.queueManager = new QueueManager();

    // 创建服务器实例
    this._server = new Server();

    // 注册核心服务
    this.registerCoreServices();
  }

  /**
   * 初始化应用
   * 加载配置、注册服务、初始化路由和服务器
   *
   * @throws {Error} 如果初始化失败
   *
   * @example
   * ```ts
   * const app = new Application();
   * await app.initialize();
   * ```
   */
  async initialize(): Promise<void> {
    // 设置生命周期阶段
    this.lifecycleManager.setPhase(LifecyclePhase.Initializing);

    try {
      // 1. 加载配置（如果尚未加载）
      if (!this.configManager.isLoaded()) {
        await this.configManager.load();
      }
      const config = this.configManager.getConfig();

      // 更新应用上下文
      this.context.setConfig(config);
      this.context.setIsProduction(config.isProduction ?? false);

      // 2. 注册服务
      await this.registerServices();

      // 3. 初始化错误处理器
      this.initializeErrorHandler();

      // 4. 初始化缓存服务
      this.initializeCache(config);

      // 5. 初始化队列服务（如果配置了）
      await this.initializeQueue(config);

      // 6. 初始化数据库（如果配置了）
      // await this.initializeDatabase(config);

      // 7. 初始化 GraphQL 服务器（如果配置了）
      await this.initializeGraphQL(config);

      // 8. 初始化安全中间件
      this.initializeSecurity(config);

      // 9. 初始化渲染适配器（必须在 RouteHandler 之前）
      await this.initializeRenderAdapter(config);

      // 10. 初始化路由
      await this.initializeRouter();

      // 11. 初始化路由处理器
      this.initializeRouteHandler();

      // 12. 初始化中间件和插件
      this.initializeMiddlewareAndPlugins(config);

      // 13. 初始化服务器
      await this.initializeServer();

      // 14. 初始化 WebSocket 服务器（如果配置了）
      await this.initializeWebSocket(config);

      // 14. 执行插件初始化钩子
      await this.pluginManager.executeOnInit(this.context, config);

      // 设置生命周期阶段为已初始化
      this.lifecycleManager.setPhase(LifecyclePhase.Initialized);
    } catch (error) {
      this.lifecycleManager.setPhase(LifecyclePhase.Stopped);
      throw error;
    }
  }

  /**
   * 初始化应用（控制台模式）
   * 加载配置、注册服务、初始化中间件和插件
   *
   * @throws {Error} 如果初始化失败
   */
  async initializeConsole(): Promise<void> {
    // 设置生命周期阶段
    this.lifecycleManager.setPhase(LifecyclePhase.Initializing);

    try {
      const config = this.configManager.getConfig();

      // 更新应用上下文
      this.context.setConfig(config);
      this.context.setIsProduction(config.isProduction ?? false);

      // 2. 注册服务
      await this.registerServices();

      // 4. 初始化缓存服务
      this.initializeCache(config);

      // 5. 初始化队列服务（如果配置了）
      await this.initializeQueue(config);

      // 12. 初始化中间件和插件
      this.initializeMiddlewareAndPlugins(config);

      // 14. 初始化 WebSocket 服务器（如果配置了）
      await this.initializeWebSocket(config);

      // 14. 执行插件初始化钩子
      await this.pluginManager.executeOnInit(this.context, config);

      // 设置生命周期阶段为已初始化
      this.lifecycleManager.setPhase(LifecyclePhase.Initialized);
    } catch (error) {
      this.lifecycleManager.setPhase(LifecyclePhase.Stopped);
      throw error;
    }
  }

  /**
   * 启动应用
   * 启动服务器并进入运行状态
   * 根据环境自动设置开发或生产环境的特定功能
   *
   * @throws {Error} 如果应用未初始化或启动失败
   *
   * @example
   * ```ts
   * await app.start();
   * ```
   */
  async start(): Promise<void> {
    const config = this.configManager.getConfig();
    const isProduction = config.isProduction ?? false;

    // 开发环境：初始化 HMR 和文件监听
    if (!isProduction) {
      await this.initializeDevFeatures(config);
    }

    // 生产环境：验证 TLS 配置
    if (isProduction) {
      this.validateProductionConfig(config);
    }

    // 开发环境：自动打开浏览器和设置信号处理
    if (!isProduction) {
      this.setupDevStartup(config);
    } else {
      // 生产环境：设置优雅关闭信号处理
      this.setupProductionShutdown();
    }

    // 启动服务器
    await this.lifecycleManager.start();
  }

  /**
   * 初始化开发环境特性
   * 包括 HMR 服务器和文件监听器
   */
  private async initializeDevFeatures(config: AppConfig): Promise<void> {
    if (!config.dev) {
      config.dev = {
        open: false,
        hmrPort: 24678,
        hmrHost: "127.0.0.1",
        reloadDelay: 300,
      };
    } else {
      config.dev.open = config.dev.open ?? false;
      config.dev.hmrPort = config.dev.hmrPort ?? 24678;
      config.dev.hmrHost = config.dev.hmrHost ?? "127.0.0.1";
      config.dev.reloadDelay = config.dev.reloadDelay ?? 300;
    }

    // 启动 HMR 服务器
    const { HMRServer } = await import("../features/hmr.ts");
    const { createHMRClientScript } = await import("../features/hmr.ts");
    const { setHMRClientScript } = await import("./route-handler.ts");

    const hmrServer = new HMRServer();
    const preferredPort = config.dev.hmrPort ?? 24678;
    // HMR 默认绑定本地回环地址
    const hmrPort = this.findAvailablePort(preferredPort, config.dev.hmrHost);
    hmrServer.start(hmrPort, config.dev.hmrHost);

    // 设置服务器 origin（用于 HMR 编译组件时生成完整的 HTTP URL）
    if (config.server) {
      const protocol = config.server.tls ? "https" : "http";
      // 与 Server.start 保持一致，默认使用 127.0.0.1
      const host = config.server.host || "127.0.0.1";
      const preferredAppPort = config.server.port || 3000;
      // 使用配置的主机名检测端口
      const appPort = this.findAvailablePort(preferredAppPort, host);
      if (appPort !== preferredAppPort) {
        config.server.port = appPort;
        console.log(
          `[Dev] 端口 ${preferredAppPort} 被占用，自动切换到 ${appPort}`,
        );
      }
      // 如果是 0.0.0.0，构建 URL 时使用 127.0.0.1 或 localhost
      const appHost = host;
      const serverOrigin = `${protocol}://${appHost}:${appPort}`;
      hmrServer.setServerOrigin(serverOrigin);
    }

    // 设置路由目录（用于判断文件类型，支持多应用模式）
    if (config.routes) {
      const routeConfigForHMR = normalizeRouteConfig(config.routes);
      hmrServer.setRoutesDir(routeConfigForHMR.dir);
    }

    // 设置 HMR 客户端脚本
    const hmrScript = await createHMRClientScript(hmrPort);
    setHMRClientScript(hmrScript);

    // 创建文件监听器
    if (config.routes) {
      const { FileWatcher } = await import("../features/hmr.ts");
      const routeConfigForWatcher = normalizeRouteConfig(config.routes);
      const fileWatcher = new FileWatcher(
        config.dev.reloadDelay || 300,
        routeConfigForWatcher.dir,
      );

      // 设置需要忽略的目录（合并 static.extendDirs 和 dev.ignoredDirs）
      const ignoredDirs: string[] = [];

      // 1. 从 static.extendDirs 配置中获取需要忽略的目录
      const extendDirs = config.static?.extendDirs || [];
      for (const extendDir of extendDirs) {
        const dir = typeof extendDir === "string" ? extendDir : extendDir.dir;
        // 标准化路径（去掉 ./ 前缀）
        let normalizedDir = dir.replace(/^\.\//, "");
        // 如果是相对路径，转换为绝对路径用于比较
        if (!path.isAbsolute(normalizedDir)) {
          normalizedDir = path.resolve(Deno.cwd(), normalizedDir);
        } else {
          normalizedDir = path.resolve(normalizedDir);
        }
        ignoredDirs.push(normalizedDir);
      }

      // 2. 从 dev.ignoredDirs 配置中获取需要忽略的目录
      const devIgnoredDirs = config.dev?.ignoredDirs || [];
      for (const dir of devIgnoredDirs) {
        // 标准化路径（去掉 ./ 前缀）
        let normalizedDir = dir.replace(/^\.\//, "");
        // 如果是相对路径，转换为绝对路径用于比较
        if (!path.isAbsolute(normalizedDir)) {
          normalizedDir = path.resolve(Deno.cwd(), normalizedDir);
        } else {
          normalizedDir = path.resolve(normalizedDir);
        }
        // 避免重复添加
        if (!ignoredDirs.includes(normalizedDir)) {
          ignoredDirs.push(normalizedDir);
        }
      }

      fileWatcher.setIgnoredExtendDirs(ignoredDirs);

      // 监听配置文件变化
      fileWatcher.watch(".");

      let cssPath = "/assets/tailwind.css";
      const tailwindPlugin = this.pluginManager.get("tailwind");
      if (tailwindPlugin?.config) {
        if (tailwindPlugin.config.cssPath) {
          // 获取静态资源前缀，如果未配置则使用默认值 "/assets"
          const staticPrefix = config.static?.prefix || "/assets";
          cssPath = path.join(
            "/",
            staticPrefix,
            path.basename(tailwindPlugin.config.cssPath as string),
          );
        }
      }

      // 将文件变化事件连接到 HMR 服务器（智能更新）
      fileWatcher.onReload(async (changeInfo) => {
        // 清除 route-handler 的模块缓存（确保文件变化后立即失效缓存）
        if (this.routeHandler) {
          await this.routeHandler.clearModuleCache(changeInfo.path);
        }
        // 通知 HMR 服务器文件变化
        hmrServer.notifyFileChange(changeInfo);
        // 仅当文件不是 CSS 时触发 CSS 刷新
        if (!changeInfo.path.endsWith(".css")) {
          hmrServer.notifyFileChange({
            path: cssPath,
            kind: "modify",
          });
        }
      });

      // 注册文件监听器到服务容器
      this.serviceContainer.registerSingleton("fileWatcher", () => fileWatcher);
    }
  }

  /**
   * 查找可用端口（从首选端口开始顺序递增）
   */
  private findAvailablePort(
    startPort: number,
    hostname: string = "127.0.0.1",
  ): number {
    const maxTries = 50;
    for (let i = 0; i < maxTries; i++) {
      const port = startPort + i;
      try {
        const listener = Deno.listen({ hostname, port, transport: "tcp" });
        listener.close();
        return port;
      } catch {
        continue;
      }
    }
    return startPort;
  }

  /**
   * 初始化缓存服务
   */
  private initializeCache(config: AppConfig): void {
    const cacheConfig = config.cache || {};
    const adapterType = cacheConfig.adapter || "memory";
    const logger = this.serviceContainer.get<Logger>("logger");

    let adapter: CacheAdapter;

    switch (adapterType) {
      case "redis":
        if (cacheConfig.redis) {
          // 如果配置了 Redis，尝试连接
          // 注意：这里需要引入 Redis 客户端，目前仅作为接口预留
          // 实际项目中应引入 redis 库，例如：import { connect } from "https://deno.land/x/redis/mod.ts";
          logger?.warn("Redis 缓存适配器尚未完全实现，降级为内存缓存");
          adapter = new MemoryCacheAdapter();
        } else {
          logger?.warn("Redis 缓存配置不完整，降级为内存缓存");
          adapter = new MemoryCacheAdapter();
        }
        break;

      case "file": {
        const cacheDir = cacheConfig.file?.dir || ".cache";
        adapter = new FileCacheAdapter(cacheDir, cacheConfig.ttl);
        break;
      }

      case "memory":
      default:
        // 默认使用内存缓存
        adapter = new MemoryCacheAdapter();
        break;
    }

    this.serviceContainer.registerSingleton("cache", () => adapter);
  }

  /**
   * 初始化队列服务
   * 根据配置创建队列管理器并初始化队列
   */
  private async initializeQueue(config: AppConfig): Promise<void> {
    const queueConfig = config.queue;
    if (!queueConfig) {
      // 如果没有配置队列，则不初始化
      return;
    }

    const logger = this.serviceContainer.get<Logger>("logger");
    const adapterType = queueConfig.adapter || "memory";

    // 如果使用 Redis 适配器，需要创建 Redis 客户端
    if (adapterType === "redis") {
      if (!queueConfig.redis) {
        logger?.warn(
          "队列配置为 Redis 但未提供 Redis 连接配置，降级为内存队列",
        );
      } else {
        try {
          // 动态导入 Redis 客户端（只在需要时导入，避免命令行工具加载 Application 时出错）
          const { createClient } = await import("redis");

          // 创建 Redis 客户端
          const redisClient = createClient({
            socket: {
              host: queueConfig.redis.host,
              port: queueConfig.redis.port,
            },
            password: queueConfig.redis.password,
            database: queueConfig.redis.db || 0,
          });

          await redisClient.connect();
          this.queueManager?.setRedisClient(redisClient);
          logger?.info(
            `队列服务已连接到 Redis: ${queueConfig.redis.host}:${queueConfig.redis.port}`,
          );
        } catch (err) {
          logger?.error(
            `连接 Redis 失败: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          logger?.warn("队列服务降级为内存队列");
          throw new Error(
            `Failed to connect to Redis: ${
              err instanceof Error ? err.message : String(err)
            }. Please install Redis client: deno add npm:redis@^4.6.0`,
          );
        }
      }
    }

    // 初始化队列列表
    if (queueConfig.queues) {
      for (
        const [queueName, queueOptions] of Object.entries(
          queueConfig.queues,
        )
      ) {
        const storage = queueOptions.storage || adapterType;
        const redisConfig =
          storage === "redis" && this.queueManager?.getRedisClient()
            ? {
              client: this.queueManager?.getRedisClient(),
              keyPrefix: queueOptions.keyPrefix,
            }
            : undefined;

        this.queueManager?.addQueue(queueName, {
          concurrency: queueOptions.concurrency || 1,
          retry: queueOptions.retry || 0,
          retryInterval: queueOptions.retryInterval || 1000,
          priority: queueOptions.priority || "normal",
          storage: storage as "memory" | "redis",
          redis: redisConfig,
        });

        logger?.info(`队列 "${queueName}" 已初始化`);
      }
    }

    // 初始化队列管理器
    await this.queueManager?.initialize();
  }

  /**
   * 初始化安全中间件
   */
  private initializeSecurity(config: AppConfig): void {
    // 如果没有配置 security，或者 explicitly enabled
    if (config.security) {
      if (config.security.helmet) {
        const options = typeof config.security.helmet === "object"
          ? config.security.helmet
          : {};
        this.middlewareManager.add(helmet(options));
      }

      if (config.security.csp) {
        const options = typeof config.security.csp === "object"
          ? config.security.csp
          : {};
        this.middlewareManager.add(contentSecurityPolicy(options));
      }
    }
  }

  /**
   * 初始化错误处理器
   */
  private initializeErrorHandler(): void {
    // 如果已经设置了错误处理器，则不进行任何操作
    if (this.errorHandler) {
      return;
    }

    // 获取日志服务
    let logger;
    if (this.serviceContainer.has("logger")) {
      logger = this.serviceContainer.get("logger") as Logger;
    }

    // 获取配置
    const config = this.configManager.getConfig();
    const isProduction = config.isProduction ?? false;

    // 创建默认错误处理器
    this.errorHandler = new DefaultErrorHandler(
      {
        includeStack: !isProduction,
        format: "auto",
      },
      logger,
    );

    // 注册到服务容器
    this.serviceContainer.registerSingleton(
      "errorHandler",
      () => this.errorHandler!,
    );
  }

  /**
   * 设置自定义错误处理器
   * @param errorHandler - 错误处理器
   */
  setErrorHandler(errorHandler: ErrorHandler): void {
    this.errorHandler = errorHandler;
    if (this._server) {
      this._server.setErrorHandler(errorHandler);
    }
  }

  /**
   * 验证生产环境配置
   * 检查 TLS 配置等生产环境要求
   */
  private validateProductionConfig(config: AppConfig): void {
    // 生产环境不允许使用 tls: true（必须使用自定义证书）
    if (config.server?.tls === true) {
      throw new Error(
        '生产环境不允许使用 tls: true，必须提供自定义证书配置。\n请使用 tls: { certFile: "...", keyFile: "..." } 或 tls: { cert: ..., key: ... }',
      );
    }
  }

  /** 是否已设置信号监听器（防止重复注册） */
  private signalListenersSetup: boolean = false;

  /**
   * 设置开发环境启动逻辑
   * 包括自动打开浏览器和信号处理
   */
  private setupDevStartup(config: AppConfig): void {
    // 如果配置了自动打开浏览器
    if (config.dev?.open && config.server) {
      setTimeout(() => {
        const protocol = config.server!.tls ? "https" : "http";
        const host = config.server!.host || "localhost";
        const port = config.server!.port || 3000;
        const url = `${protocol}://${host}:${port}`;
        try {
          const command = new Deno.Command("open", {
            args: [url],
            stdout: "null",
            stderr: "null",
          });
          command.spawn();
        } catch {
          // 忽略错误
        }
      }, 1000);
    }

    // 设置信号监听器（开发环境也执行优雅关闭，确保队列等服务的生命周期方法被调用）
    // 防止重复注册信号监听器
    if (this.signalListenersSetup) {
      return;
    }
    this.signalListenersSetup = true;

    const cleanup = async () => {
      try {
        await this.lifecycleManager.stop();
      } catch (error) {
        console.error("优雅关闭失败:", error);
      } finally {
        // 确保进程退出
        Deno.exit(0);
      }
    };

    Deno.addSignalListener("SIGTERM", async () => await cleanup());
    Deno.addSignalListener("SIGINT", async () => await cleanup());
  }

  /**
   * 设置生产环境关闭逻辑
   * 使用优雅关闭
   */
  private setupProductionShutdown(): void {
    // 防止重复注册信号监听器
    if (this.signalListenersSetup) {
      return;
    }
    this.signalListenersSetup = true;

    // 设置信号监听器（开发环境也执行优雅关闭，确保队列等服务的生命周期方法被调用）
    const cleanup = async () => {
      try {
        // 调用生命周期管理器的 stop 方法，这会触发所有服务的 stop 和 destroy 方法
        await this.lifecycleManager.stop();
      } catch (error) {
        console.error("优雅关闭失败:", error);
      } finally {
        // 确保进程退出
        Deno.exit(0);
      }
    };

    Deno.addSignalListener("SIGTERM", async () => await cleanup());
    Deno.addSignalListener("SIGINT", async () => await cleanup());
  }

  /**
   * 停止应用
   * 停止服务器并清理资源
   *
   * @example
   * ```ts
   * await app.stop();
   * ```
   */
  async stop(): Promise<void> {
    await this.lifecycleManager.stop();
  }

  /**
   * 获取服务器实例（实现 AppLike 接口）
   * @returns 服务器实例
   */
  get server(): Server {
    return this._server;
  }

  /**
   * 获取中间件管理器（实现 AppLike 接口）
   * @returns 中间件管理器实例
   */
  get middleware(): MiddlewareManager {
    return this.middlewareManager;
  }

  /**
   * 获取插件管理器（实现 AppLike 接口）
   * @returns 插件管理器实例
   */
  get plugins(): PluginManager {
    return this.pluginManager;
  }

  /**
   * 获取服务容器（实现 AppLike 接口）
   * @returns 服务容器实例
   */
  getServiceContainer(): ServiceContainer {
    return this.serviceContainer as ServiceContainer;
  }

  /**
   * 注册中间件
   *
   * @param middleware - 中间件函数或配置对象
   *
   * @example
   * ```ts
   * app.use(async (req, res, next) => {
   *   console.log('请求:', req.url);
   *   await next();
   * });
   * ```
   */
  use(middleware: Middleware | MiddlewareConfig): void {
    this.middlewareManager.add(middleware);
  }

  /**
   * 注册插件
   *
   * @param plugin - 插件对象或插件配置对象
   *
   * @example
   * ```ts
   * app.plugin({
   *   name: 'my-plugin',
   *   onInit: async (app) => {
   *     console.log('插件初始化');
   *   },
   * });
   * ```
   */
  plugin(
    plugin: Plugin | { name: string; config?: Record<string, unknown> },
  ): void {
    this.pluginManager.register(plugin);
  }

  /**
   * 获取服务
   * 从服务容器中获取已注册的服务
   *
   * @param token - 服务令牌
   * @returns 服务实例
   *
   * @example
   * ```ts
   * const logger = app.getService<Logger>('logger');
   * ```
   */
  getService<T>(token: ServiceToken<T>): T {
    return this.serviceContainer.get<T>(token);
  }

  /**
   * 注册服务
   * 向服务容器注册服务
   *
   * @param token - 服务令牌
   * @param factory - 服务工厂函数
   * @param lifetime - 服务生命周期（可选，默认为单例）
   *
   * @example
   * ```ts
   * app.registerService('logger', () => new Logger(), ServiceLifetime.Singleton);
   * ```
   */
  registerService<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    lifetime: ServiceLifetime = ServiceLifetime.Singleton,
  ): void {
    if (lifetime === ServiceLifetime.Singleton) {
      this.serviceContainer.registerSingleton(token, factory);
    } else if (lifetime === ServiceLifetime.Transient) {
      this.serviceContainer.registerTransient(token, factory);
    } else if (lifetime === ServiceLifetime.Scoped) {
      this.serviceContainer.registerScoped(token, factory);
    }
  }

  /**
   * 获取应用上下文
   *
   * @returns 应用上下文实例
   */
  getContext(): ApplicationContext {
    return this.context;
  }

  /**
   * 获取渲染适配器
   *
   * @returns 当前渲染适配器
   */
  getRenderAdapter(): RenderAdapter {
    return this.renderAdapterManager.getAdapter();
  }

  /**
   * 切换渲染引擎
   *
   * @param engine - 渲染引擎名称
   *
   * @example
   * ```ts
   * await app.setRenderEngine('preact');
   * ```
   */
  async setRenderEngine(engine: RenderEngine): Promise<void> {
    await this.renderAdapterManager.setEngine(engine);
  }

  /**
   * 注册核心服务
   * 注册框架内部使用的核心服务
   */
  private registerCoreServices(): void {
    // 注册服务容器自身
    this.serviceContainer.registerSingleton(
      "serviceContainer",
      () => this.serviceContainer,
    );

    // 注册配置管理器
    this.serviceContainer.registerSingleton(
      "configManager",
      () => this.configManager,
    );

    // 注册应用上下文
    this.serviceContainer.registerSingleton("context", () => this.context);

    // 注册生命周期管理器
    this.serviceContainer.registerSingleton(
      "lifecycleManager",
      () => this.lifecycleManager,
    );

    // 注册服务器
    this.serviceContainer.registerSingleton("server", () => this._server);

    // 注册中间件管理器
    this.serviceContainer.registerSingleton(
      "middleware",
      () => this.middlewareManager,
    );

    // 注册插件管理器
    this.serviceContainer.registerSingleton(
      "plugins",
      () => this.pluginManager,
    );
    // 注册队列管理器
    this.serviceContainer.registerSingleton(
      "queueManager",
      () => this.queueManager,
    );
  }

  /**
   * 注册服务
   * 根据配置注册所有需要的服务
   */
  private async registerServices(): Promise<void> {
    const config = this.configManager.getConfig();

    // 注册 Logger 服务（核心服务，始终注册）
    const { Logger } = await import("../features/logger.ts");
    const logger = new Logger();
    this.serviceContainer.registerSingleton("logger", () => logger);

    // 为了向后兼容，设置全局默认日志器
    const { setLogger } = await import("../features/logger.ts");
    setLogger(logger);

    // 注册 Monitor 服务（核心服务，始终注册）
    const { Monitor } = await import("../features/monitoring.ts");
    const monitor = new Monitor();
    this.serviceContainer.registerSingleton("monitor", () => monitor);

    // 为了向后兼容，设置全局默认监控器
    const { setMonitor } = await import("../features/monitoring.ts");
    setMonitor(monitor);

    // 注册 Cookie 管理器（如果配置了）
    if (config.cookie) {
      const cookieManager = new CookieManager(config.cookie.secret);
      this.serviceContainer.registerSingleton(
        "cookieManager",
        () => cookieManager,
      );
    }

    // 注册 Session 管理器（如果配置了）
    if (config.session) {
      const sessionManager = new SessionManager(config.session);
      this.serviceContainer.registerSingleton(
        "sessionManager",
        () => sessionManager,
      );
    }

    if (config.database) {
      const databaseManager = new DatabaseManager();
      // 初始化数据库管理器（会自动连接数据库）
      await databaseManager.initialize();
      // 注册到服务容器
      this.serviceContainer.registerSingleton(
        "databaseManager",
        () => databaseManager,
      );
    }
  }

  /**
   * 初始化数据库
   * 如果配置了数据库，则初始化数据库连接
   */
  // private async initializeDatabase(config: AppConfig): Promise<void> {
  //   // 设置数据库配置加载器（用于 DatabaseManager 的自动初始化）
  //   const { setDatabaseConfigLoader } = await import(
  //     "../features/database/access.ts"
  //   );
  //   setDatabaseConfigLoader(() => {
  //     return Promise.resolve(config.database || null);
  //   });

  //   // 如果配置了数据库，创建并初始化 DatabaseManager
  //   // 数据库连接会在 DatabaseManager.onInitialize() 中自动完成
  //   if (config.database) {
  //     console.log("[Application] 开始初始化数据库，配置存在");
  //     try {
  //       const { DatabaseManager } = await import(
  //         "../features/database/manager.ts"
  //       );
  //       const databaseManager = new DatabaseManager();
  //       console.log(
  //         "[Application] DatabaseManager 实例已创建，准备调用 initialize()",
  //       );

  //       // 初始化数据库管理器（会自动连接数据库）
  //       await databaseManager.initialize();
  //       console.log("[Application] DatabaseManager.initialize() 已完成");

  //       // 注册到服务容器
  //       this.serviceContainer.registerSingleton(
  //         "databaseManager",
  //         () => databaseManager,
  //       );

  //       // 为了向后兼容，同时设置全局变量（access.ts 中使用）
  //       const accessModule = await import(
  //         "../features/database/access.ts"
  //       ) as { setDatabaseManager?: (manager: typeof databaseManager) => void };
  //       if (accessModule.setDatabaseManager) {
  //         accessModule.setDatabaseManager(databaseManager);
  //       }

  //       const logger = this.serviceContainer.get<Logger>("logger");
  //       if (logger) {
  //         logger.info("数据库连接已初始化");
  //       }
  //     } catch (error) {
  //       const message = error instanceof Error ? error.message : String(error);
  //       const logger = this.serviceContainer.get<Logger>("logger");
  //       if (logger) {
  //         logger.error(`数据库连接失败: ${message}`);
  //       }
  //       // 不阻止服务器启动，但记录错误
  //     }
  //   }
  // }

  /**
   * 初始化 GraphQL 服务器
   * 如果配置了 GraphQL，则创建 GraphQL 服务器
   */
  private async initializeGraphQL(config: AppConfig): Promise<void> {
    if (config.graphql) {
      const { GraphQLServer } = await import("../features/graphql/server.ts");
      const graphqlServer = new GraphQLServer(
        config.graphql.schema,
        config.graphql.config,
      );

      // 注册 GraphQL 服务器到服务容器
      this.serviceContainer.registerSingleton(
        "graphqlServer",
        () => graphqlServer,
      );

      const logger = this.serviceContainer.get<Logger>("logger");
      if (logger) {
        logger.info(`GraphQL 服务器已启动`, {
          endpoint: config.graphql.config?.path || "/graphql",
        });
        if (config.graphql.config?.graphiql !== false) {
          logger.info(`GraphiQL 端点`, {
            path: config.graphql.config?.graphiqlPath || "/graphiql",
          });
        }
      }
    }
  }

  /**
   * 初始化中间件和插件
   * 从配置和 main.ts 加载中间件和插件
   */
  private initializeMiddlewareAndPlugins(
    config: AppConfig,
  ): void {
    // 添加配置的中间件
    if (config.middleware) {
      this.middlewareManager.addMany(config.middleware);
    }

    // 添加配置的插件
    if (config.plugins) {
      this.pluginManager.registerMany(config.plugins);
    }
  }

  /**
   * 初始化 WebSocket 服务器
   * 如果配置了 WebSocket，则创建 WebSocket 服务器
   */
  private async initializeWebSocket(config: AppConfig): Promise<void> {
    if (config.websocket) {
      const { WebSocketServer } = await import(
        "../features/websocket/server.ts"
      );
      const { initWebSocket } = await import("../features/websocket/access.ts");
      const wsServer = new WebSocketServer(config.websocket);
      initWebSocket(wsServer);

      // 注册 WebSocket 服务器到服务容器
      this.serviceContainer.registerSingleton(
        "webSocketServer",
        () => wsServer,
      );

      const logger = this.serviceContainer.get<Logger>("logger");
      if (logger) {
        logger.info(`WebSocket 服务器已启动`, {
          path: config.websocket.path || "/ws",
        });
      }

      // 设置 WebSocket 升级处理器
      this._server.setWebSocketUpgradeHandler((req: globalThis.Request) => {
        const url = new URL(req.url);
        const wsPath = config.websocket!.path || "/ws";
        if (url.pathname === wsPath || url.pathname.startsWith(wsPath + "/")) {
          return wsServer.handleUpgrade(req);
        }
        return null;
      });
    }
  }

  /**
   * 初始化路由
   * 根据配置创建和初始化路由管理器
   */
  private async initializeRouter(): Promise<void> {
    const config = this.configManager.getConfig();
    const routesConfig = normalizeRouteConfig(config.routes!);

    // 创建路由管理器
    this.router = new Router(
      routesConfig.dir,
      routesConfig.ignore,
      config.basePath,
      routesConfig.apiDir,
    );

    // 根据环境加载路由
    const isProduction = config.isProduction ?? false;
    if (isProduction && config.build?.outDir) {
      // 生产环境：从构建映射文件加载
      let outDir = config.build.outDir;
      if (await isMultiAppMode() && config.name) {
        outDir = `${outDir}/${config.name}`;
      }
      const path = await import("@std/path");
      const serverRouteMapPath = path.join(outDir, "server.json");
      const clientRouteMapPath = path.join(outDir, "client.json");

      // 检查构建输出目录是否存在
      const hasBuildOutput = await Deno.stat(serverRouteMapPath)
        .then(() => true)
        .catch(() => false);

      if (hasBuildOutput) {
        // 如果构建输出目录存在，从构建映射文件加载
        await this.router.loadFromBuildMap(
          serverRouteMapPath,
          clientRouteMapPath,
          outDir,
        );
      } else {
        // 如果构建输出目录不存在，回退到扫描文件系统（用于开发或测试环境）
        // 这样可以避免在没有构建的情况下无法启动服务器
        console.warn(
          `⚠️  构建输出目录不存在 (${serverRouteMapPath})，回退到扫描文件系统模式`,
        );
        await this.router.scan();
      }
    } else {
      // 开发环境：扫描文件系统
      await this.router.scan();
    }

    // 预加载所有模块（解决首次访问延迟问题）
    await this.preloadModules();

    // 预先加载 import map 脚本
    const { preloadImportMapScript } = await import("./route-handler.ts");
    await preloadImportMapScript();

    // 注册路由管理器到服务容器
    this.serviceContainer.registerSingleton("router", () => this.router!);
  }

  /**
   * 预加载所有路由模块、布局和错误页面
   * 解决首次访问延迟问题
   */
  private async preloadModules(): Promise<void> {
    if (!this.router) {
      return;
    }

    const routes = this.router.getAllRoutes();
    const preloadPromises: Promise<void>[] = [];

    // 预加载路由模块（页面和 API）
    for (const route of routes) {
      if (route.type === "page" || route.type === "api") {
        const modulePath = route.filePath.startsWith("file://")
          ? route.filePath
          : `file://${route.filePath}`;
        preloadPromises.push(
          import(modulePath).catch(() => {
            // 预加载失败时静默处理
          }),
        );
      }
    }

    // 收集所有布局路径
    const layoutPaths = new Set<string>();
    for (const route of routes) {
      const layoutPath = this.router.getLayout(route.path);
      if (layoutPath) {
        layoutPaths.add(layoutPath);
      }
    }

    // 预加载布局
    for (const layoutPath of layoutPaths) {
      const modulePath = layoutPath.startsWith("file://")
        ? layoutPath
        : `file://${layoutPath}`;
      preloadPromises.push(
        import(modulePath).catch(() => {
          // 预加载失败时静默处理
        }),
      );
    }

    // 预加载错误页面
    const error404Path = this.router.getErrorPage("404");
    if (error404Path) {
      const modulePath = error404Path.startsWith("file://")
        ? error404Path
        : `file://${error404Path}`;
      preloadPromises.push(import(modulePath).catch(() => {}));
    }

    const errorPagePath = this.router.getErrorPage("error");
    if (errorPagePath) {
      const modulePath = errorPagePath.startsWith("file://")
        ? errorPagePath
        : `file://${errorPagePath}`;
      preloadPromises.push(import(modulePath).catch(() => {}));
    }

    // 预加载 _app.tsx（根应用组件，必需）
    const appPath = this.router.getApp();
    if (appPath) {
      const modulePath = appPath.startsWith("file://")
        ? appPath
        : `file://${appPath}`;
      preloadPromises.push(import(modulePath).catch(() => {}));
    }

    // 等待所有模块预加载完成
    await Promise.all(preloadPromises);
  }

  /**
   * 初始化路由处理器
   * 创建路由处理器并注册到服务容器
   */
  private initializeRouteHandler(): void {
    if (!this.router) {
      throw new Error("路由管理器未初始化");
    }

    const config = this.configManager.getConfig();

    // 获取渲染适配器
    const renderAdapter = this.renderAdapterManager.getAdapter();

    // 获取可选的服务
    const cookieManager = this.serviceContainer.has("cookieManager")
      ? this.serviceContainer.get<CookieManager>("cookieManager")
      : undefined;

    const sessionManager = this.serviceContainer.has("sessionManager")
      ? this.serviceContainer.get<SessionManager>("sessionManager")
      : undefined;

    // 获取 GraphQL 服务器（如果已注册）
    // 使用类型断言，因为 GraphQLServer 类型在运行时才可用
    const graphqlServer = this.serviceContainer.has("graphqlServer")
      ? (this.serviceContainer.get("graphqlServer") as any)
      : undefined;

    // 获取缓存适配器
    const cacheAdapter = this.serviceContainer.has("cache")
      ? this.serviceContainer.get<CacheAdapter>("cache")
      : undefined;

    // 创建路由处理器
    // 传递 Application 实例，以便在 API 路由中可以通过 req.getApplication() 获取
    this.routeHandler = new RouteHandler(
      this.router,
      renderAdapter,
      cookieManager,
      sessionManager,
      config,
      graphqlServer,
      this, // 传递 Application 实例
      cacheAdapter,
    );

    // 注册路由处理器到服务容器
    this.serviceContainer.registerSingleton(
      "routeHandler",
      () => this.routeHandler!,
    );
  }

  /**
   * 初始化服务器
   * 配置服务器的请求处理器、中间件和插件
   */
  private async initializeServer(): Promise<void> {
    if (!this.routeHandler) {
      throw new Error("路由处理器未初始化");
    }

    const config = this.configManager.getConfig();

    // 获取服务
    const cookieManager = this.serviceContainer.has("cookieManager")
      ? this.serviceContainer.get<CookieManager>("cookieManager")
      : null;

    const sessionManager = this.serviceContainer.has("sessionManager")
      ? this.serviceContainer.get<SessionManager>("sessionManager")
      : null;

    // 设置内置中间件
    const { logger } = await import("../middleware/logger.ts");
    const { bodyParser } = await import("../middleware/body-parser.ts");
    const isProduction = config.isProduction ?? false;

    this.middlewareManager.add(
      logger({
        format: isProduction ? "combined" : "dev",
        // 开发环境：跳过 .well-known 路径的请求和 Vite 客户端请求
        skip: isProduction
          ? undefined
          : (req: { url: string; method: string }) => {
            const url = new URL(req.url);
            return url.pathname.startsWith("/.well-known/") ||
              url.pathname === "/@vite/client";
          },
      }),
    );
    this.middlewareManager.add(bodyParser());

    // 添加配置的中间件
    if (config.middleware) {
      this.middlewareManager.addMany(config.middleware);
    }

    // 添加静态资源中间件
    await this.setupStaticMiddleware(config, isProduction);

    // 设置请求处理器（包含中间件和插件逻辑）
    const requestHandler = this.createRequestHandler(
      cookieManager,
      sessionManager,
    );
    this._server.setHandler(requestHandler);

    // 设置错误处理器
    if (this.errorHandler) {
      this._server.setErrorHandler(this.errorHandler);
    }
  }

  /**
   * 设置静态资源中间件
   */
  private async setupStaticMiddleware(
    config: AppConfig,
    isProduction: boolean,
  ): Promise<void> {
    const { staticFiles } = await import("../middleware/static.ts");
    const { createScriptServerMiddleware } = await import(
      "../server/utils/script-server.ts"
    );

    // 添加脚本服务中间件（在静态文件中间件之前）
    this.middlewareManager.add(createScriptServerMiddleware());

    try {
      let staticDir: string;
      if (isProduction) {
        const outDir = config.build?.outDir || "dist";
        staticDir = path.join(outDir, config.static?.dir || "assets");
      } else {
        staticDir = config.static?.dir || "assets";
      }

      // 优化：生产环境设置更长的缓存时间
      const defaultMaxAge = isProduction ? 31536000 : 0; // 生产环境：1年，开发环境：不缓存

      if (config.static) {
        this.middlewareManager.add(staticFiles({
          ...config.static,
          dir: staticDir,
          // 如果用户没有设置 maxAge，使用默认值
          maxAge: config.static.maxAge ?? defaultMaxAge,
        }));
      } else {
        this.middlewareManager.add(staticFiles({
          dir: staticDir,
          maxAge: defaultMaxAge,
        }));
      }
    } catch {
      // 静态资源目录不存在时忽略
    }
  }

  /**
   * 创建请求处理器
   * 包含中间件链、插件钩子和路由处理逻辑
   */
  private createRequestHandler(
    cookieManager: CookieManager | null,
    sessionManager: SessionManager | null,
  ) {
    return async (req: Request, res: Response): Promise<void> => {
      // 设置 Session 支持
      if (sessionManager) {
        this.setupSessionSupport(req, res, sessionManager, cookieManager);
      }

      // 执行插件请求钩子
      await this.pluginManager.executeOnRequest(req, res);

      // 如果插件已经设置了响应（例如 Tailwind CSS 编译），跳过中间件和路由处理
      if (res.body) {
        await this.pluginManager.executeOnResponse(req, res);
        return;
      }

      // 执行中间件链
      // 使用 getAll() 获取中间件处理函数数组（用于执行）
      const middlewares = this.middlewareManager.getAll();
      let index = 0;
      const next = async (): Promise<void> => {
        try {
          if (index < middlewares.length) {
            const middleware = middlewares[index++];
            await middleware(req, res, next, this.context);
          } else {
            // 所有中间件执行完毕，处理路由
            if (this.routeHandler) {
              await this.routeHandler.handle(req, res);
            }

            // 执行插件响应钩子
            await this.pluginManager.executeOnResponse(req, res);

            // 如果插件清空了响应体，恢复它
            if (!res.body && res.status === 200) {
              const logger = this.serviceContainer.get<Logger>("logger");
              if (logger) {
                logger.error("插件处理错误", undefined, {
                  url: req.url,
                  method: req.method,
                  errorMessage: "响应体在插件处理后丢失",
                });
              }
              res.status = 500;
              res.html(
                `<h1>500 - Internal Server Error</h1><p>响应体在插件处理后丢失</p>`,
              );
            }
          }
        } catch (error) {
          // 捕获中间件或路由处理过程中的错误
          const logger = this.serviceContainer.get<Logger>("logger");
          if (logger) {
            logger.error(
              "请求处理异常",
              error instanceof Error ? error : undefined,
              {
                url: req.url,
                method: req.method,
              },
            );
          }

          // 确保错误响应已设置
          if (!res.body || res.status === 200) {
            res.status = 500;
            const errorMessage = error instanceof Error
              ? error.message
              : String(error);
            res.html(
              `<h1>500 - Internal Server Error</h1><p>${errorMessage}</p>`,
            );
          }

          // 重新抛出错误，让上层的错误处理机制处理
          throw error;
        }
      };

      await next();
    };
  }

  /**
   * 设置 Session 支持
   */
  private setupSessionSupport(
    req: Request,
    res: Response,
    sessionManager: SessionManager,
    cookieManager: CookieManager | null,
  ): void {
    const cookieName = sessionManager.getCookieName();
    const sessionId = req.getCookie(cookieName);

    // 添加 createSession 方法
    (req as any).createSession = async (data: Record<string, unknown> = {}) => {
      const session = await sessionManager.create(data);
      (req as any).session = session;

      // 设置 Session Cookie
      if (cookieManager) {
        const cookieValue = await cookieManager.setAsync(
          cookieName,
          session.id,
          {
            httpOnly: true,
            secure: (sessionManager as any).config?.secure || false,
            maxAge: (sessionManager as any).config?.maxAge || 3600,
          },
        );
        res.setHeader("Set-Cookie", cookieValue);
      }

      return session;
    };

    // 添加 getSession 方法
    (req as any).getSession = async (): Promise<Session | null> => {
      if (sessionId) {
        const session = await sessionManager.get(sessionId);
        (req as any).session = session;
        return session;
      }
      return null;
    };

    // 设置 session 属性（延迟加载）
    Object.defineProperty(req, "session", {
      get: () => {
        return (req as any).__session || null;
      },
      set: (value) => {
        (req as any).__session = value;
      },
      enumerable: true,
      configurable: true,
    });

    // 初始化 Session（如果存在 sessionId）
    if (sessionId) {
      sessionManager.get(sessionId).then((session) => {
        (req as any).session = session;
      });
    }
  }

  /**
   * 初始化渲染适配器
   * 根据配置选择渲染引擎
   *
   * @param config - 应用配置
   */
  /**
   * 初始化渲染适配器
   * 从配置中读取渲染引擎设置，并初始化对应的适配器
   *
   * @param config - 应用配置
   */
  private async initializeRenderAdapter(config: AppConfig): Promise<void> {
    // 动态注册 React 和 Vue3 适配器（如果可用）
    // 这些适配器在构造函数中不注册，因为需要异步导入
    if (!this.renderAdapterManager.has("react")) {
      try {
        const { ReactRenderAdapter } = await import("./render/react.ts");
        this.renderAdapterManager.register(new ReactRenderAdapter());
      } catch (_error) {
        // React 适配器不可用，忽略
      }
    }

    if (!this.renderAdapterManager.has("vue3")) {
      try {
        const { Vue3RenderAdapter } = await import("./render/vue3.ts");
        this.renderAdapterManager.register(new Vue3RenderAdapter());
      } catch (_error) {
        // Vue3 适配器不可用，忽略
      }
    }

    // 从配置中获取渲染引擎（如果未配置则使用默认的 Preact）
    const renderEngine = config.render?.engine || "preact";

    // 检查适配器是否已注册
    if (!this.renderAdapterManager.has(renderEngine)) {
      throw new Error(
        `渲染引擎未注册: ${renderEngine}。请确保已安装对应的依赖包。`,
      );
    }

    // 设置渲染引擎
    await this.renderAdapterManager.setEngine(renderEngine);

    // 注册渲染适配器管理器到服务容器
    this.serviceContainer.registerSingleton(
      "renderAdapterManager",
      () => this.renderAdapterManager,
    );
  }
}
