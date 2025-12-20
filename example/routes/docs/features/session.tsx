/**
 * Session 文档页面
 */

import CodeBlock from '../../../components/CodeBlock.tsx';
import Sidebar from '../../../components/Sidebar.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'Session - DWeb 框架文档',
  description: 'Session 管理和多种存储方式',
};

export default function SessionPage({ params: _params, query: _query, data: _data }: PageProps) {
  const sessionConfigCode = `// dweb.config.ts
session: {
  // 存储方式
  store: 'memory', // 'memory' | 'file' | 'kv' | 'mongodb' | 'redis'
  
  // Session 密钥（必需）
  secret: 'your-session-secret',
  
  // 最大存活时间（毫秒）
  maxAge: 3600000, // 1小时
  
  // 文件存储配置
  file: {
    dir: './sessions',
  },
  
  // MongoDB 存储配置
  mongodb: {
    collection: 'sessions',
    password: 'password',
    db: 'mydb',
  },
  
  // Redis 存储配置
  redis: {
    password: 'password',
    db: 0,
  },
},`;

  const sessionUsageCode = `// 在路由中使用 Session
import type { PageProps, LoadContext } from '@dreamer/dweb';

export async function load({ getSession }: LoadContext) {
  const session = await getSession();
  session.data.userId = '123';
  await session.save();
  return { userId: session.data.userId };
}

export default function Page({ data }: PageProps) {
  return <div>User ID: {data.userId}</div>;
}`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏导航 */}
      <Sidebar currentPath="/docs/features/session" />

      {/* 文档内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <article className="prose prose-lg max-w-none">
              <h1 className="text-4xl font-bold text-gray-900 mb-8">Session</h1>
              <p className="text-gray-700 leading-relaxed mb-8">
                DWeb 框架提供了强大的 Session 管理功能，支持多种存储方式：内存、文件、KV、MongoDB、Redis。
              </p>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置 Session</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  在 <code className="bg-gray-100 px-2 py-1 rounded">dweb.config.ts</code> 中配置 Session：
                </p>
                <CodeBlock code={sessionConfigCode} language="typescript" />
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">使用 Session</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  在页面或 API 路由中使用 Session：
                </p>
                <CodeBlock code={sessionUsageCode} language="typescript" />
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">存储方式</h2>
                <ul className="list-disc list-inside space-y-2 my-4">
                  <li className="text-gray-700"><strong>memory</strong> - 内存存储（开发环境，重启后丢失）</li>
                  <li className="text-gray-700"><strong>file</strong> - 文件存储（适合单机部署）</li>
                  <li className="text-gray-700"><strong>kv</strong> - Deno KV 存储（Deno Deploy 环境）</li>
                  <li className="text-gray-700"><strong>mongodb</strong> - MongoDB 存储（适合分布式部署）</li>
                  <li className="text-gray-700"><strong>redis</strong> - Redis 存储（高性能，适合生产环境）</li>
                </ul>
              </section>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

