// ==================== 应用配置类型 ====================

/**
 * 组件子元素类型
 * 兼容 Preact 的 ComponentChildren 类型
 *
 * 参考 Preact 的类型定义：
 * - ComponentChild = VNode<any> | object | string | number | bigint | boolean | null | undefined
 * - ComponentChildren = ComponentChild[] | ComponentChild
 *
 * 注意：使用 any 代替 unknown，避免类型推断失败
 */
export type ComponentChild =
  | any // VNode<any> 类型（在类型定义文件中使用 any 代替 unknown，避免类型推断失败）
  | object
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined;

export type ComponentChildren = ComponentChild[] | ComponentChild;

// 扩展目录配置
export interface ExtendDirConfig {
  dir: string; // 目录路径
  prefix?: string; // URL 前缀（如果未配置，默认使用 dir 的名称）
}

// 静态资源配置
export interface StaticOptions {
  dir: string; // 静态资源根目录
  prefix?: string; // URL 前缀（如果未配置，默认使用 dir 的名称）
  index?: string | string[]; // 索引文件名
  dotfiles?: "allow" | "deny" | "ignore"; // 点文件处理方式
  etag?: boolean; // 是否启用 ETag
  lastModified?: boolean; // 是否发送 Last-Modified
  maxAge?: number; // 缓存时间（秒）
  extendDirs?: (string | ExtendDirConfig)[]; // 扩展的静态资源目录（如上传目录，这些目录不会被打包，始终从项目根目录读取）
}

// 数据库配置（从数据库模块导入类型）
import type { DatabaseConfig } from "../../features/database/types.ts";
// WebSocket 配置（从 WebSocket 模块导入类型）
import type { WebSocketConfig } from "../../features/websocket/types.ts";
// GraphQL 配置（从 GraphQL 模块导入类型）
import type {
  GraphQLConfig,
  GraphQLSchema,
} from "../../features/graphql/types.ts";

// 预加载模式
export type PrefetchMode = "single" | "batch";

// 预加载配置
export interface PrefetchConfig {
  /** 是否启用资源预取（prefetch），默认 true */
  enabled?: boolean;
  /**
   * 预加载的路由配置数组，支持通配符模式和否定模式
   *
   * 通配符模式：
   * - 星号匹配所有路由
   * - 斜杠加星号匹配所有一级路由
   * - 斜杠星号斜杠星号匹配所有二级路由，以此类推
   *
   * 否定模式（以感叹号开头）：
   * - 感叹号加斜杠表示不预加载首页
   * - 感叹号加斜杠docs加斜杠星号表示不预加载 docs 下的所有页面
   *
   * 具体路由：
   * - 斜杠about表示预加载 about 页面
   *
   * 注意：否定模式会从已匹配的路由中排除
   * 例如配置星号和感叹号加斜杠docs加斜杠星号表示预加载所有路由，但排除 docs 下的页面
   */
  routes?: string[];
  /** 是否在预加载时显示全屏加载状态，默认 false */
  loading?: boolean;
  /** 预加载模式：single（逐个请求每个路由的组件）或 batch（一次请求，服务端打包返回所有匹配路由的数据，默认） */
  mode?: PrefetchMode;
}

// 渲染引擎类型
export type RenderEngine = "preact" | "react" | "vue3";

// 渲染模式类型
export type RenderMode = "ssr" | "csr" | "hybrid";

// 渲染适配器配置
export interface RenderConfig {
  /**
   * 渲染引擎，可选值：'preact' | 'react' | 'vue3'
   * 默认为 'preact'
   *
   * @example
   * ```typescript
   * export default defineConfig({
   *   render: {
   *     engine: 'react'
   *   }
   * });
   * ```
   */
  engine?: RenderEngine;

