/**
 * i18n 插件
 * 多语言支持：自动检测语言、路由级语言切换、翻译文件管理
 */

// 注意：全局类型声明在 example/i18n-global.d.ts 中
// 由于 JSR 不允许修改全局类型，用户需要在项目中手动引用 i18n-global.d.ts

// 在模块加载时初始化默认全局函数
// 这确保即使 i18n 插件未使用，$t() 也可以使用（返回 key 本身）
if (typeof globalThis !== "undefined") {
  const defaultT = (key: string) => key;
  if (!(globalThis as any).$t) {
    (globalThis as any).$t = defaultT;
  }
}

import type {
  AppLike,
  Plugin,
  Request,
  Response,
} from "../../common/types/index.ts";
import type { I18nPluginOptions, TranslationData } from "./types.ts";
import * as path from "@std/path";
import {
  clearCurrentLanguage,
  ensureGlobalI18n,
  initI18nAccess,
  setCurrentLanguage,
} from "./access.ts";
import { minifyJavaScript } from "../../server/utils/minify.ts";
import { compileWithEsbuild } from "../../server/utils/module.ts";

/**
 * 加载翻译文件
 * 支持从构建输出目录（生产环境）或原始项目目录（开发环境）加载
 *
 * @param translationsDir - 翻译文件目录（相对路径或绝对路径）
 * @param languageCode - 语言代码
 * @param app - 应用实例（可选，用于获取配置信息）
 * @returns 翻译数据，如果加载失败则返回 null
 */
