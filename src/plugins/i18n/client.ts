/**
 * i18n 客户端访问模块
 * 提供类型安全的 i18n 访问接口，用于在客户端组件中访问和操作国际化功能
 */

/**
 * i18n 数据接口
 */
interface I18nData {
  lang: string;
  translations: Record<string, unknown>;
  t: (key: string, params?: Record<string, any>) => string;
}

/**
 * 获取 i18n 数据对象
 * @returns i18n 数据对象，如果不在客户端环境或未初始化则返回 null
 */
export function getI18n(): I18nData | null {
  if (typeof globalThis === "undefined" || !globalThis.window) {
    // SSR 时不在客户端环境是正常的，不需要输出警告
    return null;
  }

  const win = globalThis.window as Window & {
    __I18N_DATA__?: I18nData;
  };

  return win.__I18N_DATA__ || null;
}

/**
 * 获取当前语言代码
 * @returns 当前语言代码，如果 i18n 未初始化则返回 null
 */
export function getCurrentLanguage(): string | null {
  const i18nData = getI18n();
  if (!i18nData) {
    return null;
  }
  return i18nData.lang;
}

/**
 * 设置当前语言
 * 会通过 API 重新加载对应语言的语言包，并更新全局 i18n 数据
 * @param langCode 语言代码（如 'zh-CN', 'en-US'）
 * @returns Promise<void>
 */
export async function setCurrentLanguage(langCode: string): Promise<void> {
  if (typeof globalThis === "undefined" || !globalThis.window) {
    console.warn(
      "[i18n Client] 无法设置语言：不在客户端环境",
    );
    return;
  }

  const win = globalThis.window as Window & {
    initI18n?: (config: {
      lang: string;
      apiEndpoint: string;
    }) => Promise<void>;
  };

  if (!win.initI18n) {
    console.warn(
      "[i18n Client] 无法设置语言：initI18n 函数未初始化",
    );
    return;
  }

  // 生成 API 端点 URL
  const apiEndpoint = `/__i18n/${langCode}.json?t=${Date.now()}`;

  try {
    // 调用全局 initI18n 函数重新加载语言包
    await win.initI18n({
      lang: langCode,
      apiEndpoint,
    });

    // 更新 Cookie（如果可用）
    // 注意：这里需要确保 Cookie 名称与插件配置一致
    // 默认使用 'lang'，但可以通过配置修改
    try {
      document.cookie = `lang=${langCode}; path=/; max-age=${
        365 * 24 * 60 * 60
      }; SameSite=Lax`;
    } catch (error) {
      // Cookie 设置失败不影响语言切换
      console.warn("[i18n Client] 设置 Cookie 失败:", error);
    }
  } catch (error) {
    console.error("[i18n Client] 设置语言失败:", error);
    throw error;
  }
}

/**
 * 翻译函数
 * 使用当前语言的翻译数据翻译指定的 key
 * @param key 翻译键（支持嵌套键，如 'common.title'）
 * @param params 参数对象（可选，用于替换翻译文本中的占位符，如 {name: 'John'}）
 * @returns 翻译后的文本，如果未找到则返回 key 本身
 */
export function translate(
  key: string,
  params?: Record<string, any>,
): string {
  const i18nData = getI18n();
  if (!i18nData || !i18nData.t) {
    // 如果 i18n 未初始化，返回 key 本身
    return key;
  }
  return i18nData.t(key, params);
}

/**
 * 获取翻译数据
 * @returns 当前语言的翻译数据对象，如果未初始化则返回 null
 */
export function getTranslations(): Record<string, unknown> | null {
  const i18nData = getI18n();
  if (!i18nData) {
    return null;
  }
  return i18nData.translations;
}

/**
 * 检查 i18n 是否已初始化
 * @returns 如果已初始化返回 true，否则返回 false
 */
export function isI18nInitialized(): boolean {
  return getI18n() !== null;
}
