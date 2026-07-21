/**
 * 框架常量集中定义
 *
 * 用途：缓存容量、路径等魔法数字/字符串统一在此维护，便于查找与调优。
 * 部分数值可通过 setCacheOptions() 由 config.build.devCache 覆盖（默认见下方）。
 */

/** 开发态缓存选项（可由 config.build.devCache 覆盖，不设置则用 DEFAULT_CACHE_OPTIONS） */
export interface DevCacheOptions {
  /** CSS 路由模块缓存最大条目数，超出淘汰最早条目。调优：路由+CSS 较多时可适当增大。 */
  maxCssRouteCacheSize: number;
  /** 模块版本 map 最大条目数，超出淘汰最早条目。调优：文件变更很多时可适当增大。 */
  maxVersionMapSize: number;
  /** 模块版本 map 淘汰触发间隔：每 N 次写入且超容时触发一次淘汰，减少 Map 迭代频率。 */
  evictionBatchInterval: number;
}

/** 默认开发态缓存选项 */
export const DEFAULT_CACHE_OPTIONS: DevCacheOptions = {
  maxCssRouteCacheSize: 500,
  maxVersionMapSize: 2000,
  evictionBatchInterval: 50,
};

/**
 * 带 content-hash 的静态 JS/CSS 等长缓存策略（immutable 一年）。
 * 文档 HTML / `__data` 等不得使用此值（仍 no-store）。
 */
export const HASHED_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** 开发态资源禁用缓存（与 createDevNoCacheMiddleware 语义一致） */
export const DEV_NO_CACHE_CONTROL = "no-cache, no-store, must-revalidate";

const cacheOptions: DevCacheOptions = { ...DEFAULT_CACHE_OPTIONS };

/**
 * 获取当前开发态缓存选项（供 load-route-module、module-cache 使用）
 */
export function getCacheOptions(): DevCacheOptions {
  return cacheOptions;
}

/**
 * 设置开发态缓存选项（由 App 在初始化时根据 config.build.devCache 调用，不破坏现有功能）
 * Windows 兼容：仅数值选项，无路径格式依赖。
 */
export function setCacheOptions(options: Partial<DevCacheOptions>): void {
  if (
    options.maxCssRouteCacheSize != null && options.maxCssRouteCacheSize > 0
  ) {
    cacheOptions.maxCssRouteCacheSize = options.maxCssRouteCacheSize;
  }
  if (options.maxVersionMapSize != null && options.maxVersionMapSize > 0) {
    cacheOptions.maxVersionMapSize = options.maxVersionMapSize;
  }
  if (
    options.evictionBatchInterval != null && options.evictionBatchInterval > 0
  ) {
    cacheOptions.evictionBatchInterval = options.evictionBatchInterval;
  }
}

// --- 路径与文件名常量（与中间件、客户端脚本、数据接口一致） ---

/** Load 数据接口 pathname，客户端 fetch 与服务端中间件匹配用。 */
export const DWEB_DATA_PATH = "/__data";

/** 客户端主入口 URL 路径（/_client.js），与 CLIENT_OUTPUT_MAIN_FILENAME 对应。 */
export const CLIENT_SCRIPT_PATH = "/_client.js";

/** 客户端 chunk 的 URL 前缀（/_client/），代码分割时 chunk 请求路径。 */
export const CLIENT_CHUNK_PREFIX = "/_client/";

/** 客户端主入口输出文件名（单文件模式，esbuild 输出）。 */
export const CLIENT_OUTPUT_MAIN_FILENAME = "_client.js";

/** 客户端入口源文件名（_client.tsx），不存在时由框架生成。 */
export const CLIENT_ENTRY_FILENAME = "_client.tsx";

// --- SSG 小站预读 HTML 默认阈值（与 OPTIMIZATION_ANALYSIS 一致） ---

/** 小站预读 HTML 默认最大页数，超出则按请求读盘。 */
export const DEFAULT_PRELOAD_MAX_PAGES = 200;

/** 小站预读 HTML 默认最大体积（MB），超出则按请求读盘。 */
export const DEFAULT_PRELOAD_MAX_SIZE_MB = 10;
