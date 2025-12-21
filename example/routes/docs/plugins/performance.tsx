/**
 * 插件 - performance 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "performance 插件 - DWeb 框架文档",
  description: "performance 插件使用指南",
};

export default function PerformancePluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const performanceCode = `import { performance } from '@dreamer/dweb/plugins';

plugins: [
  performance({
    enabled: true,
    metrics: ['responseTime', 'memoryUsage'],
  }),
],`;

  return (
    <article className="prose prose-lg max-w-none">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        performance - 性能监控
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        performance 插件用于监控应用性能，收集性能指标。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          基本使用
        </h2>
        <CodeBlock code={performanceCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          配置选项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">enabled</code>{" "}
            - 是否启用性能监控
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">metrics</code>{" "}
            - 要收集的性能指标
          </li>
        </ul>
      </section>
    </article>
  );
}
