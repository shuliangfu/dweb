/**
 * 插件 - email 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "email 插件 - DWeb 框架文档",
  description: "email 插件使用指南",
};

export default function EmailPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const emailCode = `import { email } from '@dreamer/dweb/plugins';

plugins: [
  email({
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      user: 'user@example.com',
      password: 'password',
    },
  }),
],`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        email - 邮件插件
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        email 插件用于发送邮件，支持 SMTP 和模板渲染。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={emailCode} language="typescript" />
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
              smtp
            </code>{" "}
            - SMTP 配置对象，包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">host</code> - SMTP 服务器地址（必需）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">port</code> - SMTP 端口（必需）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">secure</code> - 是否使用 TLS（可选）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">user</code> - 用户名（必需）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">password</code> - 密码（必需）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">from</code> - 发件人邮箱（必需）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">fromName</code> - 发件人名称（可选）</li>
            </ul>
          </li>
        </ul>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          可选参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              templates
            </code>{" "}
            - 邮件模板列表，每个模板包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">name</code> - 模板名称</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">html</code> - 模板内容（HTML）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">text</code> - 文本版本（可选）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">variableFormat</code> - 变量占位符格式（默认 <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{"{{"}variable{"}}"}</code>）</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defaults
            </code>{" "}
            - 默认选项（Partial&lt;EmailOptions&gt;），包含 to, cc, bcc, subject, text, html, attachments, replyTo 等
          </li>
        </ul>
      </section>
    </article>
  );
}
