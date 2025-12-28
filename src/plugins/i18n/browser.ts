/// <reference lib="dom" />
/**
 * i18n 客户端脚本
 * 在浏览器中运行的国际化代码
 */

interface I18nData {
  lang: string;
  translations: Record<string, unknown>;
  t: (key: string, params?: Record<string, any>) => string;
}

interface I18nConfig {
  lang: string;
  apiEndpoint?: string; // API 端点（用于获取语言包）
  translations?: Record<string, unknown>; // 向后兼容：如果提供了 translations，直接使用
}

/**
 * 翻译函数（支持嵌套键和参数替换）
 */
function createTranslateFunction(
  translations: Record<string, unknown>,
): (key: string, params?: Record<string, any>) => string {
  return function (key: string, params?: Record<string, any>): string {
    if (!translations || typeof translations !== "object") {
      return key;
    }

    // 支持嵌套键（如 'common.title'）和直接键（如 '你好，世界！'）
    const keys = key.split(".");
    let value: unknown = translations;

    for (const k of keys) {
      if (
        typeof value === "object" && value !== null && !Array.isArray(value)
      ) {
        value = (value as Record<string, unknown>)[k];
        // 如果找不到，且是单个键，尝试直接使用整个 key
        if (value === undefined && keys.length === 1) {
          value = (translations as Record<string, unknown>)[key];
        }
        if (value === undefined) {
          return key;
        }
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
  };
}

/**
 * 通过 API 加载语言包
 */
async function loadTranslationsFromAPI(
  apiEndpoint: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(apiEndpoint, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `加载语言包失败: ${response.status} ${response.statusText}`,
      );
    }

    const translations = await response.json() as Record<string, unknown>;
    return translations;
  } catch (error) {
    console.error("[i18n] 加载语言包失败:", error);
    // 返回空对象，避免后续错误
    return {};
  }
}

/**
 * 初始化 i18n 系统
 * 暴露到全局，供内联脚本调用
 * 支持两种方式：
 * 1. 直接提供 translations（向后兼容）
 * 2. 通过 apiEndpoint 异步加载语言包（新方式）
 */
async function initI18n(config: I18nConfig): Promise<void> {
  let translations: Record<string, unknown> = {};

  // 如果提供了 translations，直接使用（向后兼容）
  if (config.translations) {
    translations = config.translations;
  } else if (config.apiEndpoint) {
    // 通过 API 加载语言包
    translations = await loadTranslationsFromAPI(config.apiEndpoint);
  } else {
    console.warn("[i18n] 未提供 translations 或 apiEndpoint，使用空语言包");
  }

  // 创建翻译函数
  const tFunction = createTranslateFunction(translations);

  // 创建 i18n 数据对象
  const i18nData: I18nData = {
    lang: config.lang,
    translations,
    t: tFunction,
  };

  // 暴露到全局
  (globalThis as any).__I18N_DATA__ = i18nData;

  // 全局翻译函数（确保 this 指向 window.__I18N_DATA__）
  // 支持任意类型参数（string、number、boolean 等），自动转换为字符串
  (globalThis as any).$t = function (
    key: string,
    params?: Record<string, any>,
  ): string {
    if (!i18nData || !i18nData.t) {
      return key;
    }
    return i18nData.t.call(i18nData, key, params);
  };
}

// 暴露到全局，供内联脚本调用
if (typeof globalThis !== "undefined") {
  (globalThis as any).initI18n = initI18n;
}
