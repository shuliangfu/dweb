/**
 * 核心模块 - API 路由文档页面
 * 展示 DWeb 框架的 API 路由功能，包括 Method 模式和 REST 模式
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "API 路由 - DWeb 框架文档",
  description:
    "DWeb 框架的 API 路由介绍，包括 Method 模式和 REST 模式的使用方法",
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

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "API 路由",
    description: "DWeb 框架支持两种 API 路由模式：**Method 模式**（默认）和 **REST 模式**。两种模式是互斥的，通过 `dweb.config.ts` 中的 `routes.apiMode` 配置项选择。",
    sections: [
      {
        title: "配置 API 路由模式",
        blocks: [
          {
            type: "text",
            content: "在 `dweb.config.ts` 中配置 API 路由模式：",
          },
          {
            type: "code",
            code: configCode,
            language: "typescript",
          },
          {
            type: "alert",
            level: "info",
            content: [
              "**注意：**两种模式是互斥的，不能混用。选择一种模式后，所有 API 路由都应遵循该模式的规则。",
            ],
          },
        ],
      },

      {
        title: "Method 模式（默认）",
        blocks: [
          {
            type: "text",
            content: "Method 模式通过 URL 路径指定方法名，**URL 必须使用中划线格式（kebab-case）**，函数名可以使用驼峰格式（camelCase）。",
          },
          {
            type: "alert",
            level: "warning",
            content: [
              "**⚠️ 重要：URL 格式要求**",
              "✅ **允许**：URL 必须使用中划线格式，例如 `/api/users/get-user`",
              "❌ **不允许**：URL 不能使用驼峰格式，例如 `/api/users/getUser` 会返回 400 错误",
              "✅ **允许**：函数名可以使用驼峰格式，例如 `getUser`、`createUser`",
            ],
          },
          {
            type: "code",
            code: methodModeCode,
            language: "typescript",
          },
          {
            type: "text",
            content: "**访问示例：**",
          },
          {
            type: "code",
            code: `# ✅ 正确：使用中划线格式
curl -X POST http://localhost:3000/api/users/get-user

# ❌ 错误：使用驼峰格式会返回 400 错误
curl -X POST http://localhost:3000/api/users/getUser

# ✅ 正确：创建用户
curl -X POST http://localhost:3000/api/users/create-user \\
  -H "Content-Type: application/json" \\
  -d '{"name":"John","email":"john@example.com"}'`,
            language: "bash",
          },
        ],
      },

      {
        title: "REST 模式",
        blocks: [
          {
            type: "text",
            content: "REST 模式基于 HTTP 方法和资源路径，支持两种命名方式：",
          },
          {
            type: "subsection",
            level: 3,
            title: "方式 1：直接使用 HTTP 方法名（推荐）",
            blocks: [
              {
                type: "code",
                code: restModeCode,
                language: "typescript",
              },
              {
                type: "text",
                content: "**访问示例：**",
              },
              {
                type: "code",
                code: `# GET 请求（获取列表）
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
curl -X DELETE http://localhost:3000/api/users/123`,
                language: "bash",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "方式 2：使用标准 RESTful 命名（备选）",
            blocks: [
              {
                type: "code",
                code: restStandardCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "ApiContext 上下文对象",
        blocks: [
          {
            type: "text",
            content: "所有 API 路由处理函数都接收一个 `ApiContext` 对象作为参数，该对象包含处理请求所需的所有信息。",
          },
          {
            type: "code",
            code: apiContextExampleCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "推荐用法：解构参数",
        blocks: [
          {
            type: "text",
            content: "推荐只解构实际使用的属性，这样代码更简洁，也更容易理解：",
          },
          {
            type: "code",
            code: destructuringCode,
            language: "typescript",
          },
        ],
      },

      {
        title: "ApiContext 属性说明",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**`req`**: `Request` - 请求对象，包含请求方法、URL、请求体等信息",
              "**`res`**: `Response` - 响应对象，用于设置响应状态码、响应体等",
              "**`app`**: `ApplicationLike` - Application 实例，用于访问服务容器、配置等应用级别的功能",
              "**`cookie`**: `Record<string, string>` - Cookie 对象，包含所有请求的 Cookie",
              "**`session`**: `Session | null` - Session 对象（如果存在），用于存储会话数据",
              "**`params`**: `Record<string, string>` - 路由参数，例如 `/api/users/:id` 中的 `id`",
              "**`query`**: `Record<string, string>` - 查询参数，例如 `/api/users?id=123` 中的 `id`",
              "**`routePath`**: `string` - 当前路由路径，例如 `/api/users`",
              "**`url`**: `URL` - URL 对象，包含完整的 URL 信息（协议、主机、路径、查询参数等）",
            ],
          },
        ],
      },

      {
        title: "REST 模式 vs Method 模式对比",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**URL 格式**：REST 模式 - `GET /api/users`、`GET /api/users/123`；Method 模式 - `POST /api/users/get-user`、`POST /api/users/get-user-by-id`",
              "**HTTP 方法**：REST 模式 - 使用标准 HTTP 方法（GET, POST, PUT, DELETE）；Method 模式 - 所有请求默认使用 POST",
              "**函数命名**：REST 模式 - 标准 RESTful 命名（GET, GET_ID, POST, PUT_ID, DELETE_ID）或（index, show, create, update, destroy）；Method 模式 - 自定义函数名（getUser, createUser 等），URL 必须使用中划线格式",
              "**路径简洁性**：REST 模式 - 路径简洁，符合 RESTful 规范；Method 模式 - 路径中包含方法名",
              "**适用场景**：REST 模式 - 标准的 CRUD 操作；Method 模式 - 自定义业务方法（如 sendEmail, resetPassword）",
            ],
          },
          {
            type: "alert",
            level: "info",
            content: [
              "**选择建议：**",
              "如果需要标准的 CRUD 操作，使用 **REST 模式**",
              "如果需要自定义的业务方法（如 `sendEmail`、`resetPassword`），使用 **Method 模式**",
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
