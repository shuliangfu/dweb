/**
 * 插件 - i18n 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "i18n 插件 - DWeb 框架文档",
  description: "i18n 插件使用指南",
};

export default function I18nPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const i18nCode = `import { i18n } from '@dreamer/dweb/plugins';

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

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        i18n - 国际化
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        i18n 插件提供国际化支持，支持多语言切换。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={i18nCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          必需参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              languages
            </code>{" "}
            - 支持的语言列表，每个语言对象包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">code</code> - 语言代码（如 'en', 'zh-CN'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">name</code> - 语言名称（可选）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">file</code> - 语言文件路径（可选）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">default</code> - 是否为默认语言（可选）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">rtl</code> - 是否为 RTL 语言（可选）</li>
            </ul>
          </li>
        </ul>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          可选参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              translationsDir
            </code>{" "}
            - 翻译文件目录（默认为 'locales'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defaultLanguage
            </code>{" "}
            - 默认语言代码（如果不指定，使用 languages 中标记为 default 的语言）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              detection
            </code>{" "}
            - 语言检测方式配置对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">fromPath</code> - 是否从 URL 路径检测（如 /en/page），默认 true</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">fromQuery</code> - 是否从查询参数检测（如 ?lang=en），默认 true</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">fromCookie</code> - 是否从 Cookie 检测，默认 true</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">cookieName</code> - Cookie 名称（默认为 'lang'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">fromHeader</code> - 是否从 Accept-Language 头检测，默认 true</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              routePrefix
            </code>{" "}
            - 路由前缀（如 '/:lang/'），可选
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              injectLangAttribute
            </code>{" "}
            - 是否在 HTML 中注入语言属性（默认为 true）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              dateFormat
            </code>{" "}
            - 日期格式化选项：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">format</code> - 日期格式（'short' | 'medium' | 'long' | 'full' | string）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">timeZone</code> - 时区</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              numberFormat
            </code>{" "}
            - 数字格式化选项：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">style</code> - 样式（'decimal' | 'currency' | 'percent'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">currency</code> - 货币代码</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">minimumFractionDigits</code> - 最小小数位数</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">maximumFractionDigits</code> - 最大小数位数</li>
            </ul>
          </li>
        </ul>
      </section>
    </article>
  );
}
