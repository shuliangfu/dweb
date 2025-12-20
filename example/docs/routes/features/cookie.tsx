/**
 * Cookie 文档页面
 */

import CodeBlock from '../../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'Cookie - DWeb 框架文档',
  description: 'Cookie 管理和签名',
};

export default function CookiePage({ params: _params, query: _query, data: _data }: PageProps) {
  const cookieConfigCode = `// dweb.config.ts
cookie: {
  // Cookie 密钥（必需）
  secret: 'your-secret-key',
  
  // 默认选项
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: 3600,
},`;

  const cookieUsageCode = `// 在路由中使用 Cookie
import type { LoadContext } from '@dreamer/dweb';

export async function load({ getCookie, setCookie }: LoadContext) {
  // 读取 Cookie
  const token = getCookie('token');
  
  // 设置 Cookie
  setCookie('token', 'value', {
    maxAge: 3600,
    httpOnly: true,
    secure: true,
  });
  
  return { token };
}`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Cookie</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            DWeb 框架提供了 Cookie 管理功能，支持 Cookie 的读取、设置、签名和验证。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置 Cookie</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              在 <code className="bg-gray-100 px-2 py-1 rounded">dweb.config.ts</code> 中配置 Cookie：
            </p>
            <CodeBlock code={cookieConfigCode} language="typescript" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">使用 Cookie</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              在页面或 API 路由中使用 Cookie：
            </p>
            <CodeBlock code={cookieUsageCode} language="typescript" />
          </section>
        </article>
      </div>
    </div>
  );
}
