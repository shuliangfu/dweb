/**
 * @module @dreamer/dweb/utils/errors
 *
 * @fileoverview 统一错误处理模块，支持 i18n 国际化
 *
 * 错误码分段说明：
 * | 序号   | 错误码         | 说明                                   |
 * |--------|----------------|----------------------------------------|
 * | 01-19  | DWEB_E01～E19  | 配置相关                               |
 * | 20-21  | DWEB_E20～E21  | 入口路径                               |
 * | 22     | DWEB_E22       | 运行时不支持                           |
 * | 23-29  | DWEB_E23～E29  | 功能模块（App、Socket、生成、中间件等） |
 * | 30-32  | DWEB_E30～E32  | 文件/HTTP                              |
 * | 33     | DWEB_E33       | 未知错误                               |
 *
 * 职责：
 * - 定义 DwebError 错误类，包含 code、messageKey、params、details
 * - 提供 createDwebError、throwDwebError 工具函数
 * - 预留 i18n 翻译接口，便于后续接入国际化
 *
 * 使用方式：
 * ```typescript
 * import { throwDwebError, DwebErrorCode } from "@dreamer/dweb/utils";
 *
 * throwDwebError(DwebErrorCode.CONFIG_NAME_INVALID);
 * throwDwebError(DwebErrorCode.ENTRY_PATH_INVALID, { path: "/foo/bar" });
 * ```
 */

/**
 * 错误码枚举，用于 i18n 键与程序化识别
 *
 * 命名规则：DWEB_E + 两位数字，按顺序递增（E01、E02、...、E33）
 */
export const DwebErrorCode = {
  /** 配置项 'name' 必须是字符串类型 */
  CONFIG_NAME_INVALID: "DWEB_E01",
  /** 配置项 'version' 必须是字符串类型 */
  CONFIG_VERSION_INVALID: "DWEB_E02",
  /** 配置项 'envPrefix' 必须是字符串类型 */
  CONFIG_ENV_PREFIX_INVALID: "DWEB_E04",
  /** 配置项 'hotReload' 必须是布尔类型 */
  CONFIG_HOT_RELOAD_INVALID: "DWEB_E05",
  /** 配置项 'render' 必须是对象类型 */
  CONFIG_RENDER_INVALID: "DWEB_E06",
  /** 配置项 'middlewares' 必须是数组类型 */
  CONFIG_MIDDLEWARES_INVALID: "DWEB_E07",
  /** 配置项 'plugins' 必须是数组类型 */
  CONFIG_PLUGINS_INVALID: "DWEB_E08",
  /** 配置项 'server' 必须是对象类型 */
  CONFIG_SERVER_INVALID: "DWEB_E09",
  /** 配置项 'router' 必须是对象类型 */
  CONFIG_ROUTER_INVALID: "DWEB_E10",
  /** 配置项 'build' 必须是对象类型 */
  CONFIG_BUILD_INVALID: "DWEB_E11",
  /** 配置项 'logger' 必须是对象类型 */
  CONFIG_LOGGER_INVALID: "DWEB_E12",
  /** 配置项 'render.engine' 必须是 "react"、"preact" 或 "view" 之一 */
  CONFIG_RENDER_ENGINE_INVALID: "DWEB_E13",
  /** 配置项 'render.mode' 必须是 "ssr"、"csr"、"ssg" 或 "hybrid" 之一 */
  CONFIG_RENDER_MODE_INVALID: "DWEB_E14",
  /** 配置中的中间件路径无法提取名称 */
  CONFIG_MIDDLEWARE_PATH_NO_NAME: "DWEB_E15",
  /** 配置中的中间件必须提供名称 */
  CONFIG_MIDDLEWARE_MUST_HAVE_NAME: "DWEB_E16",
  /** 配置中的中间件对象必须提供 name 属性 */
  CONFIG_MIDDLEWARE_OBJECT_MUST_HAVE_NAME: "DWEB_E17",
  /** 配置中的中间件类型无效 */
  CONFIG_MIDDLEWARE_TYPE_INVALID: "DWEB_E18",
  /** 配置中的插件必须提供名称 */
  CONFIG_PLUGIN_MUST_HAVE_NAME: "DWEB_E19",

  /** 入口路径格式不支持 */
  ENTRY_PATH_INVALID: "DWEB_E20",
  /** 入口路径段数过多 */
  ENTRY_PATH_TOO_DEEP: "DWEB_E21",

  /** 仅支持 Deno、Bun 或 Node.js 运行时 */
  RUNTIME_UNSUPPORTED: "DWEB_E22",

  /** App 实例未初始化 */
  APP_NOT_INITIALIZED: "DWEB_E23",
  /** Socket.IO 未配置 */
  SOCKET_IO_NOT_CONFIGURED: "DWEB_E24",
  /** WebSocket 未配置 */
  WEBSOCKET_NOT_CONFIGURED: "DWEB_E25",
  /** 不支持的生成类型 */
  GENERATE_TYPE_UNSUPPORTED: "DWEB_E26",
  /** 构建失败 */
  BUILD_FAILED: "DWEB_E27",
  /** 中间件文件未导出中间件函数 */
  MIDDLEWARE_FILE_NO_EXPORT: "DWEB_E28",
  /** 加载中间件文件失败 */
  MIDDLEWARE_LOAD_FAILED: "DWEB_E29",

  /** 无法读取文件 */
  FILE_READ_FAILED: "DWEB_E30",
  /** HTTP 请求失败 */
  HTTP_REQUEST_FAILED: "DWEB_E31",
  /** 无法读取并解析文件（含解析错误详情） */
  FILE_READ_PARSE_FAILED: "DWEB_E32",

  /** 未知错误（用于包装非 Error 类型的 throw） */
  UNKNOWN_ERROR: "DWEB_E33",

  /** 无法获取用户主目录，无法使用 ~/.dreamer 缓存 */
  DREAMER_CACHE_HOME_UNAVAILABLE: "DWEB_E34",
} as const;

