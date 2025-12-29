/**
 * 中间件 - rateLimit 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "rateLimit 中间件 - DWeb 框架文档",
  description: "rateLimit 中间件使用指南",
};

export default function RateLimitMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const rateLimitCode = `import { rateLimit } from '@dreamer/dweb';

server.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 时间窗口（毫秒）
  max: 100, // 最大请求数
}));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        rateLimit - 速率限制
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        rateLimit 中间件用于限制请求速率，防止滥用和 DDoS 攻击。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={rateLimitCode} language="typescript" />
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
              windowMs
            </code>{" "}
            - 时间窗口（毫秒，默认 60000，即 1 分钟）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              max
            </code>{" "}
            - 每个时间窗口内的最大请求数（默认 100）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              skipSuccessfulRequests
            </code>{" "}
            - 是否跳过成功请求（只限制错误请求，默认 false）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              skipFailedRequests
            </code>{" "}
            - 是否跳过失败请求（只限制成功请求，默认 false）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              keyGenerator
            </code>{" "}
            - 获取客户端标识的函数（默认使用 IP 地址）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              skip
            </code>{" "}
            - 跳过限流的函数
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              message
            </code>{" "}
            - 自定义错误消息
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              statusCode
            </code>{" "}
            - 自定义错误状态码（默认 429）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              store
            </code>{" "}
            - 存储实现（默认使用内存存储），需要实现 RateLimitStore 接口：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">get(key)</code> - 获取当前计数</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">increment(key)</code> - 增加计数</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">reset(key)</code> - 重置计数</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">setExpiry(key, ttl)</code> - 设置过期时间</li>
            </ul>
          </li>
        </ul>
      </section>
    </article>
  );
}