  /**
   * 渲染模式，可选值：'ssr' | 'csr' | 'hybrid'
   * 默认为 'ssr'
   * - ssr: 服务端渲染（默认）
   * - csr: 客户端渲染
   * - hybrid: 混合渲染（服务端渲染 + 客户端 hydration）
   *
   * 注意：这个配置是全局的，可以在页面组件中通过导出 `renderMode` 来覆盖
   *
   * @example
   * ```typescript
   * export default defineConfig({
   *   render: {
   *     engine: 'preact',
   *     mode: 'ssr'
   *   }
   * });
   * ```
   */
  mode?: RenderMode;
}

// 应用配置基础接口（不包含 apps 和 database）
// 用于定义子应用配置，确保子应用不能配置 database
interface AppConfigBase {
  name?: string;
  basePath?: string;
  routes?: RouteConfig | string;
  server?: ServerConfig;
  middleware?: (Middleware | MiddlewareConfig)[];
  plugins?: (Plugin | { name: string; config?: Record<string, any> })[];
  cookie?: CookieConfig;
  session?: SessionConfig;
  build?: BuildConfig;
  // 静态资源配置
  static?: StaticOptions;
  dev?: DevConfig;
  // 渲染适配器配置（包含渲染引擎和渲染模式）
  render?: RenderConfig;
  // 预加载配置
  prefetch?: PrefetchConfig;
  // WebSocket 配置
  websocket?: WebSocketConfig;
  // GraphQL 配置
  graphql?: {
    schema: GraphQLSchema;
    config?: GraphQLConfig;
  };
  // 是否为生产环境（通常由框架自动设置，但也可以手动指定）
  isProduction?: boolean;
  // 日志配置
  logging?: LoggingConfig;
  // 缓存配置
  cache?: CacheConfig;
  // 队列配置
  queue?: QueueConfig;
  // 安全配置
  security?: SecurityConfig;
}

// 日志配置
export interface LoggingConfig {
  level?: "DEBUG" | "INFO" | "WARN" | "ERROR";
  maskFields?: string[];
}

// 缓存适配器类型
export type CacheAdapterType = "memory" | "redis" | "file";

// 缓存配置
export interface CacheConfig {
  /**
   * 缓存适配器类型
   * - "memory": 内存缓存（使用 Map，支持 TTL）
   * - "redis": Redis 缓存（需要配置 Redis 连接）
   * - "file": 文件缓存（将缓存存储到文件系统）
   * @default "memory"
   */
  adapter?: CacheAdapterType;
  /**
   * Redis 配置（仅在 adapter 为 "redis" 时使用）
   */
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  /**
   * 文件缓存配置（仅在 adapter 为 "file" 时使用）
   */
  file?: {
    /**
     * 缓存目录路径
     * @default ".cache"
     */
    dir?: string;
  };
  /**
   * 默认过期时间（秒，仅对支持 TTL 的适配器有效：memory, redis, file）
   */
  ttl?: number;
}

// 队列适配器类型
export type QueueAdapterType = "memory" | "redis";

// 队列配置
export interface QueueConfig {
  /**
   * 队列适配器类型
   * - "memory": 内存队列（使用内存存储，进程重启后数据丢失）
   * - "redis": Redis 队列（使用 Redis 存储，支持持久化和分布式）
   * @default "memory"
   */
  adapter?: QueueAdapterType;
  /**
   * Redis 配置（仅在 adapter 为 "redis" 时使用）
   */
  redis?: {
    /** Redis 服务器地址 */
    host: string;
    /** Redis 服务器端口 */
    port: number;
    /** Redis 密码（可选） */
    password?: string;
    /** Redis 数据库编号（可选，默认为 0） */
    db?: number;
  };
  /**
   * 队列列表配置
   * 可以配置多个队列，每个队列可以有自己的配置
   */
  queues?: Record<
    string,
    {
      /** 最大并发数 */
      concurrency?: number;
      /** 重试次数 */
      retry?: number;
      /** 重试间隔（毫秒） */
      retryInterval?: number;
      /** 队列优先级 */
      priority?: "low" | "normal" | "high" | "urgent";
      /** 存储类型（如果不指定，使用全局 adapter） */
      storage?: QueueAdapterType;
      /** Redis Key 前缀（仅在 storage 为 redis 时使用） */
      keyPrefix?: string;
    }
  >;
}