/**
 * 错误码字符串字面量类型
 *
 * 从 DwebErrorCode 枚举推导，如 "DWEB_E01" | "DWEB_E02" | ...
 * 用于 createDwebError、throwDwebError 的 code 参数类型。
 */
export type DwebErrorCodeType =
  (typeof DwebErrorCode)[keyof typeof DwebErrorCode];

/**
 * 错误消息参数，用于 i18n 插值
 *
 * 例如：{ path: "/foo", expected: "string" } → "路径 /foo 应为 string"
 */
export type DwebErrorParams = Record<string, string | number | boolean>;

/**
 * i18n 翻译函数类型
 *
 * 框架后续接入 i18n 时，可注册此函数以替换默认消息
 *
 * @param key - i18n 键，如 "errors.DWEB_E01"
 * @param params - 插值参数
 * @returns 翻译后的消息
 */
export type DwebErrorTranslator = (
  key: string,
  params?: DwebErrorParams,
) => string;

/** 全局翻译器，未设置时使用默认消息 */
let globalTranslator: DwebErrorTranslator | null = null;

/**
 * 注册全局错误消息翻译器
 *
 * 用于接入 i18n 时替换默认消息；传入 null 可清除翻译器，恢复默认消息
 *
 * @param translator - 翻译函数，传 null 清除
 */
export function setDwebErrorTranslator(
  translator: DwebErrorTranslator | null,
): void {
  globalTranslator = translator;
}

/**
 * 获取当前错误消息翻译器
 *
 * @returns 已注册的翻译器，未设置时返回 null
 */
export function getDwebErrorTranslator(): DwebErrorTranslator | null {
  return globalTranslator;
}

/**
 * 默认错误消息映射（i18n 未接入时的回退）
 *
 * 键为错误码，值为默认消息模板，支持 {param} 插值
 */
/** 默认错误消息（i18n 未接入时的英文回退，支持 {param} 插值） */
export const DEFAULT_ERROR_MESSAGES: Record<
  DwebErrorCodeType,
  string
