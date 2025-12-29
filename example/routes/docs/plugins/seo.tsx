/**
 * 插件 - seo 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "seo 插件 - DWeb 框架文档",
  description: "seo 插件使用指南",
};

export default function SeoPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const seoCode = `import { seo } from '@dreamer/dweb';

plugins: [
  seo({
    title: 'My App',
    description: 'My awesome app',
    keywords: ['web', 'framework'],
    openGraph: {
      type: 'website',
      image: 'https://example.com/og-image.jpg',
    },
    twitter: {
      card: 'summary_large_image',
    },
  }),
],`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        seo - SEO 优化
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        seo 插件自动生成 SEO 元数据，包括 Open Graph 和 Twitter Card。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={seoCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          可选参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defaultTitle
            </code>{" "}
            或 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">title</code> - 默认标题（title 是 defaultTitle 的简写）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              titleTemplate
            </code>{" "}
            - 标题模板（例如：`%s | My Site`）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defaultDescription
            </code>{" "}
            或 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">description</code> - 默认描述（description 是 defaultDescription 的简写）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defaultKeywords
            </code>{" "}
            或 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">keywords</code> - 默认关键词（支持字符串或数组，keywords 是 defaultKeywords 的简写）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defaultAuthor
            </code>{" "}
            或 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">author</code> - 默认作者（author 是 defaultAuthor 的简写）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defaultLang
            </code>{" "}
            - 默认语言
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              siteUrl
            </code>{" "}
            - 网站 URL
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defaultImage
            </code>{" "}
            - 默认图片
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              openGraph
            </code>{" "}
            - Open Graph 配置对象或 false（禁用），包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">siteName</code> - 网站名称</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">type</code> - 网站类型（'website' | 'article' | 'book' | 'profile' | 'music' | 'video'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">image</code> - 图片 URL</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">imageWidth</code> - 图片宽度</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">imageHeight</code> - 图片高度</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">audio</code> - 音频 URL</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">video</code> - 视频 URL</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">locale</code> - 地区</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">localeAlternate</code> - 备用地区</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              twitter
            </code>{" "}
            - Twitter Cards 配置对象或 false（禁用），包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">card</code> - 卡片类型（'summary' | 'summary_large_image' | 'app' | 'player'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">site</code> - 站点 Twitter 用户名</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">creator</code> - 创建者 Twitter 用户名</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">image</code> - 图片 URL</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">imageAlt</code> - 图片描述</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">appNameIphone</code> - 应用名称（iOS）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">appIdIphone</code> - 应用 ID（iOS）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">appUrlIphone</code> - 应用 URL（iOS）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">appNameIpad</code> - 应用名称（iPad）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">appIdIpad</code> - 应用 ID（iPad）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">appUrlIpad</code> - 应用 URL（iPad）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">appNameGoogleplay</code> - 应用名称（Android）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">appIdGoogleplay</code> - 应用包名（Android）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">appUrlGoogleplay</code> - 应用 URL（Android）</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              jsonLd
            </code>{" "}
            - JSON-LD 结构化数据配置对象或 false（禁用），包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">enabled</code> - 是否启用 JSON-LD</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">type</code> - 网站类型（'WebSite' | 'Organization' | 'Person' | 'Article' | 'BlogPosting' | 'Product'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">name</code> - 网站名称</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">description</code> - 网站描述</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">url</code> - 网站 URL</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">logo</code> - Logo URL</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">contactPoint</code> - 联系信息（telephone, contactType, email）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">sameAs</code> - 社交媒体链接数组</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              canonical
            </code>{" "}
            - 是否自动生成 canonical URL（默认 true）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              robots
            </code>{" "}
            - 是否自动生成 robots meta 标签，可以是布尔值或配置对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">index</code> - 是否允许索引</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">follow</code> - 是否允许跟踪链接</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">noarchive</code> - 是否禁止存档</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">nosnippet</code> - 是否禁止显示摘要</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">noimageindex</code> - 是否禁止索引图片</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              customMeta
            </code>{" "}
            - 自定义 meta 标签数组，每个对象包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">name</code> - meta 名称</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">property</code> - meta 属性</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">content</code> - meta 内容</li>
            </ul>
          </li>
        </ul>
      </section>
    </article>
  );
}
