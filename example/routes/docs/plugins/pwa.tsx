/**
 * 插件 - pwa 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "pwa 插件 - DWeb 框架文档",
  description: "pwa 插件使用指南",
};

export default function PwaPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const pwaCode = `import { pwa } from '@dreamer/dweb/plugins';

plugins: [
  pwa({
    manifest: {
      name: 'My App',
      shortName: 'App',
    },
  }),
],`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        pwa - 渐进式 Web 应用
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        pwa 插件将应用转换为渐进式 Web 应用（PWA），支持离线访问。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={pwaCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">manifest</code>{" "}
            - Web App Manifest 配置
          </li>
        </ul>
      </section>
    </article>
  );
}
