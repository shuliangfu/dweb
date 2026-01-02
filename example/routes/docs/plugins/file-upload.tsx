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
  const fileUploadCode = `import { fileUpload, handleFileUpload } from '@dreamer/dweb/plugins';

// 注册插件
usePlugin(fileUpload({
  config: {
    uploadDir: './uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowMultiple: true,
    namingStrategy: 'uuid',
    createSubdirs: true,
  },
  injectClientScript: true,
}));

// 处理文件上传
server.setHandler(async (req, res) => {
  if (req.method === 'POST' && req.path === '/upload') {
    const result = await handleFileUpload(req, {
      uploadDir: './uploads',
      maxFileSize: 5 * 1024 * 1024,
    });
    res.json(result);
  }
});`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        fileUpload - 文件上传
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        fileUpload 插件用于处理文件上传，支持多文件上传和文件验证。该插件专注于文件上传功能，不包含图片处理功能。如需图片优化（压缩、裁切、格式转换等），请使用独立的 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">image-optimizer</code> 插件。
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
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">subdirStrategy</code> - 子目录创建策略（模板格式或预设值），默认为 <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'YYYY/mm/dd'</code>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-xs">
                  <li className="font-semibold mt-2">模板格式（推荐）：</li>
                  <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'YYYY/mm/dd'</code> - 2026/01/02（默认，适合上传较多的项目）</li>
                  <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'YYYY/mm'</code> - 2026/01（适合上传较少的项目）</li>
                  <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'YYYY'</code> - 2026（适合上传很少的项目）</li>
                  <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'YY/m/d'</code> - 26/1/2（使用2位年份和1-2位月日）</li>
                  <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'YYYY-MM-DD'</code> - 2026-01-02（使用横线分隔符）</li>
                  <li className="font-semibold mt-2">预设值（向后兼容）：</li>
                  <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'year-month-day'</code> - 等同于 'YYYY/mm/dd'</li>
                  <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'year-month'</code> - 等同于 'YYYY/mm'</li>
                  <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'year'</code> - 等同于 'YYYY'</li>
                </ul>
              </li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">perFileLimit</code> - 文件大小限制（每个文件）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">totalLimit</code> - 总大小限制（所有文件）</li>
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
