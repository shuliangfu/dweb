/**
 * i18n 插件
 * 多语言支持：自动检测语言、路由级语言切换、翻译文件管理
 */

// 引用全局类型声明（使 $t 和 t 函数在全局可用）
import "./global.d.ts";

// 在模块加载时初始化默认全局函数
// 这确保即使 i18n 插件未使用，$t() 和 t() 也可以使用（返回 key 本身）
if (typeof globalThis !== "undefined") {
  const defaultT = (key: string) => key;
  if (!(globalThis as any).$t) {
    (globalThis as any).$t = defaultT;
  }
  if (!(globalThis as any).t) {
    (globalThis as any).t = defaultT;
  }
}

import type { AppLike, Plugin, Request, Response } from "../../types/index.ts";
import type { I18nPluginOptions, TranslationData } from "./types.ts";
import * as path from "@std/path";
import {
  clearCurrentLanguage,
  ensureGlobalI18n,
  initI18nAccess,
  setCurrentLanguage,
} from "./access.ts";

/**
 * 加载翻译文件
 */
async function loadTranslations(
  translationsDir: string,
  languageCode: string,
): Promise<TranslationData | null> {
  try {
    // 解析翻译文件路径
    // 如果 translationsDir 是相对路径，从当前工作目录解析
    let filePath: string;
    if (path.isAbsolute(translationsDir)) {
      filePath = path.join(translationsDir, `${languageCode}.json`);
    } else {
      // 相对路径：从当前工作目录解析
      const cwd = Deno.cwd();
      filePath = path.join(cwd, translationsDir, `${languageCode}.json`);
    }

    // 尝试加载语言文件
    const content = await Deno.readTextFile(filePath);
    const translations = JSON.parse(content) as TranslationData;
    return translations;
  } catch {
    // 文件不存在或解析失败
    return null;
  }
}

/**
 * 检测语言
 */
function detectLanguage(req: Request, options: I18nPluginOptions): string {
  const detection = options.detection || {};
  const defaultLang = options.defaultLanguage ||
    options.languages.find((l) => l.default)?.code ||
    options.languages[0]?.code ||
    "en";

  // 从 URL 路径检测（如 /en/page）
  if (detection.fromPath !== false) {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      const firstPart = pathParts[0];
      const lang = options.languages.find((l) => l.code === firstPart);
      if (lang) {
        return lang.code;
      }
    }
  }

  // 从查询参数检测（如 ?lang=en）
  if (detection.fromQuery !== false) {
    const lang = req.query.lang || req.query.language;
    if (lang) {
      const found = options.languages.find((l) => l.code === lang);
      if (found) {
        return found.code;
      }
    }
  }

  // 从 Cookie 检测
  if (detection.fromCookie !== false) {
    const cookieName = detection.cookieName || "lang";
    const lang = req.getCookie(cookieName);
    if (lang) {
      const found = options.languages.find((l) => l.code === lang);
      if (found) {
        return found.code;
      }
    }
  }

  // 从 Accept-Language 头检测
  // 注意：如果 detection.fromHeader 未明确设置为 true，默认不启用
  // 这样可以避免浏览器语言设置覆盖默认语言
  if (detection.fromHeader === true) {
    const acceptLanguage = req.getHeader("Accept-Language");
    if (acceptLanguage) {
      // 解析 Accept-Language 头（简化处理）
      const languages = acceptLanguage.split(",").map((l) => {
        const parts = l.trim().split(";");
        return parts[0].toLowerCase();
      });

      for (const lang of languages) {
        // 精确匹配
        const found = options.languages.find((l) =>
          l.code.toLowerCase() === lang
        );
        if (found) {
          return found.code;
        }

        // 部分匹配（如 'en' 匹配 'en-US'）
        const foundPartial = options.languages.find((l) =>
          l.code.toLowerCase().startsWith(lang.split("-")[0])
        );
        if (foundPartial) {
          return foundPartial.code;
        }
      }
    }
  }

  return defaultLang;
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
 * 注入语言属性到 HTML
 */