> = {
  [DwebErrorCode.CONFIG_NAME_INVALID]: "Config 'name' must be a string",
  [DwebErrorCode.CONFIG_VERSION_INVALID]: "Config 'version' must be a string",
  [DwebErrorCode.CONFIG_ENV_PREFIX_INVALID]:
    "Config 'envPrefix' must be a string",
  [DwebErrorCode.CONFIG_HOT_RELOAD_INVALID]:
    "Config 'hotReload' must be a boolean",
  [DwebErrorCode.CONFIG_RENDER_INVALID]: "Config 'render' must be an object",
  [DwebErrorCode.CONFIG_MIDDLEWARES_INVALID]:
    "Config 'middlewares' must be an array",
  [DwebErrorCode.CONFIG_PLUGINS_INVALID]: "Config 'plugins' must be an array",
  [DwebErrorCode.CONFIG_SERVER_INVALID]: "Config 'server' must be an object",
  [DwebErrorCode.CONFIG_ROUTER_INVALID]: "Config 'router' must be an object",
  [DwebErrorCode.CONFIG_BUILD_INVALID]: "Config 'build' must be an object",
  [DwebErrorCode.CONFIG_LOGGER_INVALID]: "Config 'logger' must be an object",
  [DwebErrorCode.CONFIG_RENDER_ENGINE_INVALID]:
    `Config 'render.engine' must be "react", "preact" or "view"`,
  [DwebErrorCode.CONFIG_RENDER_MODE_INVALID]:
    `Config 'render.mode' must be "ssr", "csr", "ssg" or "hybrid"`,
  [DwebErrorCode.CONFIG_MIDDLEWARE_PATH_NO_NAME]:
    `Middleware at index {index} path "{path}" cannot extract name. Use object form: { middleware: "{path}", name: "middleware-name" }`,
  [DwebErrorCode.CONFIG_MIDDLEWARE_MUST_HAVE_NAME]:
    `Middleware at index {index} must have a name (name property or function name). Use: { middleware: yourMiddleware, name: "middleware-name" }`,
  [DwebErrorCode.CONFIG_MIDDLEWARE_OBJECT_MUST_HAVE_NAME]:
    `Middleware object at index {index} must have name property. Use: { middleware: yourMiddleware, condition: {...}, name: "middleware-name" }`,
  [DwebErrorCode.CONFIG_MIDDLEWARE_TYPE_INVALID]:
    `Middleware at index {index} must be string, function or object`,
  [DwebErrorCode.CONFIG_PLUGIN_MUST_HAVE_NAME]:
    `Plugin at index {index} must have a name. Use: { name: "plugin-name", ... } or string path`,

  [DwebErrorCode.ENTRY_PATH_INVALID]:
    "[dweb] Entry path format not supported: {reason}. {hint} Path: {path}",
  [DwebErrorCode.ENTRY_PATH_TOO_DEEP]:
    "[dweb] Entry path segments too many. {hint} Path: {path}",

  [DwebErrorCode.RUNTIME_UNSUPPORTED]:
    "Only Deno, Bun or Node.js runtime is supported",

  [DwebErrorCode.APP_NOT_INITIALIZED]: "App instance not initialized",
  [DwebErrorCode.SOCKET_IO_NOT_CONFIGURED]:
    "Socket.IO not configured. Set socket: { type: 'socketio', ... } in AppConfig",
  [DwebErrorCode.WEBSOCKET_NOT_CONFIGURED]:
    "WebSocket not configured. Set socket: { type: 'websocket', ... } in AppConfig",
  [DwebErrorCode.GENERATE_TYPE_UNSUPPORTED]:
    "Unsupported generate type: {type}",
  [DwebErrorCode.BUILD_FAILED]: "{message}",
  [DwebErrorCode.MIDDLEWARE_FILE_NO_EXPORT]:
    `Middleware file "{path}" has no export (need export default or export const middleware)`,
  [DwebErrorCode.MIDDLEWARE_LOAD_FAILED]:
    "Failed to load middleware: {path} - {message}",

  [DwebErrorCode.FILE_READ_FAILED]: "Cannot read {path}",
  [DwebErrorCode.HTTP_REQUEST_FAILED]: "HTTP {status}",
  [DwebErrorCode.FILE_READ_PARSE_FAILED]: "Cannot read {path}: {message}",
  [DwebErrorCode.UNKNOWN_ERROR]: "[dweb] Unknown error: {message}",
  [DwebErrorCode.DREAMER_CACHE_HOME_UNAVAILABLE]:
    "Cannot get user home (HOME or USERPROFILE not set), cannot use ~/.dreamer cache",
};

