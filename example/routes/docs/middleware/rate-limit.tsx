/**
 * 中间件 - rateLimit 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "rateLimit 中间件 - DWeb 框架文档",
  description: "rateLimit 中间件使用指南",
};

export default function RateLimitMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const rateLimitCode = `import { rateLimit } from '@dreamer/dweb/middleware';

server.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 时间窗口（毫秒）
  max: 100, // 最大请求数
}));`;

  return (
    <article className="prose prose-lg max-w-none">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        rateLimit - 速率限制
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        rateLimit 中间件用于限制请求速率，防止滥用和 DDoS 攻击。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          基本使用
        </h2>
        <CodeBlock code={rateLimitCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          配置选项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">windowMs</code>{" "}
            - 时间窗口（毫秒）
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">max</code>{" "}
            - 在时间窗口内的最大请求数
          </li>
        </ul>
      </section>
    </article>
  );
}
