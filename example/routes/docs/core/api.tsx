/**
 * 核心模块 - API 路由文档页面
 * 展示 DWeb 框架的 API 路由功能，包括 Method 模式和 REST 模式
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "API 路由 - DWeb 框架文档",
  description: "DWeb 框架的 API 路由介绍，包括 Method 模式和 REST 模式的使用方法",
};

export default function CoreApiPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // Method 模式示例 - 使用 ApiContext
  const methodModeCode = `// routes/api/users.ts
import type { ApiContext } from '@dreamer/dweb';

/**
 * Method 模式：通过 URL 路径指定方法名
 * 访问方式：POST /api/users/get-user
 * 注意：URL 必须使用中划线格式（kebab-case），函数名可以使用驼峰格式（camelCase）
 */
export function getUser({ res }: ApiContext) {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ];
  return res.json({
    success: true,
    data: users
  });
}

/**
 * 访问方式：POST /api/users/create-user
 */
export function createUser({ req, res }: ApiContext) {
  const body = req.body as { name?: string; email?: string };
  const newUser = {
    id: Date.now(),
    name: body?.name || 'Unknown',
    email: body?.email || ''
  };
  return res.json({
    success: true,
    data: newUser
  });
}

/**
 * 访问方式：POST /api/users/get-user-by-id
 * 使用路由参数：/api/users/[id]/get-user-by-id
 */
export function getUserById({ params, res }: ApiContext) {
  const id = params.id;
  const user = { id, name: 'User ' + id };
  return res.json({
    success: true,
    data: user
  });
}`;

  // REST 模式示例 - 使用 ApiContext
  const restModeCode = `// routes/api/users.ts
import type { ApiContext } from '@dreamer/dweb';

/**
 * REST 模式：基于 HTTP 方法和资源路径
 * 方式 1：直接使用 HTTP 方法名（推荐）
 */

// GET /api/users -> 获取用户列表
export function GET({ res }: ApiContext) {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ];
  return res.json({
    success: true,
    data: users
  });
}

// GET /api/users/:id -> 获取单个用户
export function GET_ID({ params, res }: ApiContext) {
  const id = params.id;
  const user = { id, name: 'User ' + id };
  return res.json({
    success: true,
    data: user
  });
}

// POST /api/users -> 创建用户
export function POST({ req, res }: ApiContext) {
  const body = req.body as { name?: string; email?: string };
  const newUser = {
    id: Date.now(),
    name: body?.name || 'Unknown',
    email: body?.email || ''
  };
  return res.json({
    success: true,
    data: newUser
  }, { status: 201 });
}

// PUT /api/users/:id -> 更新用户（完整更新）
export function PUT_ID({ params, req, res }: ApiContext) {
  const id = params.id;
  const body = req.body as { name?: string; email?: string };
  const updatedUser = {
    id,
    name: body?.name || 'Updated',
    email: body?.email || ''
  };
  return res.json({
    success: true,
    data: updatedUser
  });
}

// DELETE /api/users/:id -> 删除用户
export function DELETE_ID({ params, res }: ApiContext) {
  const id = params.id;
  // 执行删除操作...
  return res.json({
    success: true,
    message: '用户已删除'
  });
}`;

  // REST 模式 - 标准 RESTful 命名
  const restStandardCode = `// routes/api/users.ts
import type { ApiContext } from '@dreamer/dweb';

/**
 * REST 模式：方式 2 - 使用标准 RESTful 命名（备选）
 */

// GET /api/users -> index 或 list
export function index({ res }: ApiContext) {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ];
  return res.json({
    success: true,
    data: users
  });
}

// GET /api/users/:id -> show 或 get
export function show({ params, res }: ApiContext) {
  const id = params.id;
  const user = { id, name: 'User ' + id };
  return res.json({
    success: true,
    data: user
  });
}

// POST /api/users -> create
export function create({ req, res }: ApiContext) {
  const body = req.body as { name?: string; email?: string };
  const newUser = {
    id: Date.now(),
    name: body?.name || 'Unknown',
    email: body?.email || ''
  };
  return res.json({
    success: true,
    data: newUser
  }, { status: 201 });
}

// PUT /api/users/:id -> update
export function update({ params, req, res }: ApiContext) {
  const id = params.id;
  const body = req.body as { name?: string; email?: string };
  const updatedUser = {
    id,
    name: body?.name || 'Updated',
    email: body?.email || ''
  };
  return res.json({
    success: true,
    data: updatedUser
  });
}

