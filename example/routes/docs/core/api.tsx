/**
 * 核心模块 - API 路由文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "API 路由 - DWeb 框架文档",
  description: "DWeb 框架的 API 路由介绍",
};

export default function CoreApiPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const apiRouteCode = `// routes/api/users.ts
import type { ApiRoute } from '@dreamer/dweb';

export default async function handler({ req, res }: ApiRoute) {
  if (req.method === 'GET') {
    const users = await getUsers();
    res.json(users);
  } else if (req.method === 'POST') {
    const data = await req.json();
    const user = await createUser(data);
    res.json(user);
  }
}`;

  const apiRouteWithParamsCode = `// routes/api/users/[id].ts
import type { ApiRoute } from '@dreamer/dweb';

export default async function handler({ req, res, params }: ApiRoute) {
  const { id } = params as { id: string };
  
  if (req.method === 'GET') {
    const user = await getUserById(id);
    if (!user) {
      res.status(404);
      res.json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } else if (req.method === 'PUT') {
    const data = await req.json();
    const user = await updateUser(id, data);
    res.json(user);
  } else if (req.method === 'DELETE') {
    await deleteUser(id);
    res.status(204);
  }
}`;

  const methodHandlersCode = `// routes/api/users.ts
import type { ApiRoute } from '@dreamer/dweb';

// 使用命名导出处理不同的 HTTP 方法
export async function GET({ req, res }: ApiRoute) {
  const users = await getUsers();
  res.json(users);
}

export async function POST({ req, res }: ApiRoute) {
  const data = await req.json();
  const user = await createUser(data);
  res.json(user);
}

export async function PUT({ req, res }: ApiRoute) {
  const data = await req.json();
  const user = await updateUser(data);
  res.json(user);
}

export async function DELETE({ req, res }: ApiRoute) {
  await deleteUser(req.query.id);
  res.status(204);
}`;

  return (
    <article className="prose prose-lg max-w-none">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">API 路由</h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        DWeb 框架支持创建 API 路由，用于处理 HTTP 请求并返回 JSON
        或其他格式的响应。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          创建 API 路由
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          在 <code className="bg-gray-100 px-2 py-1 rounded">routes/api/</code>
          {" "}
          目录下创建 API 路由文件：
        </p>
        <CodeBlock code={apiRouteCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          动态路由参数
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          使用方括号创建动态路由参数：
        </p>
        <CodeBlock code={apiRouteWithParamsCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          方法处理器
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          也可以使用命名导出处理不同的 HTTP 方法：
        </p>
        <CodeBlock code={methodHandlersCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          请求和响应
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          API 路由处理器接收一个包含{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">req</code> 和{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">res</code> 的对象：
        </p>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">req.method</code>
            {" "}
            - HTTP 方法
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">req.url</code>{" "}
            - 请求 URL
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">req.query</code>
            {" "}
            - 查询参数
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">req.params</code>
            {" "}
            - 路由参数
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">req.json()</code>
            {" "}
            - 解析 JSON 请求体
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">
              res.json(data)
            </code>{" "}
            - 发送 JSON 响应
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">
              res.status(code)
            </code>{" "}
            - 设置状态码
          </li>
        </ul>
      </section>
    </article>
  );
}
