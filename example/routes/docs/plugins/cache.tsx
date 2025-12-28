/**
 * 插件 - cache 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
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
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          可选参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              config
            </code>{" "}
            - 缓存配置对象，包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">store</code> - 存储类型（'memory' | 'redis' | 'file'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">redis</code> - Redis 配置（如果使用 Redis），包含 host, port, password, db</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">cacheDir</code> - 文件缓存目录（如果使用文件缓存）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">defaultTTL</code> - 默认过期时间（秒）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">maxSize</code> - 最大缓存大小（内存缓存，字节）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">maxEntries</code> - 最大缓存条目数（内存缓存）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">keyPrefix</code> - 缓存键前缀</li>
            </ul>
          </li>
        </ul>
      </section>
    </article>
  );
}
