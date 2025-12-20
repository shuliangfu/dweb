/**
 * 中间件 - ipFilter 文档页面
 */

import CodeBlock from '../../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'ipFilter 中间件 - DWeb 框架文档',
  description: 'ipFilter 中间件使用指南',
};

export default function IpFilterMiddlewarePage({ params: _params, query: _query, data: _data }: PageProps) {
  const ipFilterCode = `import { ipFilter } from '@dreamer/dweb/middleware';

// 白名单
server.use(ipFilter({
  whitelist: ['192.168.1.0/24', '10.0.0.0/8'],
}));

// 黑名单
server.use(ipFilter({
  blacklist: ['192.168.1.100'],
}));`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">ipFilter - IP 过滤</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            ipFilter 中间件根据 IP 地址过滤请求，支持白名单和黑名单。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">基本使用</h2>
            <CodeBlock code={ipFilterCode} language="typescript" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置选项</h2>
            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">whitelist</code> - IP 白名单（CIDR 格式）</li>
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">blacklist</code> - IP 黑名单</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}

