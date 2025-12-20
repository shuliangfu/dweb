// ==================== 应用配置类型 ====================

// 静态资源配置
export interface StaticOptions {
  dir: string; // 静态资源根目录
  prefix?: string; // URL 前缀
  index?: string | string[]; // 索引文件名
  dotfiles?: 'allow' | 'deny' | 'ignore'; // 点文件处理方式
  etag?: boolean; // 是否启用 ETag
  lastModified?: boolean; // 是否发送 Last-Modified
  maxAge?: number; // 缓存时间（秒）
}

// 数据库配置（从数据库模块导入类型）
import type { DatabaseConfig } from '../features/database/types.ts';
// WebSocket 配置（从 WebSocket 模块导入类型）
import type { WebSocketConfig } from '../features/websocket/types.ts';
// GraphQL 配置（从 GraphQL 模块导入类型）
import type { GraphQLConfig, GraphQLSchema } from '../features/graphql/types.ts';

// 应用配置
export interface AppConfig {
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
  apps?: AppConfig[];
  dev?: DevConfig;
  // 全局渲染模式（可在页面组件中覆盖）
  renderMode?: RenderMode;
  // 数据库配置
  database?: DatabaseConfig;
  // WebSocket 配置
  websocket?: WebSocketConfig;
  // GraphQL 配置
  graphql?: {
    schema: GraphQLSchema;
    config?: GraphQLConfig;
  };
}

// 配置类型
export type DWebConfig = AppConfig;

/**
 * DWeb 框架类型定义
 */

// 请求对象
export interface Request extends Omit<globalThis.Request, 'body'> {
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
}

// 内容类型（用于响应方法）
export type ContentType =
  | 'text'
  | 'json'
  | 'html'
  | 'javascript'
  | 'css'
  | 'xml'
  | 'svg'
  | 'binary';

// 响应对象
export interface Response {
  status: number;
  statusText: string;
  headers: Headers;
  body?: string | Uint8Array; // 支持字符串和二进制数据
  setCookie(name: string, value: string, options?: CookieOptions): void;
  setHeader(name: string, value: string): void;
  json<T = unknown>(
    data: T,
    options?: {
      charset?: string;
      status?: number;
      headers?: Record<string, string>;
    }
  ): Response;
  html(
    html: string,
    options?: {
      charset?: string;
      status?: number;
      headers?: Record<string, string>;
    }
  ): Response;
  text(
    text: string,
    options?: {
      type?: ContentType;
      charset?: string;
      status?: number;
      headers?: Record<string, string>;
    }
  ): Response;
  redirect(url: string, status?: number): Response;
  send(
    data: string | Uint8Array | object,
    options?: {
      type?: ContentType;
      charset?: string;
      status?: number;
      headers?: Record<string, string>;
    }
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
  sameSite?: 'strict' | 'lax' | 'none';
}

// Session 对象
export interface Session {
  id: string;
  data: Record<string, any>;
  update(data: Record<string, any>): Promise<void>;
  destroy(): Promise<void>;
  regenerate(): Promise<void>;
}

// 中间件函数类型
export type Middleware = (
  req: Request,
  res: Response,
  next: () => Promise<void>
) => Promise<void> | void;

// 中间件配置
export interface MiddlewareConfig {
  name?: string;
  handler: Middleware;
  options?: Record<string, any>;
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
  /** 扩展属性（某些插件可能需要访问其他属性） */
  [key: string]: unknown;
}

// 插件接口
export interface Plugin {
  name: string;
  /** 初始化钩子，在应用启动时调用 */
  onInit?: (app: AppLike) => Promise<void> | void;
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
  priority?: 'specific-first' | 'order';
}

// 服务器配置
export interface ServerConfig {
  port?: number;
  host?: string;
}

// Cookie 配置
export interface CookieConfig {
  secret?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
}

// Session 配置
export interface SessionConfig {
  secret: string;
  store?: 'memory' | 'file' | 'redis' | 'kv' | 'mongodb';
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
  kv?: {} | undefined;
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
  /** 是否启用资源预取（prefetch），默认 true */
  prefetch?: boolean;
  /** 是否预取相关路由，默认 false */
  prefetchRoutes?: boolean;
  [key: string]: any;
}

// 渲染模式
export type RenderMode = 'ssr' | 'csr' | 'hybrid';

// CORS 配置
export interface CorsConfig {
  origin?: string | string[] | ((origin: string | null) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

// 路由处理器
export type RouteHandler = (req: Request, res?: Response) => Promise<any> | any;

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
  db?: import('../features/database/types.ts').DatabaseAdapter | null;
  /** 翻译函数（如果已配置 i18n 插件） */
  t?: (key: string, params?: Record<string, string>) => string;
  /** 当前语言代码（如果已配置 i18n 插件） */
  lang?: string;
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
  data: unknown;
  /** 翻译函数（如果已配置 i18n 插件） */
  t?: (key: string, params?: Record<string, string>) => string;
  /** 当前语言代码（如果已配置 i18n 插件） */
  lang?: string;
}