// 安全配置
export interface SecurityConfig {
  helmet?: boolean | Record<string, any>;
  csp?: boolean | Record<string, any>;
}

// 子应用配置（不包含数据库配置，数据库配置只能在根配置中）
// 子应用不能嵌套 apps（不支持多级嵌套）
export interface SubAppConfig extends AppConfigBase {
}

// 应用配置（根配置，可以包含 database 和 apps）
export interface AppConfig extends AppConfigBase {
  // 子应用配置（不包含 database 字段）
  apps?: SubAppConfig[];
  // 数据库配置（只能在根配置中，子应用配置中不允许）
  database?: DatabaseConfig;
}

// 配置类型
export type DWebConfig = AppConfig;

/**
 * DWeb 框架类型定义
 */

// 请求对象
export interface Request extends Omit<globalThis.Request, "body"> {
  params: Record<string, string>;
  query: Record<string, string>;
  cookies: Record<string, string>;
  body?: unknown; // 解析后的请求体
  session?: Session | null;
  getCookie(name: string): string | null;
  getHeader(name: string): string | null;
  json(): Promise<unknown>;
  text(): Promise<string>;
  formData(): Promise<FormData>;
  createSession(data?: Record<string, unknown>): Promise<Session>;
  getSession(): Promise<Session | null>;
  /**
   * 获取 Application 实例
   * 用于在 API 路由中访问服务容器等应用级别的功能
   *
   * @returns Application 实例，如果未设置则返回 undefined
   *
   * @example
   * ```ts
   * // 在 API 路由中
   * export async function getUsers(req: Request, res?: Response) {
   *   const application = req.getApplication();
   *   if (application) {
   *     const userService = application.getService<UserService>('userService');
   *     const users = userService.getAllUsers();
   *     return res?.json({ success: true, data: users });
   *   }
   * }
   * ```
   */
  getApplication?(): ApplicationLike | undefined;
}

// 内容类型（用于响应方法）
export type ContentType =
  | "text"
  | "json"
  | "html"
  | "javascript"
  | "css"
  | "xml"
  | "svg"
  | "binary";

// 响应对象
export interface Response {
  status: number;
  statusText: string;
  headers: Headers;
  body?: string | Uint8Array | ReadableStream<Uint8Array>; // 支持字符串、二进制数据和流
  setCookie(name: string, value: string, options?: CookieOptions): void;
  setHeader(name: string, value: string): void;
  json<T = unknown>(
    data: T,
    options?: {
      charset?: string;
      status?: number;
      headers?: Record<string, string>;
    },
  ): Response;
  html(
    html: string,
    options?: {
      charset?: string;
      status?: number;
      headers?: Record<string, string>;
    },
  ): Response;
  text(
    text: string,
    options?: {
      type?: ContentType;
      charset?: string;
      status?: number;
      headers?: Record<string, string>;
    },
  ): Response;
  redirect(url: string, status?: number): Response;
  send(
    data: string | Uint8Array | object,
    options?: {
      type?: ContentType;
      charset?: string;
      status?: number;
      headers?: Record<string, string>;
    },
  ): Response;
}

