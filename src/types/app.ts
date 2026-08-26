/**
 * App 类型定义
 *
 * 定义 AppConfig、IApp、AppPlugin、AppStage、DatabaseAppConfig、SocketConfig 等
 * 应用配置与生命周期相关类型。
 *
 * @module
 */

import type { DatabaseConfig, DatabaseManagerOptions } from "@dreamer/database";
import type { BuilderConfig, ServerConfig } from "@dreamer/esbuild";
import type { LifecycleStage } from "@dreamer/lifecycle";
import type { Logger, LoggerConfig } from "@dreamer/logger";
import type {
  Middleware,
  MiddlewareCondition,
  MiddlewareContext,
} from "@dreamer/middleware";
import type {
  CompressionOptions,
  CorsOptions,
  MetricsOptions,
  RateLimitOptions,
} from "@dreamer/middlewares";
import type { Plugin, PluginManagerOptions } from "@dreamer/plugin";
import type { Engine } from "@dreamer/render";
import type { RouterOptions } from "@dreamer/router";
import type { ServerOptions } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import type { SessionOptions } from "@dreamer/session";

/**
 * 框架层构建配置
 *
 * 在 BuilderConfig 基础上将 server.entry、server.output 设为可选，
 * 未设置时由框架根据执行入口自动推断。
 *
 * @example
 * ```ts
 * const build: BuildAppConfig = {
 *   server: { entry: "src/main.ts", output: "dist" },
 * };
 * ```
 */
/** 开发态缓存调优（默认见 @dreamer/dweb 的 DEFAULT_CACHE_OPTIONS） */
export interface DevCacheOptions {
  /** CSS 路由模块缓存最大条目数（默认 500） */
  maxCssRouteCacheSize?: number;
  /** 模块版本 map 最大条目数（默认 2000） */
  maxVersionMapSize?: number;
  /** 模块版本 map 淘汰触发间隔（默认 50） */
  evictionBatchInterval?: number;
}

export type BuildAppConfig = Omit<BuilderConfig, "server"> & {
  server?: Omit<ServerConfig, "entry" | "output"> & {
    /** 入口文件，不设置时使用当前执行入口（如 src/backend/main.ts） */
    entry?: string;
    /** 输出目录，不设置时按入口目录推断（如 dist/backend）或 dist */
    output?: string;
  };
  /** 开发态缓存选项（路由/CSS 缓存、模块版本 map 容量与淘汰间隔），不设置则用框架默认值 */
  devCache?: DevCacheOptions;
};

/** 安全响应头配置；默认不启用，避免破坏已有 CSP / iframe / HMR 场景。 */
export interface SecurityHeadersConfig {
  /** 是否启用安全响应头。`securityHeaders: true` 等价于启用默认安全头。 */
  enabled?: boolean;
  /** Content-Security-Policy；传 false 表示不设置 CSP。 */
  contentSecurityPolicy?: string | false;
  /** X-Frame-Options；传 false 表示不设置。 */
  frameOptions?: "DENY" | "SAMEORIGIN" | false;
  /** Referrer-Policy；传 false 表示不设置。 */
  referrerPolicy?: string | false;
  /** Permissions-Policy；传 false 表示不设置。 */
  permissionsPolicy?: string | false;
  /** 额外响应头，会覆盖默认同名安全头。 */
  headers?: Record<string, string | false | undefined>;
}

/**
 * 数据库应用配置
 *
 * 支持默认连接和命名连接，可配置 DatabaseManager 选项。
 *
 * @example
 * ```ts
 * database: {
 *   default: { driver: "sqlite", database: "./data.db" },
 *   connections: { read: { driver: "postgres", host: "localhost" } },
 * }
 * ```
 */
export interface DatabaseAppConfig {
  /** 默认连接配置 */
  default?: DatabaseConfig;
  /** 命名连接配置 */
  connections?: Record<string, DatabaseConfig>;
  /** 数据库管理器选项 */
  managerOptions?: DatabaseManagerOptions;
}

/**
 * HTTP 请求结束观测信息（`AppConfig.onRequestEnd` / 插件 `onRequestEnd`）
 */
export interface RequestEndInfo {
  path: string;
  method: string;
  status: number;
  durationMs: number;
}

