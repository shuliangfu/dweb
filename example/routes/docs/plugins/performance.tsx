/**
 * 插件 - performance 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "performance 插件 - DWeb 框架文档",
  description: "performance 插件使用指南",
};

export default function PerformancePluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const performanceCode = `import { performance } from '@dreamer/dweb';

plugins: [
  performance({
    enabled: true,
    metrics: ['responseTime', 'memoryUsage'],
  }),
],`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        performance - 性能监控
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        performance 插件用于监控应用性能，收集性能指标。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={performanceCode} language="typescript" />
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
            - 性能监控配置对象，包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">collectWebVitals</code> - 是否收集 Web Vitals</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">collectResourceTiming</code> - 是否收集资源加载时间</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">collectApiTiming</code> - 是否收集 API 响应时间</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">endpoint</code> - 上报端点</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">reportInterval</code> - 上报间隔（毫秒）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">logToConsole</code> - 是否在控制台输出</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">sampleRate</code> - 采样率（0-1）</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              injectClientScript
            </code>{" "}
            - 是否在客户端注入监控脚本（默认 true）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              onMetrics
            </code>{" "}
            - 自定义指标收集函数，接收 PerformanceMetrics 对象，返回 void 或 Promise&lt;void&gt;
          </li>
        </ul>
      </section>
    </article>
  );
}
