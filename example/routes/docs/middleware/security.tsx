/**
 * 中间件 - security 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "security 中间件 - DWeb 框架文档",
  description: "security 中间件使用指南",
};

export default function SecurityMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const securityCode = `import { security } from '@dreamer/dweb';

server.use(security({
  contentSecurityPolicy: true,
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
}));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        security - 安全头
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        security 中间件用于设置 HTTP 安全响应头，提高应用安全性。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={securityCode} language="typescript" />
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
              xssProtection
            </code>{" "}
            - 是否启用 XSS 防护（默认 true）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              csrfProtection
            </code>{" "}
            - 是否启用 CSRF 防护（默认 true）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              csrfCookieName
            </code>{" "}
            - CSRF Token Cookie 名称（默认 '_csrf'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              csrfHeaderName
            </code>{" "}
            - CSRF Token 请求头名称（默认 'X-CSRF-Token'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              csrfFieldName
            </code>{" "}
            - CSRF Token 表单字段名称（默认 '_csrf'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              csrfMethods
            </code>{" "}
            - 需要 CSRF 验证的方法（默认 ['POST', 'PUT', 'DELETE', 'PATCH']）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              csrfSkip
            </code>{" "}
            - 跳过 CSRF 验证的路径数组（支持 glob 模式）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              contentSecurityPolicy
            </code>{" "}
            - 内容安全策略（CSP），可以是字符串或配置对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li>字符串：直接设置 CSP 头</li>
              <li>对象：包含 defaultSrc, scriptSrc, styleSrc, imgSrc, connectSrc, fontSrc, objectSrc, mediaSrc, frameSrc, baseUri, formAction, frameAncestors, upgradeInsecureRequests 等配置</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              hsts
            </code>{" "}
            - 是否启用严格传输安全（HSTS），可以是布尔值或配置对象（默认 false，生产环境建议 true）：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li>布尔值：启用或禁用</li>
              <li>对象：包含 maxAge（最大年龄，秒）、includeSubDomains（是否包含子域）、preload（是否预加载）</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              frameOptions
            </code>{" "}
            - X-Frame-Options（默认 'SAMEORIGIN'）：'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              contentTypeOptions
            </code>{" "}
            - X-Content-Type-Options（默认 'nosniff'）：'nosniff' | 'none'
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              xssProtectionHeader
            </code>{" "}
            - X-XSS-Protection（默认 '1; mode=block'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              referrerPolicy
            </code>{" "}
            - Referrer-Policy（默认 'no-referrer'）：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li>'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url'</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              permissionsPolicy
            </code>{" "}
            - Permissions-Policy（功能策略），对象格式，键为功能名，值为允许的来源数组
          </li>
        </ul>
      </section>
    </article>
  );
}
