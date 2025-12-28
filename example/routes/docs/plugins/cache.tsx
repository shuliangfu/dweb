/**
 * 插件 - cache 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "cache 插件 - DWeb 框架文档",
  description: "cache 插件使用指南",
};

export default function CachePluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const cacheCode = `import { cache } from '@dreamer/dweb/plugins';

plugins: [
  cache({
    type: 'memory', // 'memory' | 'redis'
    ttl: 3600, // 缓存时间（秒）
  }),
],`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        cache - 缓存插件
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        cache 插件提供缓存功能，支持内存缓存和 Redis 缓存。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={cacheCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              type
            </code>{" "}
            - 缓存类型：'memory' | 'redis'
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              ttl
            </code>{" "}
            - 缓存时间（秒）
          </li>
        </ul>
      </section>
    </article>
  );
}