function injectLangAttribute(
  html: string,
  langCode: string,
  isRtl: boolean,
): string {
  let result = html;

  // 注入 <html lang="..."> 属性
  if (result.includes("<html")) {
    // 替换或添加 lang 属性
    if (result.match(/<html[^>]*lang=["'][^"']*["']/)) {
      result = result.replace(
        /<html([^>]*?)lang=["'][^"']*["']/,
        `<html$1lang="${langCode}"`,
      );
    } else {
      result = result.replace(
        /<html([^>]*?)>/,
        `<html$1 lang="${langCode}">`,
      );
    }

    // 添加 dir 属性（RTL 支持）
    if (isRtl) {
      if (result.match(/<html[^>]*dir=["'][^"']*["']/)) {
        result = result.replace(
          /<html([^>]*?)dir=["'][^"']*["']/,
          `<html$1dir="rtl"`,
        );
      } else {
        result = result.replace(
          /<html([^>]*?)>/,
          `<html$1 dir="rtl">`,
        );
      }
    }
  }

  return result;
}

/**
 * 创建 i18n 插件
 */
export function i18n(options: I18nPluginOptions): Plugin {
  if (!options.languages || options.languages.length === 0) {
    throw new Error("i18n 插件需要至少配置一种语言");
  }

  const translationsDir = options.translationsDir || "locales";

  // 翻译缓存
  const translationCache = new Map<string, TranslationData>();

  return {
    name: "i18n",
    config: options as unknown as Record<string, unknown>,

    /**
     * 初始化钩子 - 预加载翻译文件
     */
    async onInit(_app: AppLike) {
      // 预加载所有语言的翻译文件
      for (const lang of options.languages) {
        try {
          const translations = await loadTranslations(
            translationsDir,
            lang.code,
          );
          if (translations) {
            translationCache.set(lang.code, translations);
          }
        } catch (error) {
          console.warn(`[i18n Plugin] 无法加载语言文件 ${lang.code}:`, error);
        }
      }

      // 初始化全局 i18n 访问
      const defaultLang = options.defaultLanguage ||
        options.languages.find((l) => l.default)?.code ||
        options.languages[0]?.code ||
        "en";
      initI18nAccess(translationCache, defaultLang);
      // 确保全局函数已初始化（只有在 i18n 插件已初始化时才设置）
      ensureGlobalI18n();
    },

    /**
     * 请求处理钩子 - 检测语言并注入到请求对象
     */
    onRequest(req: Request, res: Response) {
      // 检测语言
      const langCode = detectLanguage(req, options);
      const langConfig = options.languages.find((l) => l.code === langCode) ||
        options.languages[0];

      // 设置当前语言（用于全局访问）
      setCurrentLanguage(langCode);

      // 创建翻译函数
      const tFunction = (key: string, params?: Record<string, string>) => {
        return translate(key, translationCache.get(langCode) || null, params);
      };

      // 将语言信息存储到请求对象（通过扩展属性）
      (req as any).lang = langCode;
      (req as any).langConfig = langConfig;
      (req as any).translations = translationCache.get(langCode) || null;
      (req as any).t = tFunction;

      // 立即在服务端设置全局 $t 和 t 函数（使用当前请求的语言）
      // 这样在请求处理过程中就可以直接使用 $t() 和 t()
      if (typeof globalThis !== "undefined") {
        (globalThis as any).$t = tFunction;
        (globalThis as any).t = tFunction;
      }

      // 将翻译函数存储到请求对象，供 route-handler 在渲染时使用
      (req as any).__setGlobalI18n = () => {
        if (typeof globalThis !== "undefined") {
          (globalThis as any).$t = tFunction;
          (globalThis as any).t = tFunction;
        }
      };

      (req as any).__clearGlobalI18n = () => {
        if (typeof globalThis !== "undefined") {
          delete (globalThis as any).$t;
          delete (globalThis as any).t;
        }
      };

      // 设置语言 Cookie
      if (options.detection?.fromCookie !== false) {
        const cookieName = options.detection?.cookieName || "lang";
        res.setCookie(cookieName, langCode, {
          maxAge: 365 * 24 * 60 * 60, // 1 年
          httpOnly: false,
          sameSite: "lax",
        });
      }

      // 注意：这里只设置语言相关的请求属性
      // 实际的 HTML 注入将在 onResponse 钩子中执行
    },

    /**
     * 响应处理钩子 - 注入语言属性和翻译数据到 HTML
     */
    onResponse(req: Request, res: Response) {
      // 获取语言信息（从请求对象中获取，在 onRequest 中已设置）
      const langCode = (req as any).lang;
      const langConfig = (req as any).langConfig;

      // 注入语言属性到 HTML 和翻译数据到客户端
      if (options.injectLangAttribute !== false) {
        if (res.body && typeof res.body === "string") {
          const contentType = res.headers.get("Content-Type") || "";
          if (contentType.includes("text/html")) {
            const html = res.body as string;
            const isRtl = langConfig?.rtl || false;
            let newHtml = injectLangAttribute(html, langCode, isRtl);

            // 注入翻译数据到客户端（在 </head> 之前）
            const translations = translationCache.get(langCode) || null;
            if (translations && newHtml.includes("</head>")) {
              const translationsScript = `
    <script>
      // i18n 翻译数据
      console.log('[i18n 插件] 开始注入翻译数据...');
      console.log('[i18n 插件] langCode:', ${JSON.stringify(langCode)});
      console.log('[i18n 插件] translations:', ${JSON.stringify(translations)});
      window.__I18N_DATA__ = {
        lang: ${JSON.stringify(langCode)},
        translations: ${JSON.stringify(translations)},
        t: function(key, params) {
          console.log('[i18n 插件] t 函数被调用，key:', key, 'params:', params);
          console.log('[i18n 插件] this:', this);
          console.log('[i18n 插件] this.translations:', this.translations);
          const translations = this.translations;
          if (!translations || typeof translations !== 'object') {
            console.log('[i18n 插件] translations 无效，返回 key');
            return key;
          }
          // 支持嵌套键（如 'common.title'）和直接键（如 '你好，世界！'）
          const keys = key.split('.');
          let value = translations;
          console.log('[i18n 插件] 开始查找翻译，keys:', keys);
          for (const k of keys) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              value = value[k];
              console.log('[i18n 插件] 查找 key:', k, 'value:', value);
              // 如果找不到，且是单个键，尝试直接使用整个 key
              if (value === undefined && keys.length === 1) {
                value = translations[key];
                console.log('[i18n 插件] 尝试直接使用整个 key:', key, 'value:', value);
              }
              if (value === undefined) {
                console.log('[i18n 插件] 未找到翻译，返回 key');
                return key;
              }
            } else {
              console.log('[i18n 插件] value 不是对象，返回 key');
              return key;
            }
          }
          if (typeof value !== 'string') {
            console.log('[i18n 插件] value 不是字符串，返回 key');
            return key;
          }
          if (params) {
            const result = value.replace(/\\{(\\w+)\\}/g, (match, paramKey) => {
              return params[paramKey] || match;
            });
            console.log('[i18n 插件] 替换参数后的结果:', result);
            return result;
          }
          console.log('[i18n 插件] 最终翻译结果:', value);
          return value;
        }
      };
      console.log('[i18n 插件] window.__I18N_DATA__ 已设置:', window.__I18N_DATA__);
      // 全局翻译函数（确保 this 指向 window.__I18N_DATA__）
      window.$t = function(key, params) {
        console.log('[i18n 插件] window.$t 被调用，key:', key, 'params:', params);
        if (!window.__I18N_DATA__ || !window.__I18N_DATA__.t) {
          console.log('[i18n 插件] window.__I18N_DATA__ 不存在或 t 函数不存在，返回 key');
          return key;
        }
        const result = window.__I18N_DATA__.t.call(window.__I18N_DATA__, key, params);
        console.log('[i18n 插件] window.$t 翻译结果:', result);
        return result;
      };
      // 也支持 t 函数
      window.t = window.$t;
      console.log('[i18n 插件] window.$t 和 window.t 已设置');
      console.log('[i18n 插件] 翻译数据注入完成');
    </script>`;
              newHtml = newHtml.replace(
                "</head>",
                `${translationsScript}\n</head>`,
              );
            }

            res.body = newHtml;
          }
        }
      }
    },

    /**
     * 响应处理钩子 - 清理当前语言
     */
    onResponse(_req: Request, _res: Response) {
      // 清理当前语言（请求处理完成后）
      clearCurrentLanguage();
    },
  };
}

// 导出类型
export type {
  DateFormatOptions,
  I18nPluginOptions,
  LanguageConfig,
  NumberFormatOptions,
  TranslationData,
} from "./types.ts";

// 导出访问函数
export { getCurrentLanguage, getI18n, isI18nInitialized } from "./access.ts";
