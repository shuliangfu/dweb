/**
 * 插件 - imageOptimizer 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "imageOptimizer 插件 - DWeb 框架文档",
  description: "imageOptimizer 插件使用指南",
};

export default function ImageOptimizerPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const imageOptimizerCode =
    `import { imageOptimizer } from '@dreamer/dweb/plugins';

plugins: [
  imageOptimizer({
    quality: 80,
    formats: ['webp', 'avif'],
  }),
],`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        imageOptimizer - 图片优化
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        imageOptimizer 插件自动优化图片，支持压缩和格式转换。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={imageOptimizerCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">quality</code>{" "}
            - 图片质量（0-100）
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">formats</code>{" "}
            - 支持的图片格式
          </li>
        </ul>
      </section>
    </article>
  );
}
