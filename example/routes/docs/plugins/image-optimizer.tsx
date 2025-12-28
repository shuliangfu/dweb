/**
 * 插件 - imageOptimizer 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
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
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          可选参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              imageDir
            </code>{" "}
            - 图片目录（相对于项目根目录），可以是字符串或数组
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              outputDir
            </code>{" "}
            - 输出目录（相对于构建输出目录）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              compression
            </code>{" "}
            - 压缩配置对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">enabled</code> - 是否启用压缩</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">quality</code> - 压缩质量（0-100，仅用于有损格式）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">optimizeSvg</code> - 是否优化 SVG</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">maxFileSize</code> - 最大文件大小（字节），超过此大小才压缩</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              webp
            </code>{" "}
            - WebP 配置对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">enabled</code> - 是否生成 WebP 格式</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">quality</code> - WebP 质量（0-100）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">keepOriginal</code> - 是否同时保留原格式</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              avif
            </code>{" "}
            - AVIF 配置对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">enabled</code> - 是否生成 AVIF 格式</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">quality</code> - AVIF 质量（0-100）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">keepOriginal</code> - 是否同时保留原格式</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              responsive
            </code>{" "}
            - 响应式图片配置对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">breakpoints</code> - 断点配置数组（宽度）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">defaultSize</code> - 默认尺寸对象（width, height, suffix）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">generateSrcset</code> - 是否生成 srcset</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">generateSizes</code> - 是否生成 sizes 属性</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              placeholder
            </code>{" "}
            - 占位符配置对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">enabled</code> - 是否生成占位符</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">type</code> - 占位符类型（'blur' | 'color' | 'lqip'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">size</code> - 占位符尺寸对象（width, height, suffix）</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              lazyLoad
            </code>{" "}
            - 懒加载配置对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">enabled</code> - 是否启用懒加载</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">attribute</code> - 懒加载属性名（默认 'loading'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">value</code> - 懒加载值（默认 'lazy'）</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              exclude
            </code>{" "}
            - 排除的文件数组（支持 glob 模式）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              include
            </code>{" "}
            - 包含的文件数组（支持 glob 模式）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              autoTransform
            </code>{" "}
            - 是否在 HTML 中自动转换图片标签（默认 true）
          </li>
        </ul>
      </section>
    </article>
  );
}