// Cookie 选项
export interface CookieOptions {
  path?: string;
  domain?: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

// Session 对象
export interface Session<T = Record<string, any>> {
  id: string;
  data: T;
  update(data: Partial<T>): Promise<void>;
  destroy(): Promise<void>;
  regenerate(): Promise<void>;
}

// 中间件函数类型
export type Middleware = (
  // 请求对象
  req: Request,
  // 响应对象
  res: Response,
  // 下一个中间件
  next: () => Promise<void>,
  // 应用实例
  app?: AppLike,
) => Promise<void> | void;

// 中间件配置
export interface MiddlewareConfig {
  // 中间件名称
  name?: string;
  // 中间件处理函数
  handler: Middleware;
  // 中间件配置选项
  options?: Record<string, unknown>;
}

/**
 * 应用实例接口（用于插件系统，避免循环依赖）
 *
 * 为什么叫 `AppLike` 而不是 `App`？
 * 1. **避免循环依赖**：完整的 `App` 类型定义在 `mod.ts` 中，而 `mod.ts` 依赖 `types/index.ts`。
 *    如果 `Plugin` 接口直接使用 `App` 类型，会导致循环依赖问题。
 *
 * 2. **"Like" 的含义**：`AppLike` 表示"类似 App 的对象"，它是一个更宽松的接口，
 *    只定义了插件可能需要访问的基本属性，而不是完整的 `App` 类型。
 *
 * 3. **灵活性**：所有属性都是可选的，并且有索引签名 `[key: string]: unknown`，
 *    这使得它可以接受不同结构的对象：
 *    - 完整的 `App` 对象（包含 `server`, `middleware`, `plugins`, `use`, `plugin`）
 *    - 开发/生产服务器传递的对象（如 `{ server, router, routeHandler }`）
 *    - 其他符合接口结构的对象
 *
 * 4. **类型安全**：虽然属性类型是 `unknown`，但这确保了插件系统不会因为类型定义
 *    的循环依赖而无法工作。插件在使用时可以通过类型断言或类型守卫来访问具体属性。
 *
 * @example
 * ```ts
 * // 在插件中使用
 * async onInit(app: AppLike) {
 *   if (app.server) {
 *     // 访问 server 实例
 *   }
 *   if (app.router) {
 *     // 访问 router 实例
 *   }
 * }
 * ```
 */
export interface AppLike {
  /** 服务器实例 */
  server?: unknown;
  /** 中间件管理器 */
  middleware?: unknown;
  /** 插件管理器 */
  plugins?: unknown;
  /** 路由实例 */
  router?: unknown;
  /** 路由处理器实例 */
  routeHandler?: unknown;
  /** 添加中间件的方法 */
  use?: (middleware: unknown) => void;
  /** 注册插件的方法 */
  plugin?: (plugin: unknown) => void;
  /** 是否为生产环境 */
  isProduction?: boolean;
  /** 扩展属性（某些插件可能需要访问其他属性） */
  [key: string]: unknown;
}

/**
 * 服务令牌类型（从 service-container 导入，避免循环依赖）
 */
export type ServiceToken<T = unknown> = string | symbol | (new () => T);

/**
 * Application 接口（用于 Request.getApplication，避免循环依赖）
 * 只包含 API 路由中常用的方法
 */
export interface ApplicationLike {
  /**
   * 获取服务
   * 从服务容器中获取已注册的服务
   *
   * @param token - 服务令牌
   * @returns 服务实例
   *
   * @example
   * ```ts
   * const userService = application.getService<UserService>('userService');
   * ```
   */
  getService<T>(token: ServiceToken<T>): T;