/**
 * 解析消息模板，将 {key} 替换为 params[key]
 */
function interpolate(template: string, params?: DwebErrorParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = params[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

/**
 * 获取错误消息（优先使用 i18n 翻译器）
 */
function resolveMessage(
  code: DwebErrorCodeType,
  params?: DwebErrorParams,
): string {
  const key = `errors.${code}`;
  if (globalTranslator) {
    return globalTranslator(key, params);
  }
  const template = DEFAULT_ERROR_MESSAGES[code];
  return template ? interpolate(template, params) : `[dweb] 未知错误: ${code}`;
}

/**
 * DwebError 错误类
 *
 * 继承 Error，增加 code、params、details 等字段，便于统一处理与 i18n
 */
export class DwebError extends Error {
  /** 错误码，用于 i18n 键与程序化识别 */
  readonly code: DwebErrorCodeType;

  /** i18n 键，格式为 errors.{code} */
  readonly messageKey: string;

  /** 插值参数，用于 i18n 或默认消息模板 */
  readonly params?: DwebErrorParams;

  /** 附加详情（如堆栈、上下文） */
  readonly details?: unknown;

  /** 原始错误（用于包装原生 Error） */
  override readonly cause?: Error;

  constructor(
    code: DwebErrorCodeType,
    params?: DwebErrorParams,
    options?: {
      details?: unknown;
      cause?: Error;
    },
  ) {
    const message = resolveMessage(code, params);
    super(message);
    this.name = "DwebError";
    this.code = code;
    this.messageKey = `errors.${code}`;
    this.params = params;
    this.details = options?.details;
    this.cause = options?.cause;
    // 保持正确的原型链（TypeScript 编译 target 为 ES5 时）
    Object.setPrototypeOf(this, DwebError.prototype);
  }

  /** 序列化为可读字符串 */
  override toString(): string {
    return `[dweb] ${this.code}: ${this.message}`;
  }

  /** 转为普通对象，便于日志或 JSON 序列化 */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      messageKey: this.messageKey,
      params: this.params,
      details: this.details,
      cause: this.cause?.message,
    };
  }
}

/**
 * 类型守卫：判断值是否为 DwebError 实例
 *
 * @param err - 待检测的值
 * @returns 若为 DwebError 实例返回 true，否则 false
 *
 * @example
 * ```ts
 * try { ... } catch (e) {
 *   if (isDwebError(e)) console.log(e.code, e.params);
 * }
 * ```
 */
export function isDwebError(err: unknown): err is DwebError {
  return err instanceof DwebError;
}

/**
 * 创建 DwebError 实例（不抛出）
 *
 * @param code - 错误码
 * @param params - 插值参数
 * @param options - details、cause
 * @returns DwebError 实例
 */
export function createDwebError(
  code: DwebErrorCodeType,
  params?: DwebErrorParams,
  options?: { details?: unknown; cause?: Error },
): DwebError {
  return new DwebError(code, params, options);
}

/**
 * 抛出 DwebError（便捷方法）
 *
 * @param code - 错误码
 * @param params - 插值参数
 * @param options - details、cause
 * @throws DwebError
 */
export function throwDwebError(
  code: DwebErrorCodeType,
  params?: DwebErrorParams,
  options?: { details?: unknown; cause?: Error },
): never {
  throw createDwebError(code, params, options);
}