// DELETE /api/users/:id -> destroy 或 delete
export function destroy({ params, res }: ApiContext) {
  const id = params.id;
  // 执行删除操作...
  return res.json({
    success: true,
    message: '用户已删除'
  });
}`;

  // ApiContext 完整示例
  const apiContextExampleCode = `// routes/api/users.ts
import type { ApiContext } from '@dreamer/dweb';

/**
 * ApiContext 包含以下属性：
 * - req: Request - 请求对象
 * - res: Response - 响应对象
 * - app: ApplicationLike - Application 实例（用于访问服务容器等）
 * - cookie: Record<string, string> - Cookie 对象
 * - session: Session | null - Session 对象（如果存在）
 * - params: Record<string, string> - 路由参数
 * - query: Record<string, string> - 查询参数
 * - routePath: string - 当前路由路径
 * - url: URL - URL 对象
 */
export function getUser({ 
  req,      // 请求对象
  res,      // 响应对象
  app,      // Application 实例
  cookie,   // Cookie 对象
  session,  // Session 对象
  params,   // 路由参数
  query,    // 查询参数
  routePath,// 当前路由路径
  url       // URL 对象
}: ApiContext) {
  // 从查询参数获取数据
  const userId = query.id;
  
  // 从 Cookie 获取数据
  const token = cookie.token;
  
  // 从 Session 获取数据
  const userIdFromSession = session?.data?.userId;
  
  // 使用 Application 实例获取服务
  const userService = app.getService('userService');
  
  // 返回响应
  return res.json({
    success: true,
    data: {
      userId,
      token,
      userIdFromSession,
      routePath,
      url: url.href
    }
  });
}`;

  // 解构参数示例（推荐用法）
  const destructuringCode = `// routes/api/users.ts
import type { ApiContext } from '@dreamer/dweb';

/**
 * 推荐用法：只解构实际使用的属性
 * 这样代码更简洁，也更容易理解
 */

// 只使用 res
export function getUsers({ res }: ApiContext) {
  return res.json({
    success: true,
    data: []
  });
}

// 使用 params 和 res
export function getUser({ params, res }: ApiContext) {
  const id = params.id;
  return res.json({
    success: true,
    data: { id }
  });
}

// 使用 req, res 和 app
export function createUser({ req, res, app }: ApiContext) {
  const body = req.body as { name?: string };
  const userService = app.getService('userService');
  // 创建用户...
  return res.json({
    success: true,
    data: { name: body?.name }
  });
}

// 使用 query 和 res
export function searchUsers({ query, res }: ApiContext) {
  const keyword = query.keyword;
  return res.json({
    success: true,
    data: { keyword }
  });
}`;

  // 配置示例
  const configCode = `// dweb.config.ts
export default {
  routes: {
    dir: 'routes',
    // API 路由模式：'method'（方法路由，默认）或 'restful'（RESTful API）
    apiMode: 'method' // 或 'restful'
  }
};`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">API 路由</h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架支持两种 API 路由模式：<strong>Method 模式</strong>（默认）和 <strong>REST 模式</strong>。
        两种模式是互斥的，通过 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">dweb.config.ts</code> 中的 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">routes.apiMode</code> 配置项选择。
      </p>

      {/* 配置说明 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置 API 路由模式
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">dweb.config.ts</code> 中配置 API 路由模式：
        </p>
        <CodeBlock code={configCode} language="typescript" />
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-600 p-4 my-4 rounded">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>注意：</strong>两种模式是互斥的，不能混用。选择一种模式后，所有 API 路由都应遵循该模式的规则。
          </p>
        </div>
      </section>

      {/* Method 模式 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          Method 模式（默认）
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          Method 模式通过 URL 路径指定方法名，<strong>URL 必须使用中划线格式（kebab-case）</strong>，函数名可以使用驼峰格式（camelCase）。
        </p>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 p-4 my-4 rounded">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm mb-2">
            <strong>⚠️ 重要：URL 格式要求</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-200 text-sm">
            <li>✅ <strong>允许</strong>：URL 必须使用中划线格式，例如 <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 py-0.5 rounded">/api/users/get-user</code></li>
            <li>❌ <strong>不允许</strong>：URL 不能使用驼峰格式，例如 <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 py-0.5 rounded">/api/users/getUser</code> 会返回 400 错误</li>
            <li>✅ <strong>允许</strong>：函数名可以使用驼峰格式，例如 <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 py-0.5 rounded">getUser</code>、<code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 py-0.5 rounded">createUser</code></li>
          </ul>
        </div>
        <CodeBlock code={methodModeCode} language="typescript" />
        <div className="mt-4">
          <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
            <strong>访问示例：</strong>
          </p>
          <CodeBlock code={`# ✅ 正确：使用中划线格式
