/**
 * i18n 访问辅助模块
 * 提供全局 i18n 访问接口，用于在 Model、工具函数等非请求上下文中使用翻译
 */

import type { TranslationData } from "./types.ts";

/**
 * 全局翻译缓存
 */
let translationCache: Map<string, TranslationData> | null = null;

/**
 * 默认语言代码
 */
let defaultLanguage: string = "en";

/**
 * 当前语言代码（在请求上下文中设置）
 */
let currentLanguage: string | null = null;

/**
 * 默认翻译函数（当 i18n 未初始化时使用）
 */
const defaultTranslationFunction: (
  key: string,
  params?: Record<string, string>,
) => string = (key: string) => key;

/**
 * 初始化 i18n 访问（由 i18n 插件调用）
 * @param cache 翻译缓存
 * @param defaultLang 默认语言代码
 */
export function initI18nAccess(
  cache: Map<string, TranslationData>,
  defaultLang: string,
): void {
  translationCache = cache;
  defaultLanguage = defaultLang;

  // 初始化全局 $t 和 t 函数（使用默认语言）
  // 只有在 i18n 插件已初始化时才设置全局函数
  if (typeof globalThis !== "undefined") {
    const defaultTFunction = getI18n(defaultLang);
    (globalThis as any).$t = defaultTFunction;
    (globalThis as any).t = defaultTFunction;
  }
}

/**
 * 确保全局 $t 和 t 函数已初始化
 * 只有在 i18n 插件已初始化时才设置全局函数
 * 如果未初始化，不设置全局函数（避免在没有使用 i18n 插件时创建不必要的全局变量）
 */
export function ensureGlobalI18n(): void {
  // 只有在 i18n 已初始化时才设置全局函数
  if (!isI18nInitialized()) {
    return;
  }

  if (typeof globalThis !== "undefined") {
    if (!(globalThis as any).$t) {
      const tFunc = getI18n();
      (globalThis as any).$t = tFunc;
      (globalThis as any).t = tFunc;
    }
  }
}

/**
 * 设置当前语言（由 i18n 插件在请求处理时调用）
 * @param langCode 语言代码
 */
export function setCurrentLanguage(langCode: string): void {
  currentLanguage = langCode;
}

/**
 * 清除当前语言（请求处理完成后调用）
 */
export function clearCurrentLanguage(): void {
  currentLanguage = null;
}

/**
 * 翻译函数（简单实现）
 */
function translate(
  key: string,
  translations: TranslationData | null,
  params?: Record<string, string>,
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
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] || match;
    });
  }

  return value;
}

/**
 * 获取翻译函数
 * @param langCode 语言代码（可选，如果不提供则使用当前语言或默认语言）
 * @returns 翻译函数
 */
export function getI18n(
  langCode?: string,
): (key: string, params?: Record<string, string>) => string {
  if (!translationCache) {
    // 如果 i18n 未初始化，返回一个返回 key 的函数
    return (key: string) => key;
  }

  // 确定使用的语言代码
  const lang = langCode || currentLanguage || defaultLanguage;

  // 获取对应语言的翻译数据
  const translations = translationCache.get(lang) || null;

  // 返回翻译函数
  return (key: string, params?: Record<string, string>) => {
    return translate(key, translations, params);
  };
}

/**
 * 获取当前语言代码
 * @returns 当前语言代码，如果未设置则返回默认语言
 */
export function getCurrentLanguage(): string {
  return currentLanguage || defaultLanguage;
}

/**
 * 检查 i18n 是否已初始化
 * @returns 是否已初始化
 */
export function isI18nInitialized(): boolean {
  return translationCache !== null;
}
