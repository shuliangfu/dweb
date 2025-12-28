/**
 * 插件 - rss 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "rss 插件 - DWeb 框架文档",
  description: "rss 插件使用指南",
};

export default function RssPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const rssCode = `import { rss } from '@dreamer/dweb/plugins';

plugins: [
  rss({
    title: 'My Blog',
    description: 'My awesome blog',
    feedUrl: '/feed.xml',
  }),
],`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        rss - RSS 插件
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        rss 插件用于生成 RSS Feed，支持内容订阅。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={rssCode} language="typescript" />
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
              feed
            </code>{" "}
            - RSS Feed 配置对象，包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">title</code> - Feed 标题（必需）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">description</code> - Feed 描述（必需）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">siteUrl</code> - 网站 URL（必需）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">feedUrl</code> - Feed URL（可选）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">language</code> - 语言代码</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">copyright</code> - 版权信息</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">managingEditor</code> - 管理邮箱</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">webMaster</code> - Web Master 邮箱</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">lastBuildDate</code> - 最后构建日期</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">ttl</code> - 更新频率（分钟）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">image</code> - 图片 URL（Feed 图标）对象，包含 url, title, link, width, height</li>
            </ul>
          </li>
        </ul>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          可选参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              items
            </code>{" "}
            - RSS 条目列表数组，每个条目包含 title, link, description, pubDate, author, category, tags, content, image, guid, comments, commentsUrl
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              autoScan
            </code>{" "}
            - 是否自动扫描路由生成条目（默认 false）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              routesDir
            </code>{" "}
            - 路由目录（用于自动扫描）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              outputPath
            </code>{" "}
            - 输出路径（相对于构建输出目录）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              filename
            </code>{" "}
            - 输出文件名
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              generateByCategory
            </code>{" "}
            - 是否生成多个 Feed（按分类，默认 false）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              categories
            </code>{" "}
            - 分类配置数组，每个分类包含 name 和 filter 函数
          </li>
        </ul>
      </section>
    </article>
  );
}
