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

// 响应对象
export interface Response {
  status: number;
  statusText: string;
  headers: Headers;
  body?: any;
  setCookie(name: string, value: string, options?: CookieOptions): void;
  setHeader(name: string, value: string): void;
  json(data: any): Response;
  html(html: string): Response;
  text(text: string): Response;
  redirect(url: string, status?: number): Response;
  send(data: any): Response;
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

// 插件接口
export interface Plugin {
  name: string;
  onInit?: (app: any) => Promise<void> | void;
  onRequest?: (req: Request, res: Response) => Promise<void> | void;
  onResponse?: (req: Request, res: Response) => Promise<void> | void;
  onError?: (err: Error, req: Request, res: Response) => Promise<void> | void;
  onBuild?: (config: any) => Promise<void> | void;
  onStart?: (app: any) => Promise<void> | void;
  config?: Record<string, any>;
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
  port: number;
  host: string;
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
  store?: 'memory' | 'file' | 'redis';
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  redis?: {
    host: string;
    port: number;
  };
}

// 开发配置
export interface DevConfig {
  hmr?: boolean;
  open?: boolean;
  hmrPort?: number;  // HMR WebSocket 服务器端口
  reloadDelay?: number;  // 文件变化后重载延迟（毫秒）
}

// 构建配置
export interface BuildConfig {
  outDir: string;
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
  // 静态资源目录，默认为顶层配置的 staticDir 或 'public'
  staticDir?: string;
  apps?: AppConfig[];
  dev?: DevConfig;
  // 全局渲染模式（可在页面组件中覆盖）
  renderMode?: RenderMode;
}

// 配置类型
export type DWebConfig = AppConfig;

// 路由处理器
export type RouteHandler = (req: Request) => Promise<any> | any;

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
}

