/**
 * 核心模块 - 路由系统 (Router) 文档页面
 */

import CodeBlock from '../../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: '路由系统 (Router) - DWeb 框架文档',
  description: 'DWeb 框架的路由系统介绍',
};

export default function CoreRouterPage({ params: _params, query: _query, data: _data }: PageProps) {
  // 文件系统路由
  const routerCode = `// 路由文件结构
routes/
├── index.tsx          # / (首页)
├── users/
│   ├── index.tsx      # /users
│   └── [id].tsx       # /users/:id
└── api/
    └── users.ts       # /api/users`;

  // 动态路由示例
  const dynamicRouteCode = `// routes/users/[id].tsx
import type { PageProps } from '@dreamer/dweb';

export default function UserPage({ params }: PageProps) {
  const { id } = params as { id: string };
  return <div>User ID: {id}</div>;
}`;

  // 捕获所有路由
  const catchAllRouteCode = `// routes/docs/[...slug].tsx
import type { PageProps } from '@dreamer/dweb';

export default function DocsPage({ params }: PageProps) {
  const { slug } = params as { slug: string[] };
  return <div>Docs: {slug.join('/')}</div>;
}`;

  // 可选参数路由
  const optionalRouteCode = `// routes/posts/[[slug]].tsx
import type { PageProps } from '@dreamer/dweb';

export default function PostPage({ params }: PageProps) {
  const { slug } = params as { slug?: string[] };
  if (slug) {
    return <div>Post: {slug.join('/')}</div>;
  }
  return <div>All Posts</div>;
}`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">路由系统 (Router)</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            DWeb 使用文件系统路由，路由文件位于 <code className="bg-gray-100 px-2 py-1 rounded">routes</code> 目录。文件路径自动映射为 URL 路径，无需手动配置路由表。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">文件系统路由</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              路由文件位于 <code className="bg-gray-100 px-2 py-1 rounded">routes</code> 目录。文件路径自动映射为 URL 路径：
            </p>
            <CodeBlock code={routerCode} language="text" />
            <div className="mt-4">
              <h3 className="text-xl font-bold text-gray-900 mb-3">路由规则</h3>
              <ul className="list-disc list-inside space-y-2 my-4">
                <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">index.tsx</code> - 映射到目录的根路径</li>
                <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">[id].tsx</code> - 动态路由参数</li>
                <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">[...slug].tsx</code> - 捕获所有路由</li>
                <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">[[slug]].tsx</code> - 可选参数路由</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">动态路由</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              使用方括号 <code className="bg-gray-100 px-2 py-1 rounded">[id]</code> 创建动态路由参数：
            </p>
            <CodeBlock code={dynamicRouteCode} language="typescript" />
            <p className="text-gray-700 leading-relaxed mt-4">
              访问 <code className="bg-gray-100 px-2 py-1 rounded">/users/123</code> 时，<code className="bg-gray-100 px-2 py-1 rounded">params.id</code> 将是 <code className="bg-gray-100 px-2 py-1 rounded">'123'</code>。
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">捕获所有路由</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              使用 <code className="bg-gray-100 px-2 py-1 rounded">[...slug]</code> 捕获所有剩余路径段：
            </p>
            <CodeBlock code={catchAllRouteCode} language="typescript" />
            <p className="text-gray-700 leading-relaxed mt-4">
              访问 <code className="bg-gray-100 px-2 py-1 rounded">/docs/getting-started/installation</code> 时，<code className="bg-gray-100 px-2 py-1 rounded">params.slug</code> 将是 <code className="bg-gray-100 px-2 py-1 rounded">['getting-started', 'installation']</code>。
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">可选参数路由</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              使用双括号 <code className="bg-gray-100 px-2 py-1 rounded">[[slug]]</code> 创建可选参数路由：
            </p>
            <CodeBlock code={optionalRouteCode} language="typescript" />
            <p className="text-gray-700 leading-relaxed mt-4">
              <code className="bg-gray-100 px-2 py-1 rounded">/posts</code> 和 <code className="bg-gray-100 px-2 py-1 rounded">/posts/hello-world</code> 都会匹配此路由。
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">路由优先级</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              路由匹配按以下优先级：
            </p>
            <ol className="list-decimal list-inside space-y-2 my-4">
              <li className="text-gray-700">精确匹配（如 <code className="bg-gray-100 px-2 py-1 rounded">/users/index.tsx</code>）</li>
              <li className="text-gray-700">动态路由（如 <code className="bg-gray-100 px-2 py-1 rounded">/users/[id].tsx</code>）</li>
              <li className="text-gray-700">捕获所有路由（如 <code className="bg-gray-100 px-2 py-1 rounded">/users/[...slug].tsx</code>）</li>
              <li className="text-gray-700">可选参数路由（如 <code className="bg-gray-100 px-2 py-1 rounded">/users/[[slug]].tsx</code>）</li>
            </ol>
          </section>
        </article>
      </div>
    </div>
  );
}

