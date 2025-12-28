/**
 * 核心模块 - 路由系统 (Router) 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "路由系统 (Router) - DWeb 框架文档",
  description: "DWeb 框架的路由系统介绍",
};

export default function CoreRouterPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
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

  // load 函数示例
  const loadFunctionCode = `// routes/users/[id].tsx
import type { LoadContext, PageProps } from '@dreamer/dweb';

/**
 * load 函数在服务端执行，可以异步获取数据
 * 返回的数据会自动传递给页面组件的 data 属性
 */
export async function load({ params, query, cookies, session, getCookie, getSession, db }: LoadContext) {
  // 从路由参数获取 ID
  const id = params.id;
  
  // 从查询参数获取数据
  const page = query.page || '1';
  
  // 从 Cookie 获取数据
  const token = getCookie('token') || cookies.token;
  
  // 从 Session 获取数据
  const currentSession = session || (await getSession());
  const userId = currentSession?.data?.userId;
  
  // 从数据库获取数据（如果配置了数据库）
  // const user = await db?.query('SELECT * FROM users WHERE id = ?', [id]);
  
  // 返回数据，这些数据会自动传递给页面组件的 data 属性
  return {
    id,
    page,
    token: token || null,
    userId: userId || null,
    // user: user || null
  };
}

/**
 * 页面组件接收 load 函数返回的数据
 * data 属性包含 load 函数返回的所有数据
 */
export default function UserPage({ params, query, data }: PageProps) {
  const pageData = data as {
    id: string;
    page: string;
    token: string | null;
    userId: string | null;
  };
  
  return (
    <div>
      <h1>用户详情</h1>
      <p>用户 ID: {pageData.id}</p>
      <p>页码: {pageData.page}</p>
      {pageData.token && <p>Token: {pageData.token.substring(0, 20)}...</p>}
      {pageData.userId && <p>用户 ID (Session): {pageData.userId}</p>}
    </div>
  );
}`;

  // 错误示例：异步组件
  const asyncComponentErrorCode = `// ❌ 错误：页面组件不能是异步函数
export default async function UserPage({ params }: PageProps) {
  const user = await fetchUser(params.id); // 这会导致错误
  return <div>User: {user.name}</div>;
}`;

  // 正确示例：使用 useEffect
  const useEffectCode = `// ✅ 正确：使用 useEffect 处理异步操作
import { useEffect, useState } from 'preact/hooks';
import type { PageProps } from '@dreamer/dweb';

