/**
 * 插件 - i18n 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "i18n 插件 - DWeb 框架文档",
  description: "i18n 插件使用指南",
};

export default function I18nPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const i18nCode = `import { i18n } from '@dreamer/dweb';

plugins: [
  i18n({
    // 支持的语言列表
    languages: [
      { code: 'zh-CN', name: '简体中文', default: true },
      { code: 'en-US', name: 'English' },
    ],
    // 翻译文件目录（可选，默认为 'locales'）
    translationsDir: 'locales',
    // 默认语言代码（可选，如果不指定，使用 languages 中标记为 default 的语言）
    defaultLanguage: 'zh-CN',
    // 语言检测方式（可选）
    detection: {
      fromPath: true,      // 从 URL 路径检测（如 /en/page）
      fromQuery: true,     // 从查询参数检测（如 ?lang=en）
      fromCookie: true,    // 从 Cookie 检测
      cookieName: 'lang',  // Cookie 名称（默认为 'lang'）
      fromHeader: true,    // 从 Accept-Language 头检测
    },
    // 路由前缀（可选，如 '/:lang/'）
    routePrefix: undefined,
    // 是否在 HTML 中注入语言属性（可选，默认为 true）
    injectLangAttribute: true,
    // 日期格式化选项（可选）
    dateFormat: {
      format: 'medium',
      timeZone: 'Asia/Shanghai',
    },
    // 数字格式化选项（可选）
    numberFormat: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  }),
],`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "i18n - 国际化",
    description: "i18n 插件提供国际化支持，支持多语言切换。",
    sections: [
      {
        title: "架构与特性",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**混合加载策略 (Hybrid Loading)**：支持从构建目录（生产环境）或源码目录（开发环境）灵活加载翻译文件。同时提供了 API 端点 (/i18n/locales/:lang.json)，允许客户端按需获取翻译包，减少首屏体积。",
              "**多维语言检测**：实现了基于 路径 -> 查询参数 -> Cookie -> Header 的多级语言检测策略，确保用户始终能获得正确的语言体验。",
              "**全局注入**：在服务端和客户端均注入全局 $t 函数，保证同构代码的一致性，使得在组件中进行国际化变得异常简单。",
            ],
          },
        ],
      },
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: i18nCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "配置选项",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "必需参数",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`languages`** - 支持的语言列表，每个语言对象包含：",
                  "  - `code` - 语言代码（如 'en', 'zh-CN'）",
                  "  - `name` - 语言名称（可选）",
                  "  - `file` - 语言文件路径（可选）",
                  "  - `default` - 是否为默认语言（可选）",
                  "  - `rtl` - 是否为 RTL 语言（可选）",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "可选参数",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`translationsDir`** - 翻译文件目录（默认为 'locales'）",
                  "**`defaultLanguage`** - 默认语言代码（如果不指定，使用 languages 中标记为 default 的语言）",
                  "**`detection`** - 语言检测方式配置对象：",
                  "  - `fromPath` - 是否从 URL 路径检测（如 /en/page），默认 true",
                  "  - `fromQuery` - 是否从查询参数检测（如 ?lang=en），默认 true",
                  "  - `fromCookie` - 是否从 Cookie 检测，默认 true",
                  "  - `cookieName` - Cookie 名称（默认为 'lang'）",
                  "  - `fromHeader` - 是否从 Accept-Language 头检测，默认 true",
                  "**`routePrefix`** - 路由前缀（如 '/:lang/'），可选",
                  "**`injectLangAttribute`** - 是否在 HTML 中注入语言属性（默认为 true）",
                  "**`dateFormat`** - 日期格式化选项：",
                  "  - `format` - 日期格式（'short' | 'medium' | 'long' | 'full' | string）",
                  "  - `timeZone` - 时区",
                  "**`numberFormat`** - 数字格式化选项：",
                  "  - `style` - 样式（'decimal' | 'currency' | 'percent'）",
                  "  - `currency` - 货币代码",
                  "  - `minimumFractionDigits` - 最小小数位数",
                  "  - `maximumFractionDigits` - 最大小数位数",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "客户端 API",
        blocks: [
          {
            type: "text",
            content: "在客户端组件中，可以使用专门的客户端 API 来操作 i18n：",
          },
          {
            type: "subsection",
            level: 3,
            title: "导入客户端 API",
            blocks: [
              {
                type: "code",
                code: `import { 
  getCurrentLanguage, 
  setCurrentLanguage, 
  translate,
  getI18n,
  getTranslations,
  isI18nInitialized
} from "@dreamer/dweb/client";`,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "API 方法",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`getCurrentLanguage()`** - 获取当前语言代码",
                  "**`setCurrentLanguage(langCode: string)`** - 设置当前语言（会重新加载语言包并更新 Cookie）",
                  "**`translate(key: string, params?: Record<string, any>)`** - 翻译函数",
                  "**`getI18n()`** - 获取 i18n 数据对象（包含 lang、translations、t 函数）",
                  "**`getTranslations()`** - 获取当前语言的翻译数据对象",
                  "**`isI18nInitialized()`** - 检查 i18n 是否已初始化",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用示例",
            blocks: [
              {
                type: "code",
                code: `import { 
  getCurrentLanguage, 
  setCurrentLanguage, 
  translate 
} from "@dreamer/dweb/client";

// 获取当前语言
const currentLang = getCurrentLanguage(); // 'zh-CN' | 'en-US' | null

// 翻译文本
const text = translate('common.welcome', { name: 'John' });

// 切换语言
await setCurrentLanguage('en-US');`,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "语言切换组件示例",
            blocks: [
              {
                type: "code",
                code: `import { 
  getCurrentLanguage, 
  setCurrentLanguage, 
  translate 
} from "@dreamer/dweb/client";
import { useState, useEffect } from "preact/hooks";

export default function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState<string | null>(null);
  
  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
  }, []);
  
  const handleLanguageChange = async (lang: string) => {
    try {
      await setCurrentLanguage(lang);
      setCurrentLang(lang);
    } catch (error) {
      console.error('切换语言失败:', error);
    }
  };
  
  return (
    <div>
      <p>{translate('common.currentLanguage')}: {currentLang}</p>
      <button onClick={() => handleLanguageChange('zh-CN')}>
        切换到中文
      </button>
      <button onClick={() => handleLanguageChange('en-US')}>
        Switch to English
      </button>
    </div>
  );
}`,
                language: "typescript",
              },
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