curl -X POST http://localhost:3000/api/users/get-user

# ❌ 错误：使用驼峰格式会返回 400 错误
curl -X POST http://localhost:3000/api/users/getUser

# ✅ 正确：创建用户
curl -X POST http://localhost:3000/api/users/create-user \\
  -H "Content-Type: application/json" \\
  -d '{"name":"John","email":"john@example.com"}'`} language="bash" />
        </div>
      </section>

      {/* REST 模式 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          REST 模式
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          REST 模式基于 HTTP 方法和资源路径，支持两种命名方式：
        </p>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方式 1：直接使用 HTTP 方法名（推荐）
        </h3>
        <CodeBlock code={restModeCode} language="typescript" />
        <div className="mt-4">
          <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
            <strong>访问示例：</strong>
          </p>
          <CodeBlock code={`# GET 请求（获取列表）
curl http://localhost:3000/api/users

# GET 请求（获取单个）
curl http://localhost:3000/api/users/123

# POST 请求（创建）
curl -X POST http://localhost:3000/api/users \\
  -H "Content-Type: application/json" \\
  -d '{"name":"John","email":"john@example.com"}'

# PUT 请求（更新）
curl -X PUT http://localhost:3000/api/users/123 \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Jane","email":"jane@example.com"}'

# DELETE 请求（删除）
curl -X DELETE http://localhost:3000/api/users/123`} language="bash" />
        </div>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方式 2：使用标准 RESTful 命名（备选）
        </h3>
        <CodeBlock code={restStandardCode} language="typescript" />
      </section>

      {/* ApiContext 说明 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          ApiContext 上下文对象
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          所有 API 路由处理函数都接收一个 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">ApiContext</code> 对象作为参数，
          该对象包含处理请求所需的所有信息。
        </p>
        <CodeBlock code={apiContextExampleCode} language="typescript" />
      </section>

      {/* 推荐用法：解构参数 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          推荐用法：解构参数
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          推荐只解构实际使用的属性，这样代码更简洁，也更容易理解：
        </p>
        <CodeBlock code={destructuringCode} language="typescript" />
      </section>

      {/* ApiContext 属性说明 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          ApiContext 属性说明
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  属性
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  说明
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">req</code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Request</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  请求对象，包含请求方法、URL、请求体等信息
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">res</code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Response</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  响应对象，用于设置响应状态码、响应体等
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">app</code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">ApplicationLike</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  Application 实例，用于访问服务容器、配置等应用级别的功能
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">cookie</code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Record&lt;string, string&gt;</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  Cookie 对象，包含所有请求的 Cookie
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">session</code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Session | null</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  Session 对象（如果存在），用于存储会话数据
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">params</code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Record&lt;string, string&gt;</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  路由参数，例如 <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">/api/users/:id</code> 中的 <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">id</code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">query</code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Record&lt;string, string&gt;</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  查询参数，例如 <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">/api/users?id=123</code> 中的 <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">id</code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">routePath</code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">string</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  当前路由路径，例如 <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">/api/users</code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">url</code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">URL</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  URL 对象，包含完整的 URL 信息（协议、主机、路径、查询参数等）
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 模式对比 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          REST 模式 vs Method 模式对比
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  特性
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  REST 模式
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Method 模式
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  URL 格式
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">GET /api/users</code>
                  <br />
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">GET /api/users/123</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">POST /api/users/get-user</code>
                  <br />
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">POST /api/users/get-user-by-id</code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  HTTP 方法
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  使用标准 HTTP 方法（GET, POST, PUT, DELETE）
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  所有请求默认使用 POST
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  函数命名
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  标准 RESTful 命名（GET, GET_ID, POST, PUT_ID, DELETE_ID）或（index, show, create, update, destroy）
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  自定义函数名（getUser, createUser 等），URL 必须使用中划线格式
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  路径简洁性
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  路径简洁，符合 RESTful 规范
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  路径中包含方法名
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  适用场景
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  标准的 CRUD 操作
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  自定义业务方法（如 sendEmail, resetPassword）
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-600 p-4 my-4 rounded">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>选择建议：</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200 text-sm mt-2">
            <li>如果需要标准的 CRUD 操作，使用 <strong>REST 模式</strong></li>
            <li>如果需要自定义的业务方法（如 <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">sendEmail</code>、<code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">resetPassword</code>），使用 <strong>Method 模式</strong></li>
          </ul>
        </div>
      </section>
    </article>
  );
}
