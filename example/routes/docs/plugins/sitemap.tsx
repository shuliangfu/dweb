/**
 * 插件 - sitemap 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "sitemap 插件 - DWeb 框架文档",
  description: "sitemap 插件使用指南",
};

export default function SitemapPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const sitemapCode = `import { sitemap } from '@dreamer/dweb/plugins';

plugins: [
  sitemap({
    hostname: 'https://example.com',
    urls: [
      { url: '/', changefreq: 'daily', priority: 1.0 },
      { url: '/core', changefreq: 'monthly', priority: 0.8 },
    ],
  }),
],`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        sitemap - 网站地图
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        sitemap 插件自动生成网站地图（sitemap.xml），帮助搜索引擎索引网站。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={sitemapCode} language="typescript" />
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
              siteUrl
            </code>{" "}
            - 网站基础 URL（必需）
          </li>
        </ul>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          可选参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              routes
            </code>{" "}
            - 要包含的路由路径数组（支持 glob 模式）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              exclude
            </code>{" "}
            - 要排除的路由路径数组（支持 glob 模式）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defaultChangefreq
            </code>{" "}
            - 默认更新频率（'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defaultPriority
            </code>{" "}
            - 默认优先级（0.0 - 1.0）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              urls
            </code>{" "}
            - 自定义 URL 列表数组，每个 URL 对象包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">loc</code> - URL 路径（必需）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">lastmod</code> - 最后修改时间（字符串或 Date）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">changefreq</code> - 更新频率（'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">priority</code> - 优先级（0.0 - 1.0）</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              generateRobots
            </code>{" "}
            - 是否生成 robots.txt（默认 false）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              robotsContent
            </code>{" "}
            - robots.txt 内容（字符串）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              outputPath
            </code>{" "}
            - sitemap.xml 输出路径（相对于输出目录）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              robotsOutputPath
            </code>{" "}
            - robots.txt 输出路径（相对于输出目录）
          </li>
        </ul>
      </section>
    </article>
  );
}
