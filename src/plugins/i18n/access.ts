/**
 * i18n 访问辅助模块
 * 提供全局 i18n 访问接口，用于在 Model、工具函数等非请求上下文中使用翻译
 *
 * 注意：在多应用场景下，每个应用实例都有独立的翻译缓存和语言状态
 */

import type { TranslationData } from "./types.ts";

/**
 * 应用实例的翻译缓存映射
 * key: 应用实例标识（通过 app 对象的唯一标识）
 * value: 该应用实例的翻译缓存
 */
const appTranslationCaches = new Map<
  string | symbol,
  Map<string, TranslationData>
>();

/**
 * 应用实例的默认语言映射
 * key: 应用实例标识
 * value: 该应用实例的默认语言代码
 */
const appDefaultLanguages = new Map<string | symbol, string>();

/**
 * 应用实例的当前语言映射（在请求上下文中设置）
 * key: 应用实例标识
 * value: 该应用实例的当前语言代码
 */
const appCurrentLanguages = new Map<string | symbol, string | null>();

/**
 * 获取应用实例的唯一标识
 * 优先使用 app.name，如果没有则使用 app 对象本身作为标识
 */
function getAppId(app: unknown): string | symbol {
  if (app && typeof app === "object") {
    const appObj = app as Record<string, unknown>;
    // 尝试从 app 对象获取唯一标识
    if (appObj.name && typeof appObj.name === "string") {
      return appObj.name;
    }
    // 尝试从 server 对象获取标识
    if (appObj.server && typeof appObj.server === "object") {
      const server = appObj.server as Record<string, unknown>;
      if (server.port && typeof server.port === "number") {
        return `app_${server.port}`;
      }
    }
  }
  // 如果无法获取唯一标识，使用 Symbol 作为后备方案
  // 注意：这会导致无法在多个实例间共享，但至少不会相互覆盖
  return Symbol("unknown_app");
}

/**
 * 默认翻译函数（当 i18n 未初始化时使用）
 * 这个函数始终返回 key 本身，确保 $t() 始终可用
 */
const defaultTranslationFunction: (
  key: string,
  params?: Record<string, any>,
) => string = (key: string) => key;

/**
 * 初始化 i18n 访问（由 i18n 插件调用）
 * @param cache 翻译缓存
 * @param defaultLang 默认语言代码
 * @param app 应用实例（用于多应用场景下的隔离）
 */
export function initI18nAccess(
  cache: Map<string, TranslationData>,
  defaultLang: string,
  app?: unknown,
): void {
  const appId = getAppId(app);
  appTranslationCaches.set(appId, cache);
  appDefaultLanguages.set(appId, defaultLang);

  // 初始化全局 $t 函数（使用默认语言）
  // 只有在 i18n 插件已初始化时才设置全局函数
  // 注意：在多应用场景下，globalThis.$t 会使用最后初始化的应用实例
  // 但在请求处理时，会通过 req.__setGlobalI18n 设置正确的翻译函数
  if (typeof globalThis !== "undefined") {
    const defaultTFunction = getI18n(defaultLang, app);
    (globalThis as any).$t = defaultTFunction;
  }
}

/**
 * 确保全局 $t 函数已初始化
 * 如果 i18n 插件已初始化，使用实际的翻译函数
 * 如果未初始化，使用默认函数（返回 key 本身）
 * 这确保 $t() 始终可用，不会报错
 *
 * @param app 应用实例（可选，用于多应用场景）
 */
export function ensureGlobalI18n(app?: unknown): void {
  if (typeof globalThis !== "undefined") {
    // 如果 i18n 已初始化，使用实际的翻译函数
    if (isI18nInitialized(app)) {
      if (!(globalThis as any).$t) {
        const tFunc = getI18n(undefined, app);
        (globalThis as any).$t = tFunc;
      }
    } else {
      // 如果 i18n 未初始化，使用默认函数（返回 key 本身）
      // 这确保 $t() 始终可用，不会报错
      if (!(globalThis as any).$t) {
        (globalThis as any).$t = defaultTranslationFunction;
      }
    }
  }
}

/**
 * 设置当前语言（由 i18n 插件在请求处理时调用）
 * @param langCode 语言代码
 * @param app 应用实例（可选，用于多应用场景下的隔离）
 */
export function setCurrentLanguage(langCode: string, app?: unknown): void {
  const appId = getAppId(app);
  appCurrentLanguages.set(appId, langCode);
}

/**
 * 清除当前语言（请求处理完成后调用）
 * @param app 应用实例（可选，用于多应用场景下的隔离）
 */
export function clearCurrentLanguage(app?: unknown): void {
  const appId = getAppId(app);
  appCurrentLanguages.delete(appId);
}

/**
 * 翻译函数（简单实现）
 */
function translate(
  key: string,
  translations: TranslationData | null,
  params?: Record<string, any>,
): string {
  if (!translations) {
    return key;
  }

  // 支持嵌套键（如 'common.title'）
  const keys = key.split(".");
  let value: string | Record<string, unknown> | undefined = translations;

  for (const k of keys) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      value = value[k] as string | Record<string, unknown> | undefined;
    } else {
      return key;
    }
  }

  if (typeof value !== "string") {
    return key;
  }

  // 替换参数（如 {name} -> 实际值）
  // 支持 string、number、boolean 类型，自动转换为字符串
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      const paramValue = params[paramKey];
      if (paramValue !== undefined && paramValue !== null) {
        return String(paramValue);
      }
      return match;
    });
  }

  return value;
}

/**
 * 获取翻译函数
 * @param langCode 语言代码（可选，如果不提供则使用当前语言或默认语言）
 * @param app 应用实例（可选，用于多应用场景下的隔离）
 * @returns 翻译函数
 */
export function getI18n(
  langCode?: string,
  app?: unknown,
): (key: string, params?: Record<string, any>) => string {
  const appId = getAppId(app);
  const translationCache = appTranslationCaches.get(appId);

  if (!translationCache) {
    // 如果 i18n 未初始化，返回一个返回 key 的函数
    return (key: string) => key;
  }

  // 确定使用的语言代码
  const currentLang = appCurrentLanguages.get(appId) || null;
  const defaultLang = appDefaultLanguages.get(appId) || "en";
  const lang = langCode || currentLang || defaultLang;

  // 获取对应语言的翻译数据
  const translations = translationCache.get(lang) || null;

  // 返回翻译函数
  // 支持任意类型参数（string、number、boolean 等），自动转换为字符串
  return (key: string, params?: Record<string, any>) => {
    return translate(key, translations, params);
  };
}

/**
 * 获取当前语言代码
 * @param app 应用实例（可选，用于多应用场景下的隔离）
 * @returns 当前语言代码，如果未设置则返回默认语言
 */
export function getCurrentLanguage(app?: unknown): string {
  const appId = getAppId(app);
  const currentLang = appCurrentLanguages.get(appId) || null;
  const defaultLang = appDefaultLanguages.get(appId) || "en";
  return currentLang || defaultLang;
}

/**
 * 检查 i18n 是否已初始化
 * @param app 应用实例（可选，用于多应用场景下的隔离）
 * @returns 是否已初始化
 */
export function isI18nInitialized(app?: unknown): boolean {
  const appId = getAppId(app);
  return appTranslationCaches.has(appId);
}