/**
 * 应用配置接口
 *
 * 包含所有集成库的配置选项：服务器、路由、渲染、插件、中间件、日志、数据库、Socket 等。
 *
 * @example
 * ```ts
 * const config: AppConfig = {
 *   name: "my-app",
 *   version: "1.0.0",
 *   server: { port: 3000 },
 *   plugins: ["@dreamer/dweb-plugin-static"],
 * };
 * ```
 */
/**
 * 框架支持的语言列表（与 utils/i18n 的 SUPPORTED_LOCALES 一致）
 *
 * 用于 CLI 输出、日志、错误消息等框架内置文案。
 * 在 config/main.ts 中设置 language 或在环境变量 LANGUAGE/LC_ALL/LANG 中指定。
 */
export const SUPPORTED_APP_LANGUAGES = [
  "zh-CN",
  "zh-TW",
  "en-US",
  "ja-JP",
  "ko-KR",
  "es-ES",
  "pt-BR",
  "id-ID",
  "de-DE",
  "fr-FR",
] as const;

/** 框架支持的语言类型 */
export type AppLanguage = (typeof SUPPORTED_APP_LANGUAGES)[number];

/** 应用种类（与单应用/多应用正交；缺省视为 web） */
export type AppKind = "web" | "api" | "console";

/**
 * 解析应用种类：缺省或未设置时按 web（兼容旧项目）
 */
export function resolveAppKind(
  config: { kind?: AppKind } | null | undefined,
): AppKind {
  return config?.kind ?? "web";
}

/** 是否为纯 API 应用（无页面壳、不构建客户端） */
export function isApiKind(
  config: { kind?: AppKind } | null | undefined,
): boolean {
  return resolveAppKind(config) === "api";
}

/** 是否为 Console（CLI）应用（不 listen HTTP，由 dweb-cli run 驱动） */
export function isConsoleKind(
  config: { kind?: AppKind } | null | undefined,
): boolean {
  return resolveAppKind(config) === "console";
}

/**
 * Console 冷启动精简：`console.slim` 或 `DWEB_CONSOLE_SLIM`（环境变量优先）。
 * `1`/`true`/`yes` 开；`0`/`false`/`no` 关；未设 env 时读配置（默认 false）。
 */
export function resolveConsoleSlim(
  config: { console?: { slim?: boolean } } | null | undefined,
  envValue?: string | null,
): boolean {
  const raw = envValue?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return config?.console?.slim === true;
}

/** Console 应用专有选项（仅 kind=console 时生效） */
export interface ConsoleAppConfig {
  /**
   * 冷启动精简（默认 false）。跳过 banner、HTTP 中间件管理器等装饰性初始化；
   * 仍加载 config / logger / plugins+onInit 与可选 DB。可用 `DWEB_CONSOLE_SLIM=1` 覆盖。
   */
  slim?: boolean;
}

/**
 * App.start 选项
 *
 * - `mode: "console"`：跳过 HTTP listen / 客户端构建；结束后须 shutdown 以便 CLI 退出
 */
export interface AppStartOptions {
  /** 启动模式；缺省按配置 `kind`（web/api 走 HTTP，console 不 listen） */
  mode?: "web" | "console";
}

/**
 * App 构造可选参数（CLI 入口非 main.ts 时需显式指定配置目录）
 */
export interface AppConstructOptions {
  /**
   * 显式配置目录列表（相对或绝对路径）
   * 用于 `dweb-cli run`：入口为 cli.ts，无法从 main.ts 推断 config 目录
   */
  configDirectories?: string[];
  /** 初始启动模式提示（亦可在 start() 时再传） */
  mode?: "web" | "console";
}

