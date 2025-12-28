/**
 * 插件 - fileUpload 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "fileUpload 插件 - DWeb 框架文档",
  description: "fileUpload 插件使用指南",
};

export default function FileUploadPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const fileUploadCode = `import { fileUpload } from '@dreamer/dweb/plugins';

plugins: [
  fileUpload({
    dest: './uploads',
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  }),
],`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        fileUpload - 文件上传
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        fileUpload 插件用于处理文件上传，支持多文件上传和文件验证。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={fileUploadCode} language="typescript" />
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
            - 文件上传配置对象，包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">uploadDir</code> - 上传目录（相对于项目根目录）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">maxFileSize</code> - 最大文件大小（字节）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">allowedTypes</code> - 允许的文件类型数组（MIME 类型或扩展名）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">allowMultiple</code> - 是否允许多文件上传</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">namingStrategy</code> - 文件命名策略（'original' | 'timestamp' | 'uuid' | 'hash'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">createSubdirs</code> - 是否创建子目录（按日期）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">perFileLimit</code> - 文件大小限制（每个文件）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">totalLimit</code> - 总大小限制（所有文件）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">imageCrop</code> - 图片裁切配置对象（enabled, width, height, mode）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">imageCompress</code> - 图片压缩配置对象（enabled, format, quality, keepOriginal）</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              injectClientScript
            </code>{" "}
            - 是否在客户端注入上传脚本（默认 true）
          </li>
        </ul>
      </section>
    </article>
  );
}