async function loadTranslations(
  translationsDir: string,
  languageCode: string,
  app?: AppLike,
): Promise<TranslationData | null> {
  const cwd = Deno.cwd();

  // 如果 translationsDir 是绝对路径，直接使用
  if (path.isAbsolute(translationsDir)) {
    const filePath = path.join(translationsDir, `${languageCode}.json`);
    try {
      const content = await Deno.readTextFile(filePath);
      const translations = JSON.parse(content) as TranslationData;
      return translations;
    } catch {
      return null;
    }
  }

  // 相对路径：尝试从多个位置加载
  // 1. 首先尝试从构建输出目录加载（生产环境）
  // 检查是否为生产环境，以及是否有构建输出目录
  const isProduction = app?.isProduction ?? false;

  if (isProduction) {
    // 尝试从配置中获取构建输出目录
    let outDir: string | undefined;
    let appName: string | undefined;

    // 尝试从 app 实例获取配置
    if (app) {
      // 尝试通过 getConfig 方法获取配置（ApplicationContext）
      const getConfig = (app as any).getConfig;
      if (typeof getConfig === "function") {
        try {
          const config = getConfig();
          outDir = config?.build?.outDir;
          appName = config?.name;
        } catch {
          // 忽略错误
        }
      }

      // 如果无法从 getConfig 获取，尝试通过 getService 获取配置管理器
      if (!outDir) {
        const getService = (app as any).getService;
        if (typeof getService === "function") {
          try {
            const configManager = getService("configManager");
            if (
              configManager && typeof configManager.getConfig === "function"
            ) {
              const config = configManager.getConfig();
              outDir = config?.build?.outDir;
              appName = config?.name;
            }
          } catch {
            // 忽略错误
          }
        }
      }
    }

    // 如果从配置中获取到了 outDir，使用它
    if (outDir) {
      const dir = appName ? path.join(outDir, appName) : outDir;
      const buildPath = path.join(dir, translationsDir, `${languageCode}.json`);
      try {
        const content = await Deno.readTextFile(path.join(cwd, buildPath));
        const translations = JSON.parse(content) as TranslationData;
        return translations;
      } catch {
        // 继续尝试其他位置
      }
    }
  }

  // 2. 从原始项目目录加载（开发环境或回退）
  const projectPath = path.join(cwd, translationsDir, `${languageCode}.json`);
  try {
    const content = await Deno.readTextFile(projectPath);
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

  // 翻译缓存（每个插件实例都有独立的缓存）
  const translationCache = new Map<string, TranslationData>();

  // 缓存编译后的客户端脚本
  let cachedClientScript: string | null = null;

  /**
   * 编译客户端 i18n 脚本
   */
  async function compileClientScript(): Promise<string> {
    if (cachedClientScript) {
      return cachedClientScript;
    }

    try {
      // 内联浏览器端脚本内容，避免生产环境无法读取文件的问题
      const browserScriptContent = `/// <reference lib="dom" />
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
      return value.replace(/\\{(\\w+)\\}/g, (match, paramKey) => {
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
        \`加载语言包失败: \${response.status} \${response.statusText}\`,
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
`;
      // 虚拟路径，用于错误报告
      const browserScriptPath = "browser.ts";
      // 使用 esbuild 编译 TypeScript 为 JavaScript
      const compiledCode = await compileWithEsbuild(
        browserScriptContent,
        browserScriptPath,
      );

      // 压缩代码
      const minifiedCode = await minifyJavaScript(compiledCode);
      cachedClientScript = minifiedCode;

      return minifiedCode;
    } catch (error) {
      console.error("[i18n Plugin] 编译客户端脚本失败:", error);
      // 如果编译失败，返回空字符串
      return "";
    }
  }

  /**
   * 生成 i18n 初始化脚本（只包含语言代码和 API 端点）
   * 使用立即执行的异步函数来加载语言包
   */
  function generateInitScript(config: {
    lang: string;
    apiEndpoint: string;
  }): string {
    // 转义 JSON 中的 HTML 特殊字符，防止 XSS
    const configJson = JSON.stringify({
      lang: config.lang,
      apiEndpoint: config.apiEndpoint,
    })
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e");

    return `(async function() {
  try {
    await initI18n(${configJson});
  } catch (error) {
    console.error('[i18n] 初始化失败:', error);
  }
})();`;
  }

  return {
    name: "i18n",
    config: options as unknown as Record<string, unknown>,

    /**
     * 初始化钩子 - 预加载翻译文件
     */
    async onInit(app: AppLike) {
      // 预加载所有语言的翻译文件
      for (const lang of options.languages) {
        try {
          const translations = await loadTranslations(
            translationsDir,
            lang.code,
            app,
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
      // 传递 app 实例以支持多应用场景下的隔离
      initI18nAccess(translationCache, defaultLang, app);
      // 确保全局函数已初始化（只有在 i18n 插件已初始化时才设置）
      ensureGlobalI18n(app);
    },

    /**
     * 请求处理钩子 - 检测语言并注入到请求对象，处理语言包 API 请求
     */
    onRequest: async (req: Request, res: Response) => {
      // 处理语言包 API 请求（如 /i18n/locales/en-US.json）
      const url = new URL(req.url);
      const i18nApiPrefix = "/i18n/locales/";

      if (url.pathname.startsWith(i18nApiPrefix)) {
        // 提取语言代码（如 /__i18n/locales/en-US.json -> en-US）
        const langCode = url.pathname.substring(i18nApiPrefix.length).replace(
          /\.json$/,
          "",
        );

        // 检查语言是否支持
        const langConfig = options.languages.find((l) => l.code === langCode);
        if (!langConfig) {
          res.json({ error: `不支持的语言: ${langCode}` }, { status: 404 });
          return;
        }

        // 从缓存获取翻译数据
        let translations = translationCache.get(langCode);

        // 如果缓存中没有，尝试加载
        // 注意：这里无法直接访问 app 实例，但可以通过 req.getApplication() 获取
        // 为了简化，我们使用一个全局变量来存储 app 实例
        // 或者，我们可以从请求上下文中获取应用实例
        if (!translations) {
          // 尝试从请求对象获取应用实例（如果可用）
          const appInstance = (req as any).getApplication?.() as
            | AppLike
            | undefined;
          const loaded = await loadTranslations(
            translationsDir,
            langCode,
            appInstance,
          );
          if (loaded) {
            translations = loaded;
            translationCache.set(langCode, translations);
          }
        }

        if (!translations) {
          res.json({ error: `语言包未找到: ${langCode}` }, { status: 404 });
          return;
        }

        // 返回 JSON 格式的语言包
        res.json(translations, {
          headers: {
            "Cache-Control": "public, max-age=3600", // 缓存 1 小时
          },
        });
        return;
      }

      // 原有的语言检测逻辑
      // 检测语言
      const langCode = detectLanguage(req, options);
      const langConfig = options.languages.find((l) => l.code === langCode) ||
        options.languages[0];

      // 设置当前语言（用于全局访问）
      // 注意：在多应用场景下，需要从请求对象获取应用实例
      // 但由于 Request 对象可能没有直接引用 app，这里先使用全局方式
      // 在请求处理时，会通过 req.__setGlobalI18n 设置正确的翻译函数
      setCurrentLanguage(langCode);

      // 创建翻译函数
      // 支持任意类型参数（string、number、boolean 等），自动转换为字符串
      const tFunction = (key: string, params?: Record<string, any>) => {
        return translate(key, translationCache.get(langCode) || null, params);
      };

      // 将语言信息存储到请求对象（通过扩展属性）
      (req as any).lang = langCode;
      (req as any).langConfig = langConfig;
      (req as any).translations = translationCache.get(langCode) || null;
      (req as any).t = tFunction; // 保留 t 用于向后兼容（通过 PageProps 和 LoadContext）

      // 立即在服务端设置全局 $t 函数（使用当前请求的语言）
      // 这样在请求处理过程中就可以直接使用 $t()
      if (typeof globalThis !== "undefined") {
        (globalThis as any).$t = tFunction;
      }

      // 将翻译函数存储到请求对象，供 route-handler 在渲染时使用
      (req as any).__setGlobalI18n = () => {
        if (typeof globalThis !== "undefined") {
          (globalThis as any).$t = tFunction;
        }
      };

      (req as any).__clearGlobalI18n = () => {
        if (typeof globalThis !== "undefined") {
          delete (globalThis as any).$t;
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
    onResponse: async (req: Request, res: Response) => {
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

            // 注入 i18n 客户端脚本（在 </head> 之前）
            // 不再直接注入翻译数据，而是通过 API 请求获取
            if (newHtml.includes("</head>")) {
              try {
                // 编译客户端脚本
                const clientScript = await compileClientScript();
                if (!clientScript) {
                  console.warn("[i18n Plugin] 客户端脚本编译失败，跳过注入");
                } else {
                  // 生成 API 端点 URL
                  const apiEndpoint = `/i18n/locales/${langCode}.json`;

                  // 生成初始化脚本（只包含语言代码和 API 端点）
                  const initScript = generateInitScript({
                    lang: langCode,
                    apiEndpoint,
                  });

                  // 组合完整的脚本
                  const fullScript = `${clientScript}\n${initScript}`;
                  const scriptTag =
                    `<script data-type="dweb-i18n">${fullScript}</script>`;

                  // 使用 lastIndexOf 确保在最后一个 </head> 之前注入
                  const lastHeadIndex = newHtml.lastIndexOf("</head>");
                  if (lastHeadIndex !== -1) {
                    newHtml = newHtml.substring(0, lastHeadIndex) +
                      `${scriptTag}\n` +
                      newHtml.substring(lastHeadIndex);
                  }
                }
              } catch (error) {
                console.error("[i18n Plugin] 注入 i18n 脚本时出错:", error);
              }
            }

            res.body = newHtml;
          }
        }
      }

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