export interface AppConfig extends Record<string, unknown> {
  /** 应用名称 */
  name?: string;
  /**
   * 应用种类：web（默认页面应用）| api（纯 HTTP API）| console（CLI 命令应用）
   * 缺省或未设置时按 web 处理，兼容旧项目
   */
  kind?: AppKind;
  /** 应用版本 */
  version?: string;
  /**
   * 框架语言（默认：自动检测环境变量 LANGUAGE/LC_ALL/LANG，检测不到则 en-US）
   * 影响 CLI 输出、日志、错误消息等框架内置文案
   */
  language?: AppLanguage;
  /** 环境变量前缀 */
  envPrefix?: string;
  /** 是否启用热重载（默认：开发环境启用） */
  hotReload?: boolean;
  /** 插件管理器配置选项 */
  pluginManagerOptions?: PluginManagerOptions;
  /** 服务器配置 */
  server?: ServerOptions;
  /** 路由配置 */
  router?: RouterOptions;
  /** 渲染配置 */
  render?: {
    /** 是否启用调试日志（默认：开发模式为 true） */
    debug?: boolean;
    /** 模板引擎（react、preact、view） */
    engine?: Engine;
    /** 渲染模式（ssr、csr、ssg、hybrid） */
    mode?: "ssr" | "csr" | "ssg" | "hybrid";
    /**
     * 页面 `load()` 结果短期内存缓存（**默认关闭**）。
     * 旧实现无条件缓存 URL+params 易跨用户串数据；仅在匿名只读页且理解风险时开启。
     * `true` 使用默认 TTL 1s；或 `{ ttlMs }`。
     */
    loadCache?: boolean | { ttlMs?: number };
    /** SSR 配置（mode 为 ssr 时生效） */
    ssr?: {
      /** 是否启用客户端激活（hydrate），默认 true；关闭后仅输出服务端 HTML，不注入 _client.js */
      hydrate?: boolean;
      /**
       * 是否启用流式 SSR（默认 false）。
       * 仅 `engine: "view"` 生效；生产若需 asset-manifest 路径重写会回退为缓冲字符串路径。
       */
      stream?: boolean;
    };
    /** SSG 配置（mode 为 ssg 时生效） */
    ssg?: {
      outputDir?: string;
      routes?: string[];
      /** 是否启用客户端激活（hydrate），默认 true；关闭后预渲染 HTML 不注入 _client.js */
      hydrate?: boolean;
      /** 小站可启用启动时预读 HTML 到内存。true 用默认阈值；或 { maxPages?, maxSizeMb? }（默认约 200 页、10 MB） */
      preloadHtml?: boolean | { maxPages?: number; maxSizeMb?: number };
      // 动态路由按参数展开：键为路由模式（如 /user/[id]），值为参数列表
      dynamicRoutes?: Record<string, string[]>;
    };
    /**
     * 整页水合错位策略（仅 `engine: "view"` 的 Hybrid/SSR 生效；React/Preact 忽略）。
     * 未设置时客户端仍走清空再 mount（与今日默认一致，等同 remount 兼容）。
     * - `continue` / `assert`：调用 view `hydrate(..., { mismatchMode })` 复用 SSR DOM
     * - `remount`：清空后 mount（显式选择今日默认）
     */
    hydration?: {
      mismatchMode?: "continue" | "assert" | "remount";
    };
  };
  /** 构建配置（entry/output 可选，由框架推断默认值） */
  build?: BuildAppConfig;
  /** 插件列表（用于注册插件） */
  plugins?: Array<Plugin | string>;
  /** 中间件列表（用于注册中间件） */
  middlewares?: Array<
    | Middleware<MiddlewareContext>
    | string
    | {
      middleware: Middleware<MiddlewareContext> | string;
      condition?: MiddlewareCondition;
      name?: string;
    }
  >;
  /** 日志配置 */
  logger?: LoggerConfig;
  /** 可选安全响应头；默认关闭，启用后在所有框架响应上追加安全头。 */
  securityHeaders?: boolean | SecurityHeadersConfig;
  /**
   * 可选 CORS 中间件（基于 `@dreamer/middlewares` cors）。
   * 默认关闭。
   * - `true`：库默认 `origin: "*"`（非 credentials）；生产请改用对象白名单
   * - 对象：透传 `CorsOptions`（推荐 `origin: ["https://app.example.com"]`）
   * 若同时配置 `socket`（socketio）且未写 socket.cors，会把此处 `origin` 桥接到 Socket.IO。
   */
  cors?: boolean | CorsOptions;
  /**
   * 可选响应压缩（基于 `@dreamer/middlewares` compression，gzip/可选 brotli）。
   * - `RUNTIME_ENV=dev`：默认关闭（可用 `true`/对象显式开启）
   * - `start`/`build`（非 dev）：**默认开启**；设 `false` 可关闭
   * - `true` 使用库默认阈值；对象则透传 `CompressionOptions`
   */
  compression?: boolean | CompressionOptions;
  /**
   * 可选简易限流（基于 `@dreamer/middlewares` rateLimit）。
   * 默认关闭；`true` 使用库默认，对象则透传 `RateLimitOptions`。
   */
  rateLimit?: boolean | RateLimitOptions;
  /**
   * 可选 Prometheus 风格指标（基于 `@dreamer/middlewares` metrics）。
   * 默认关闭；`true` 使用库默认（端点 `/metrics`）；对象则透传 `MetricsOptions`。
   * 与 `onRequestEnd` 互补：本项提供 scrape 端点，钩子用于自定义观测。
   */
  metrics?: boolean | MetricsOptions;
  /**
   * 每个 HTTP 请求结束后的观测钩子（状态码 + 耗时）。
   * 插件也可实现同名 `onRequestEnd`。
   */
  onRequestEnd?: (info: RequestEndInfo) => void | Promise<void>;
  /** 数据库配置 */
  database?: DatabaseAppConfig;
  /**
   * Console 专有选项（`kind: "console"`）；如 `slim` 冷启动精简。
   * 环境变量 `DWEB_CONSOLE_SLIM=1` 可覆盖 `console.slim`。
   */
  console?: ConsoleAppConfig;
  /**
   * 实时通信配置（可选）
   * type 为 socketio 时使用 Socket.IO；type 为 websocket 时使用原生 WebSocket（待实现）。
   * 配置后挂载到当前 HTTP 服务器同一端口，与主站共用 server.port / server.host。
   */
  socket?: SocketConfig;
  /**
   * 会话配置（可选）
   * 使用 @dreamer/session 的 SessionOptions：store 必填；可选 name、maxAge、cookie、autoSave、genId。
   * 其中 cookie 为 Cookie 选项（path、domain、secure、httpOnly、sameSite、maxAge、expires 等），由 session 中间件在设置 session Cookie 时应用。
   * 启用后 ctx.session 在 load()、API、中间件中可用。
   */
  session?: SessionOptions;
}