export default function UserPage({ params }: PageProps) {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(\`/api/users/\${params.id}\`);
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error('获取用户失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [params.id]);

  if (loading) {
    return <div>加载中...</div>;
  }

  if (!user) {
    return <div>用户不存在</div>;
  }

  return <div>User: {user.name}</div>;
}`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        路由系统 (Router)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 使用文件系统路由，路由文件位于{" "}
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">routes</code>{" "}
        目录。文件路径自动映射为 URL 路径，无需手动配置路由表。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          文件系统路由
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          路由文件位于{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">routes</code>{" "}
          目录。文件路径自动映射为 URL 路径：
        </p>
        <CodeBlock code={routerCode} language="text" />
        <div className="mt-4">
          <h3 className="text-xl font-bold text-gray-900 mb-3">路由规则</h3>
          <ul className="list-disc list-inside space-y-2 my-4">
            <li className="text-gray-700">
              <code className="bg-gray-100 px-2 py-1 rounded">index.tsx</code>
              {" "}
              - 映射到目录的根路径
            </li>
            <li className="text-gray-700">
              <code className="bg-gray-100 px-2 py-1 rounded">[id].tsx</code>
              {" "}
              - 动态路由参数
            </li>
            <li className="text-gray-700">
              <code className="bg-gray-100 px-2 py-1 rounded">
                [...slug].tsx
              </code>{" "}
              - 捕获所有路由
            </li>
            <li className="text-gray-700">
              <code className="bg-gray-100 px-2 py-1 rounded">
                [[slug]].tsx
              </code>{" "}
              - 可选参数路由
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          动态路由
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          使用方括号 <code className="bg-gray-100 px-2 py-1 rounded">[id]</code>
          {" "}
          创建动态路由参数：
        </p>
        <CodeBlock code={dynamicRouteCode} language="typescript" />
        <p className="text-gray-700 leading-relaxed mt-4">
          访问 <code className="bg-gray-100 px-2 py-1 rounded">/users/123</code>
          {" "}
          时，
          <code className="bg-gray-100 px-2 py-1 rounded">params.id</code> 将是
          {" "}
          <code className="bg-gray-100 px-2 py-1 rounded">'123'</code>。
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          捕获所有路由
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          使用 <code className="bg-gray-100 px-2 py-1 rounded">[...slug]</code>
          {" "}
          捕获所有剩余路径段：
        </p>
        <CodeBlock code={catchAllRouteCode} language="typescript" />
        <p className="text-gray-700 leading-relaxed mt-4">
          访问{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">
            /docs/getting-started/installation
          </code>{" "}
          时，<code className="bg-gray-100 px-2 py-1 rounded">params.slug</code>
          {" "}
          将是{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">
            ['getting-started', 'installation']
          </code>
          。
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          可选参数路由
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          使用双括号{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">[[slug]]</code>{" "}
          创建可选参数路由：
        </p>
        <CodeBlock code={optionalRouteCode} language="typescript" />
        <p className="text-gray-700 leading-relaxed mt-4">
          <code className="bg-gray-100 px-2 py-1 rounded">/posts</code> 和{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">
            /posts/hello-world
          </code>{" "}
          都会匹配此路由。
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          使用 load 函数获取数据
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">load</code> 函数在服务端执行，用于在页面渲染前获取数据。
          返回的数据会自动传递给页面组件的 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">data</code> 属性。
        </p>
        <CodeBlock code={loadFunctionCode} language="typescript" />
        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-600 p-4 my-4 rounded">
          <p className="text-green-800 dark:text-green-200 text-sm">
            <strong>优势：</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-green-800 dark:text-green-200 text-sm mt-2">
            <li>在服务端执行，减少客户端请求</li>
            <li>支持 SSR，提高 SEO 和首屏性能</li>
            <li>可以访问数据库、文件系统等服务器资源</li>
            <li>数据在服务端获取，更安全</li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          ⚠️ 重要限制：页面组件不能是异步函数
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <strong>页面组件不能定义为 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">async function</code></strong>。
          如果需要进行异步操作（如数据获取），请使用以下方式：
        </p>
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 p-4 my-4 rounded">
          <p className="text-red-800 dark:text-red-200 text-sm font-semibold mb-2">❌ 错误示例：</p>
          <CodeBlock code={asyncComponentErrorCode} language="typescript" />
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-600 p-4 my-4 rounded">
          <p className="text-green-800 dark:text-green-200 text-sm font-semibold mb-2">✅ 正确示例：使用 useEffect</p>
          <CodeBlock code={useEffectCode} language="typescript" />
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-600 p-4 my-4 rounded">
          <p className="text-blue-800 dark:text-blue-200 text-sm font-semibold mb-2">✅ 推荐：使用 load 函数（见上方示例）</p>
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            使用 <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">load</code> 函数在服务端获取数据是最佳实践，
            可以充分利用 SSR 的优势，提高性能和 SEO。
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          路由优先级
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          路由匹配按以下优先级（从高到低）：
        </p>
        <ol className="list-decimal list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            精确匹配（如{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              /users/index.tsx
            </code>）
          </li>
          <li>
            动态路由（如{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              /users/[id].tsx
            </code>）
          </li>
          <li>
            捕获所有路由（如{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              /users/[...slug].tsx
            </code>）
          </li>
          <li>
            可选参数路由（如{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              /users/[[slug]].tsx
            </code>）
          </li>
        </ol>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 p-4 my-4 rounded">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            <strong>注意：</strong>当多个路由都能匹配同一个路径时，框架会选择优先级最高的路由。
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          路由约定文件
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          DWeb 框架支持以下约定文件，它们有特殊的作用：
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  文件名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  说明
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  示例
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">_app.tsx</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  根应用组件，提供 HTML 文档结构（DOCTYPE、head、body 等）
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">routes/_app.tsx</code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">_layout.tsx</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  布局组件，提供页面布局结构
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">routes/_layout.tsx</code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">_middleware.ts</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  中间件文件，在请求处理前执行
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">routes/_middleware.ts</code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">_404.tsx</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  404 错误页面，当路由不匹配时显示
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">routes/_404.tsx</code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">_error.tsx</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  错误页面，当发生错误时显示
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">routes/_error.tsx</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-700 dark:text-gray-300 text-sm mt-4">
          更多关于约定文件的说明，请参考 <a href="/docs/routing-conventions" className="text-blue-600 dark:text-blue-400 hover:underline">路由约定文档</a>。
        </p>
      </section>
    </article>
  );
}