  /** 扩展属性（允许访问其他 Application 方法） */
  [key: string]: unknown;
}

// 插件接口
export interface Plugin {
  name: string;
  /** 初始化钩子，在应用启动时调用 */
  onInit?: (app: AppLike, config: AppConfig) => Promise<void> | void;
  /** 请求钩子，在每个请求处理前调用 */
  onRequest?: (req: Request, res: Response) => Promise<void> | void;
  /** 响应钩子，在每个请求处理后调用 */
  onResponse?: (req: Request, res: Response) => Promise<void> | void;
  /** 错误钩子，在发生错误时调用 */
  onError?: (err: Error, req: Request, res: Response) => Promise<void> | void;
  /** 构建钩子，在构建时调用 */
  onBuild?: (config: BuildConfig) => Promise<void> | void;
  /** 启动钩子，在服务器启动时调用 */
  onStart?: (app: AppLike) => Promise<void> | void;
  /** 插件配置 */
  config?: Record<string, unknown>;
}

// 路由配置
export interface RouteConfig {
  dir: string;
  ignore?: string[];
  cache?: boolean;
  priority?: "specific-first" | "order";
  /** API 目录，默认为 'routes/api'，也可以配置为 'api' 等相对路径 */
  apiDir?: string;
  /**
   * API 路由模式
   * - "method": 方法路由模式（默认），通过 URL 路径指定方法名，默认使用中划线格式，例如 /api/users/get-user
   * - "restful": RESTful 模式，基于 HTTP 方法和资源路径，例如 GET /api/users, POST /api/users
   * @default "method"
   */
  apiMode?: "method" | "restful";
}

// 服务器配置
export interface ServerConfig {
  port?: number;
  host?: string;
  /** TLS/HTTPS 配置（可选）
   * - `true`: 使用框架内置的默认自签名证书（适用于开发环境）
   * - 配置对象: 使用自定义证书和私钥
   */
  tls?: boolean | {
    /** 证书文件路径或证书内容（PEM 格式） */
    certFile?: string;
    /** 私钥文件路径或私钥内容（PEM 格式） */
    keyFile?: string;
    /** 证书内容（字节数组，与 certFile 二选一） */
    cert?: Uint8Array;
    /** 私钥内容（字节数组，与 keyFile 二选一） */
    key?: Uint8Array;
  };
}

// Cookie 配置
export interface CookieConfig {
  secret?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
  maxAge?: number;
}

// Session 配置
export interface SessionConfig {
  secret: string;
  store?: "memory" | "file" | "redis" | "kv" | "mongodb";
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  mongodb?: {
    collection?: string; // 集合名称，默认为 'sessions'
  };
  kv?: Record<PropertyKey, never> | undefined; // Deno KV 不需要额外配置，使用全局 Deno.kv
  file?: {
    dir?: string; // 文件存储目录，默认为 '.sessions'
  };
}

// 开发配置
export interface DevConfig {
  hmr?: boolean;
  open?: boolean;
  hmrPort?: number; // HMR WebSocket 服务器端口
  reloadDelay?: number; // 文件变化后重载延迟（毫秒）
}

// 构建配置
export interface BuildConfig {
  outDir: string;
  /** 入口文件路径，默认为 main.ts */
  entry?: string;
  /** 是否启用构建缓存（增量构建），默认 true */
  cache?: boolean;
  /** 是否启用代码分割（提取共享代码到公共 chunk），默认 false */
  split?: boolean;
  /** 代码分割的最小 chunk 大小（字节），默认 20000（20KB） */
  chunkSize?: number;
  /** 是否启用静态资源压缩（图片、字体等），默认 false */
  compress?: boolean;
  /** 图片压缩质量（0-100），默认 80 */
  imageQuality?: number;
  [key: string]: any;
}

// CORS 配置
export interface CorsConfig {
  origin?: string | string[] | ((origin: string | null) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * API 路由上下文
 * 包含 API 路由处理所需的所有信息
 */
export interface ApiContext {
  /** 请求对象 */
  req: Request;
  /** 响应对象 */
  res: Response;
  /** Application 实例 */
  app: import("./index.ts").ApplicationLike;
  /** Cookie 对象 */
  cookie: Record<string, string>;
  /** Session 对象（如果存在） */
  session: import("./index.ts").Session | null;
  /** 路由参数 */
  params: Record<string, string>;
  /** 查询参数 */
  query: Record<string, string>;
  /** 当前路由路径 */
  routePath: string;
  /** URL 对象 */
  url: URL;
}

// 路由处理器（支持旧版 (req, res?) 和新版 (context: ApiContext) 两种签名）
export type RouteHandler =
  | ((context: ApiContext) => Promise<any> | any)
  | ((req: Request, res?: Response) => Promise<any> | any)
  | ((req: Request) => Promise<any> | any);

// API 路由导出
export interface ApiRoute {
  [method: string]: RouteHandler;
}

// ==================== 页面组件类型 ====================

/**
 * Load 函数上下文参数
 * 用于页面组件的 load 函数，提供路由参数、查询参数、Cookie 和 Session 等信息
 */
export interface LoadContext {
  /** 请求对象 */
  req: Request;
  /** 响应对象 */
  res: Response;
  /** 路由参数 */
  params: Record<string, string>;
  /** 查询参数 */
  query: Record<string, string>;
  /** Cookie 对象 */
  cookies: Record<string, string>;
  /** Session 对象（如果存在） */
  session: Session | null;
  /** 获取指定名称的 Cookie */
  getCookie(name: string): string | null;
  /** 获取 Session（如果不存在则返回 null） */
  getSession(): Promise<Session | null>;
  /** 数据库适配器实例（如果已配置数据库） */
  db?: import("../../features/database/types.ts").DatabaseAdapter | null;
  /** 当前语言代码（如果已配置 i18n 插件） */
  lang?: string;
  /** 状态管理 Store（如果已配置 store 插件） */
  store?: import("../../plugins/store/types.ts").Store;
  /** 当前路由路径 */
  routePath: string;
  /** URL 对象 */
  url: URL;
}

/**
 * 页面组件属性
 * 传递给页面组件的 props
 */
export interface PageProps {
  /** 路由参数 */
  params: Record<string, string>;
  /** 查询参数 */
  query: Record<string, string>;
  /** 页面数据（load 函数返回的数据） */
  data: Record<string, unknown>;
  /** 当前语言代码（如果已配置 i18n 插件） */
  lang?: string;
  /** 状态管理 Store（如果已配置 store 插件） */
  store?: import("../../plugins/store/types.ts").Store;
  /** 当前路由路径 */
  routePath: string;
  /** URL 对象 */
  url: URL;
}

/**
 * 布局组件属性
 * 传递给布局组件的 props
 *
 * @example
 * ```tsx
 * import type { LayoutProps } from '@dreamer/dweb';
 *
 * export default function RootLayout({ children, data }: LayoutProps) {
 *   return (
 *     <div>
 *       <header>Header</header>
 *       <main>{children}</main>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // 如果布局有自己的 load 方法，可以扩展类型
 * interface MyLayoutProps extends LayoutProps {
 *   user: User;
 *   theme: string;
 * }
 *
 * export default function MyLayout({ children, data, user, theme }: MyLayoutProps) {
 *   return <div className={theme}>{children}</div>;
 * }
 * ```
 */
/**
 * 布局组件属性
 * 传递给布局组件的 props
 *
 * 注意：移除了索引签名，确保 children 的类型不会被覆盖
 * 布局自己的 load 数据会通过展开运算符传递，可以通过接口扩展来定义具体类型
 *
 * @example
 * ```tsx
 * // 扩展 LayoutProps 来添加自定义属性
 * interface MyLayoutProps extends LayoutProps {
 *   user: User;
 *   theme: string;
 * }
 *
 * export default function MyLayout({ children, data, user, theme }: MyLayoutProps) {
 *   return <div className={theme}>{children}</div>;
 * }
 * ```
 */
export interface LayoutProps {
  /** 子元素（页面内容） */
  children: ComponentChildren;
  /** 布局数据（布局 load 函数返回的数据） */
  data: Record<string, any>;
  /** 当前语言代码（如果已配置 i18n 插件） */
  lang?: string;
  /** 状态管理 Store（如果已配置 store 插件） */
  store?: import("../../plugins/store/types.ts").Store;
  /** 当前路由路径 */
  routePath: string;
  /** URL 对象 */
  url: URL;
}