/**
 * 实时通信类型
 *
 * - socketio: 使用 Socket.IO
 * - websocket: 使用原生 WebSocket
 */
export type SocketType = "socketio" | "websocket";

/**
 * 实时通信应用配置（discriminated union）
 *
 * 根据 adapter 选择对应实现，挂载到主站 HTTP 服务器，与主站共用端口。
 *
 * @example
 * ```ts
 * // Socket.IO（推荐 config 嵌套）
 * socket: { adapter: "socketio", config: { path: "/socket.io/", allowCORS: true } }
 * // 或扁平结构
 * socket: { adapter: "socketio", path: "/socket.io/" }
 *
 * // WebSocket（推荐 config 嵌套，也支持扁平：path 直接写顶层）
 * socket: { adapter: "websocket", config: { path: "/ws" } }
 * socket: { adapter: "websocket", path: "/ws" }
 * ```
 */
/**
 * Socket.IO 适配器别名（socketio、socket-io、socket.io 均可）
 */
export const SOCKETIO_ADAPTERS = [
  "socketio",
  "socket-io",
  "socket.io",
] as const;

/** 判断是否为 Socket.IO 适配器（含别名） */
export function isSocketIOAdapter(
  adapter: string | undefined,
): adapter is (typeof SOCKETIO_ADAPTERS)[number] {
  return adapter != null &&
    (SOCKETIO_ADAPTERS as readonly string[]).includes(adapter);
}

export type SocketConfig =
  | (SocketIOConfig & { adapter: "socketio" | "socket-io" | "socket.io" })
  | (WebSocketConfig & { adapter: "websocket" });

/**
 * Socket.IO 实现配置（path、allowCORS 等）
 * 与 @dreamer/socket-io ServerOptions 兼容，但不包含 port/host（共用 HTTP 服务器）
 */
export interface SocketIOImplConfig {
  /** Logger 实例（可选，默认使用框架 logger） */
  logger?: Logger;
  /** Socket.IO 路径（默认："/socket.io/"） */
  path?: string;
  /** 是否允许跨域（默认：true） */
  allowCORS?: boolean;
  /**
   * Socket.IO CORS。未设时：若 AppConfig.cors 有 origin 则桥接；否则 `origin: "*"`（不反射任意 Origin）。
   * 生产跨域请显式白名单，例如 `{ origin: ["https://app.example.com"] }`。
   */
  cors?: {
    origin?: string | string[] | ((origin: string) => boolean);
    methods?: string[];
    credentials?: boolean;
  };
  /** 心跳超时（毫秒，默认：20000） */
  pingTimeout?: number;
  /** 心跳间隔（毫秒，默认：25000） */
  pingInterval?: number;
  /** 允许的传输方式（默认：["websocket", "polling"]） */
  transports?: Array<"websocket" | "polling">;
  /** 是否允许 HTTP 长轮询（默认：true） */
  allowPolling?: boolean;
  /** 轮询超时（毫秒，默认：60000） */
  pollingTimeout?: number;
  /** 是否启用调试日志（默认：false） */
  debug?: boolean;
  /** 其他 @dreamer/socket-io ServerOptions 选项 */
  [key: string]: unknown;
}

