/**
 * 核心模块 - 路由系统 (Router) 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
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

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "路由系统 (Router)",
    description: "DWeb 使用文件系统路由，路由文件位于 `routes` 目录。文件路径自动映射为 URL 路径，无需手动配置路由表。",
    sections: [

      {
        title: "文件系统路由",
        blocks: [
          {
            type: "text",
            content: "路由文件位于 `routes` 目录。文件路径自动映射为 URL 路径：",
          },
          {
            type: "code",
            code: routerCode,
            language: "text",
          },
          {
            type: "subsection",
            level: 3,
            title: "路由规则",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`index.tsx`** - 映射到目录的根路径",
                  "**`[id].tsx`** - 动态路由参数",
                  "**`[...slug].tsx`** - 捕获所有路由",
                  "**`[[slug]].tsx`** - 可选参数路由",
                ],
              },
            ],
          },
        ],
      },

      {
        title: "动态路由",
        blocks: [
          {
            type: "text",
            content: "使用方括号 `[id]` 创建动态路由参数：",
          },
          {
            type: "code",
            code: dynamicRouteCode,
            language: "typescript",
          },
          {
            type: "text",
            content: "访问 `/users/123` 时，`params.id` 将是 `'123'`。",
          },
        ],
      },
      {
        title: "捕获所有路由",
        blocks: [
          {
            type: "text",
            content: "使用 `[...slug]` 捕获所有剩余路径段：",
          },
          {
            type: "code",
            code: catchAllRouteCode,
            language: "typescript",
          },
          {
            type: "text",
            content: "访问 `/docs/getting-started/installation` 时，`params.slug` 将是 `['getting-started', 'installation']`。",
          },
        ],
      },
      {
        title: "可选参数路由",
        blocks: [
          {
            type: "text",
            content: "使用双括号 `[[slug]]` 创建可选参数路由：",
          },
          {
            type: "code",
            code: optionalRouteCode,
            language: "typescript",
          },
          {
            type: "text",
            content: "`/posts` 和 `/posts/hello-world` 都会匹配此路由。",
          },
        ],
      },

      {
        title: "使用 load 函数获取数据",
        blocks: [
          {
            type: "text",
            content: "`load` 函数在服务端执行，用于在页面渲染前获取数据。返回的数据会自动传递给页面组件的 `data` 属性。",
          },
          {
            type: "code",
            code: loadFunctionCode,
            language: "typescript",
          },
          {
            type: "alert",
            level: "success",
            content: [
              "**优势：**",
              "在服务端执行，减少客户端请求",
              "支持 SSR，提高 SEO 和首屏性能",
              "可以访问数据库、文件系统等服务器资源",
              "数据在服务端获取，更安全",
            ],
          },
        ],
      },

      {
        title: "⚠️ 重要限制：页面组件不能是异步函数",
        blocks: [
          {
            type: "text",
            content: "**页面组件不能定义为 `async function`**。如果需要进行异步操作（如数据获取），请使用以下方式：",
          },
          {
            type: "alert",
            level: "error",
            content: [
              "**❌ 错误示例：**",
              asyncComponentErrorCode,
            ],
          },
          {
            type: "alert",
            level: "success",
            content: [
              "**✅ 正确示例：使用 useEffect**",
              useEffectCode,
            ],
          },
          {
            type: "alert",
            level: "info",
            content: [
              "**✅ 推荐：使用 load 函数（见上方示例）**",
              "使用 `load` 函数在服务端获取数据是最佳实践，可以充分利用 SSR 的优势，提高性能和 SEO。",
            ],
          },
        ],
      },

      {
        title: "路由优先级",
        blocks: [
          {
            type: "text",
            content: "路由匹配按以下优先级（从高到低）：",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "精确匹配（如 `/users/index.tsx`）",
              "动态路由（如 `/users/[id].tsx`）",
              "捕获所有路由（如 `/users/[...slug].tsx`）",
              "可选参数路由（如 `/users/[[slug]].tsx`）",
            ],
          },
          {
            type: "alert",
            level: "warning",
            content: [
              "**注意：**当多个路由都能匹配同一个路径时，框架会选择优先级最高的路由。",
            ],
          },
        ],
      },

      {
        title: "路由约定文件",
        blocks: [
          {
            type: "text",
            content: "DWeb 框架支持以下约定文件，它们有特殊的作用：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "**`_app.tsx`** - 根应用组件，提供 HTML 文档结构（DOCTYPE、head、body 等），示例：`routes/_app.tsx`",
              "**`_layout.tsx`** - 布局组件，提供页面布局结构，示例：`routes/_layout.tsx`",
              "**`_middleware.ts`** - 中间件文件，在请求处理前执行，示例：`routes/_middleware.ts`",
              "**`_404.tsx`** - 404 错误页面，当路由不匹配时显示，示例：`routes/_404.tsx`",
              "**`_error.tsx`** - 错误页面，当发生错误时显示，示例：`routes/_error.tsx`",
            ],
          },
          {
            type: "text",
            content: "更多关于约定文件的说明，请参考 [路由约定文档](/docs/routing-conventions)。",
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
