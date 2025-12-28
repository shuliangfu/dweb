/**
 * 中间件 - staticFiles 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "staticFiles 中间件 - DWeb 框架文档",
  description: "staticFiles 中间件使用指南",
};

export default function StaticFilesMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const staticFilesCode =
    `import { staticFiles } from '@dreamer/dweb/middleware';

server.use(staticFiles({
  dir: 'assets',
  prefix: '/assets',
  maxAge: 86400, // 缓存时间（秒）
}));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        staticFiles - 静态文件服务
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        staticFiles 中间件用于提供静态文件服务，支持缓存和 MIME 类型识别。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={staticFilesCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          必需参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              dir
            </code>{" "}
            - 静态文件根目录
          </li>
        </ul>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          可选参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              prefix
            </code>{" "}
            - URL 前缀（如果未配置，默认使用 dir 的名称）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              index
            </code>{" "}
            - 索引文件名（字符串或数组，默认 ['index.html']）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              dotfiles
            </code>{" "}
            - 点文件处理方式（'allow' | 'deny' | 'ignore'，默认 'ignore'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              etag
            </code>{" "}
            - 是否启用 ETag（默认 true）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              lastModified
            </code>{" "}
            - 是否发送 Last-Modified（默认 true）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              maxAge
            </code>{" "}
            - 缓存时间（秒，默认 0）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              outDir
            </code>{" "}
            - 构建输出目录（生产环境使用，如果未提供则自动检测）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              isProduction
            </code>{" "}
            - 是否为生产环境（如果未提供则自动检测）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              extendDirs
            </code>{" "}
            - 扩展的静态资源目录数组（如上传目录，这些目录不会被打包，始终从项目根目录读取），可以是字符串或对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li>字符串：目录路径</li>
              <li>对象：<code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{'{ dir: string, prefix?: string }'}</code> - 目录路径和 URL 前缀</li>
            </ul>
          </li>
        </ul>
      </section>
    </article>
  );
}
