/**
 * 插件 - formValidator 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "formValidator 插件 - DWeb 框架文档",
  description: "formValidator 插件使用指南",
};

export default function FormValidatorPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const formValidatorCode =
    `import { formValidator } from '@dreamer/dweb/plugins';

plugins: [
  formValidator({
    rules: {
      email: { type: 'email', required: true },
      password: { type: 'string', min: 8 },
    },
  }),
],`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        formValidator - 表单验证
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        formValidator 插件用于验证表单数据，支持多种验证规则。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={formValidatorCode} language="typescript" />
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
              injectClientScript
            </code>{" "}
            - 是否在客户端注入验证脚本（默认 true）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defaultConfig
            </code>{" "}
            - 默认验证配置对象，包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">fields</code> - 字段验证配置数组，每个字段包含 name, rules, label</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">messages</code> - 全局错误消息模板对象</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              验证规则类型：'required' | 'email' | 'url' | 'number' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom'
            </p>
          </li>
        </ul>
      </section>
    </article>
  );
}