/**
 * Socket.IO 配置（挂载模式）
 * 支持 config 嵌套，也兼容扁平结构（config 未提供时使用顶层字段）
 */
export interface SocketIOConfig extends SocketIOImplConfig {
  /** 实现配置（可选，未提供时使用顶层 path、allowCORS 等） */
  config?: SocketIOImplConfig;
}

/**
 * WebSocket 实现配置（path、pingTimeout 等）
 */
export interface WebSocketImplConfig {
  /** Logger 实例（可选，默认使用框架 logger） */
  logger?: Logger;
  /** WebSocket 路径（默认："/ws"） */
  path?: string;
  /** 心跳超时（毫秒，默认：60000） */
  pingTimeout?: number;
  /** 心跳间隔（毫秒，默认：30000） */
  pingInterval?: number;
  /** 是否启用调试日志（默认：false） */
  debug?: boolean;
  /** 其他 @dreamer/websocket ServerOptions 选项 */
  [key: string]: unknown;
}

/**
 * WebSocket 配置（挂载模式）
 * 支持 config 嵌套，也兼容扁平结构（config 未提供时使用顶层字段）
 */
export interface WebSocketConfig extends WebSocketImplConfig {
  /** 实现配置（可选，未提供时使用顶层 path、pingTimeout 等） */
  config?: WebSocketImplConfig;
}

/**
 * App 生命周期阶段
 *
 * 包括：uninitialized、init、start、stop、error、build 等。
 *
 * @example
 * ```ts
 * app.on("init" as AppStage, () => console.log("init"));
 * app.on("start" as AppStage, () => console.log("start"));
 * ```
 */
export type AppStage = LifecycleStage;

/**
 * App 生命周期钩子函数
 *
 * @returns void 或 Promise<void>
 *
 * @example
 * ```ts
 * app.on("init", async () => {
 *   console.log("应用初始化完成");
 * });
 * ```
 */
export type AppLifecycleHook = () => void | Promise<void>;

/**
 * App 中间件类型
 *
 * 与 @dreamer/middleware 的 Middleware 类型一致，用于请求处理管道。
 *
 * @example
 * ```ts
 * const mw: AppMiddleware = (ctx, next) => next();
 * app.use(mw);
 * ```
 */
export type AppMiddleware = Middleware;

/**
 * App 插件类型
 *
 * 与 @dreamer/plugin 的 Plugin 类型一致，需提供 name 及可选钩子（onInit、onRequest 等）。
 *
 * @example
 * ```ts
 * const plugin: AppPlugin = { name: "my-plugin", onInit: () => {} };
 * app.registerPlugin(plugin);
 * ```
 */
export type AppPlugin = Plugin;

/**
 * App 类接口
 *
 * 定义应用实例的公共 API，包括 use、registerPlugin、on、start、stop、shutdown 等。
 *
 * @example
 * ```ts
 * const app: IApp = new App({ name: "my-app", version: "1.0.0" });
 * app.use(myMiddleware);
 * app.registerPlugin(myPlugin);
 * await app.start();
 * ```
 */
export interface IApp {
  /** 应用名称 */
  readonly name: string;
  /** 应用版本 */
  readonly version: string;
  /** 服务容器 */
  readonly container: ServiceContainer;
  /** 当前生命周期阶段 */
  readonly stage: AppStage;

  /**
   * 注册中间件
   */
  use(
    middleware: AppMiddleware,
    condition?: unknown,
    name?: string,
  ): void;
  use(path: string, middleware: AppMiddleware, name?: string): void;

  /**
   * 注册插件
   */
  registerPlugin(plugin: AppPlugin): void;

  /**
   * 注册生命周期钩子
   */
  on(stage: AppStage, hook: AppLifecycleHook): void;

  /**
   * 启动应用
   * @param options 可选；`mode: "console"` 时不 listen HTTP
   */
  start(options?: AppStartOptions): Promise<void>;

  /**
   * 停止应用
   */
  stop(): Promise<void>;

  /**
   * 关闭应用
   */
  shutdown(): Promise<void>;
}
