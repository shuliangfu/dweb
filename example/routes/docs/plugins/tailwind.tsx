/**
 * 插件 - tailwind 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "tailwind 插件 - DWeb 框架文档",
  description: "tailwind 插件使用指南",
};

export default function TailwindPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const tailwindCode = `import { tailwind } from '@dreamer/dweb/plugins';

plugins: [
  tailwind({
    version: 'v4',
    cssPath: 'assets/style.css',
    optimize: true,
  }),
],`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        tailwind - Tailwind CSS 支持
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        tailwind 插件集成 Tailwind CSS，支持 V3 和 V4 版本。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={tailwindCode} language="typescript" />
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
              version
            </code>{" "}
            - Tailwind CSS 版本：'v3' | 'v4'（默认为 'v4'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              cssPath
            </code>{" "}
            - 主 CSS 文件路径（如 'assets/style.css'），用于开发环境实时编译。如果不指定，默认查找 'assets/style.css'
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              cssFiles
            </code>{" "}
            - CSS 文件路径（支持 glob 模式），用于构建时处理多个文件。默认为 'assets/**/*.css'
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              exclude
            </code>{" "}
            - 排除的文件（支持 glob 模式）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              content
            </code>{" "}
            - 内容扫描路径（用于 Tailwind CSS 扫描项目文件）。默认为 <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">["./routes/**/*.{`{`}tsx,ts,jsx,js{`}`}", "./components/**/*.{`{`}tsx,ts,jsx,js{`}`}"]</code>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              autoprefixer
            </code>{" "}
            - v3 特定选项：Autoprefixer 配置对象，包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">env</code> - Browserslist 环境</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">cascade</code> - 是否使用 Visual Cascade</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">add</code> - 是否添加前缀</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">remove</code> - 是否移除过时的前缀</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">flexbox</code> - 是否为 flexbox 属性添加前缀</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">grid</code> - 是否为 Grid Layout 属性添加前缀</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">overrideBrowserslist</code> - 目标浏览器查询列表</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              optimize
            </code>{" "}
            - v4 特定选项：是否优化（生产环境默认 true）
          </li>
        </ul>
      </section>
    </article>
  );
}
