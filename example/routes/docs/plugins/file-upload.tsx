/**
 * 插件 - fileUpload 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
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
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              dest
            </code>{" "}
            - 文件保存目录
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              limits
            </code>{" "}
            - 文件大小限制
          </li>
        </ul>
      </section>
    </article>
  );
}
