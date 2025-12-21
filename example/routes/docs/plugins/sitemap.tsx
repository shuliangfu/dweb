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
    <article className="prose prose-lg max-w-none">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        sitemap - 网站地图
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        sitemap 插件自动生成网站地图（sitemap.xml），帮助搜索引擎索引网站。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          基本使用
        </h2>
        <CodeBlock code={sitemapCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          配置选项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">hostname</code>{" "}
            - 网站域名
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">urls</code>{" "}
            - URL 列表，包含路径、更新频率和优先级
          </li>
        </ul>
      </section>
    </article>
  );
}
