/**
 * 布局系统文档页面
 * 展示 DWeb 框架的布局系统使用方法
 */

import DocRenderer from "../../components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "布局系统 - DWeb 框架文档",
  description: "DWeb 框架的布局系统介绍，支持布局继承和嵌套布局",
};

export default function LayoutPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本布局示例
  const basicLayoutCode = `// routes/_layout.tsx
import type { ComponentChildren } from "preact";

interface LayoutProps {
  children: ComponentChildren;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>我的应用</title>
      </head>
      <body>
        <header>
          <nav>
            <a href="/">首页</a>
            <a href="/about">关于</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          <p>&copy; 2024 我的应用</p>
        </footer>
      </body>
    </html>
  );
}`;

  // 嵌套布局示例
  const nestedLayoutCode = `// routes/docs/_layout.tsx
import Sidebar from "../../components/Sidebar.tsx";
import type { ComponentChildren } from "preact";

interface DocsLayoutProps {
  children: ComponentChildren;
}

export default function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            文档
          </h1>
        </div>
      </div>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <div className="py-20 bg-white">
            <div className="px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`;

  // 禁用布局继承
  const disableLayoutCode = `// routes/docs/_layout.tsx
import type { ComponentChildren } from "preact";

// 禁用布局继承，不继承父布局（如根布局）
export const layout = false;

interface DocsLayoutProps {
  children: ComponentChildren;
}

export default function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>文档 - 我的应用</title>
      </head>
      <body>
        <div className="docs-container">
          {/* 完全独立的布局，不继承根布局 */}
          {children}
        </div>
      </body>
    </html>
  );
}`;

  // 使用 useEffect 处理异步操作
  const asyncLayoutCode = `// ✅ 正确：使用 useEffect 处理异步操作
import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from "preact";

export default function MyLayout({ children }: { children: ComponentChildren }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const result = await fetch('/api/data');
      const json = await result.json();
      setData(json);
    };
    fetchData();
  }, []);

  return (
    <div className="layout-wrapper">
      <header>导航栏</header>
      <main>{children}</main>
      <footer>页脚</footer>
    </div>
  );
}`;

  // 响应式布局
  const responsiveLayoutCode =
    `export default function ResponsiveLayout({ children }: LayoutProps) {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <aside className="md:col-span-1">侧边栏</aside>
        <main className="md:col-span-2">{children}</main>
      </div>
    </div>
  );
}`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "布局系统",
    description: "DWeb 框架支持布局继承，允许你创建可复用的布局组件，并在多个页面之间共享。",
    sections: [
      {
        title: "布局继承",
        blocks: [
          {
            type: "text",
            content: "布局继承是 DWeb 框架的核心特性之一。通过创建 `_layout.tsx` 文件，你可以为特定路径下的所有页面提供统一的布局结构。",
          },
          {
            type: "subsection",
            level: 3,
            title: "基本概念",
            blocks: [
              {
                type: "text",
                content: "布局文件使用 `_layout.tsx` 命名约定，放置在路由目录中。布局会自动应用到该目录及其所有子目录的页面。",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "布局文件结构",
            blocks: [
              {
                type: "code",
                code: `routes/
├── _layout.tsx          # 根布局（应用到所有页面）
├── index.tsx            # 首页
├── about.tsx            # 关于页面
└── docs/
    ├── _layout.tsx      # 文档布局（应用到 /docs 下的所有页面）
    ├── index.tsx         # /docs
    └── core/
        └── router.tsx   # /docs/core/router`,
                language: "text",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "布局继承顺序",
            blocks: [
              {
                type: "text",
                content: "当访问 `/docs/core/router` 时，布局的嵌套顺序为：",
              },
              {
                type: "list",
                ordered: true,
                items: [
                  "`routes/docs/_layout.tsx`（最具体）",
                  "`routes/_layout.tsx`（根布局）",
                ],
              },
              {
                type: "text",
                content: "布局组件会从最内层到最外层嵌套，最终结构为：",
              },
              {
                type: "code",
                code: `<RootLayout>
  <DocsLayout>
    <PageContent />
  </DocsLayout>
</RootLayout>`,
                language: "tsx",
              },
            ],
          },
        ],
      },

      {
        title: "创建布局",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "基本布局示例",
            blocks: [
              {
                type: "code",
                code: basicLayoutCode,
                language: "tsx",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "嵌套布局示例",
            blocks: [
              {
                type: "code",
                code: nestedLayoutCode,
                language: "tsx",
              },
            ],
          },
        ],
      },
      {
        title: "禁用布局",
        blocks: [
          {
            type: "text",
            content: "DWeb 框架提供了两种禁用布局的方式：",
          },
          {
            type: "subsection",
            level: 3,
            title: "1. 禁用布局继承（布局级别）",
            blocks: [
              {
                type: "text",
                content: "在某些情况下，你可能不希望某个布局继承父布局。例如，你可能希望文档页面使用完全独立的布局，而不继承根布局。",
              },
              {
                type: "text",
                content: "**使用 `layout = false`**",
              },
              {
                type: "text",
                content: "在布局文件中导出 `export const layout = false` 可以禁用布局继承：",
              },
              {
                type: "code",
                code: disableLayoutCode,
                language: "tsx",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "继承行为说明",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**默认行为**：布局会自动继承所有父级布局",
                  "**`layout = false`**（布局级别）：设置后，该布局及其所有子页面将不再继承更上层的布局",
                  "**`layout = false`**（页面级别）：设置后，该页面将不使用任何布局，包括父级布局",
                  "**继承链中断**：当遇到 `layout = false` 的布局时，继承链会在此处停止",
                ],
              },
            ],
          },
        ],
      },

      {
        title: "布局组件属性",
        blocks: [
          {
            type: "text",
            content: "布局组件接收一个 `children` 属性，包含子页面或子布局的内容：",
          },
          {
            type: "code",
            code: `interface LayoutProps {
  children: ComponentChildren;
}`,
            language: "tsx",
          },
          {
            type: "subsection",
            level: 3,
            title: "使用 children",
            blocks: [
              {
                type: "code",
                code: `export default function MyLayout({ children }: LayoutProps) {
  return (
    <div className="layout-wrapper">
      <header>导航栏</header>
      <main>{children}</main>
      <footer>页脚</footer>
    </div>
  );
}`,
                language: "tsx",
              },
            ],
          },
        ],
      },
      {
        title: "重要限制",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "⚠️ 布局组件不能是异步函数",
            blocks: [
              {
                type: "text",
                content: "**布局组件不能定义为 `async function`**。如果需要进行异步操作（如数据获取），请在组件内部使用 `useEffect` 钩子处理。",
              },
              {
                type: "text",
                content: "**❌ 错误示例**",
              },
              {
                type: "code",
                code: `// ❌ 错误：布局组件不能是异步函数
export default async function MyLayout({ children }: LayoutProps) {
  const data = await fetchData(); // 这会导致错误
  return <div>{children}</div>;
}`,
                language: "tsx",
              },
              {
                type: "text",
                content: "**✅ 正确示例**",
              },
              {
                type: "code",
                code: asyncLayoutCode,
                language: "tsx",
              },
            ],
          },
        ],
      },

      {
        title: "最佳实践",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "1. 保持布局简洁",
            blocks: [
              {
                type: "text",
                content: "布局应该只包含结构性的内容，业务逻辑应该放在页面组件中。",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "2. 合理使用布局继承",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "使用根布局提供全局结构（HTML、导航、页脚等）",
                  "使用子布局提供特定区域的布局（如文档侧边栏、管理后台菜单等）",
                  "在需要完全独立布局时使用 `layout = false`",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "3. 布局与页面分离",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "布局文件：`_layout.tsx` - 提供结构",
                  "页面文件：`*.tsx` - 提供内容",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "4. 响应式设计",
            blocks: [
              {
                type: "text",
                content: "在布局中使用响应式类（如 Tailwind CSS）确保在不同设备上正常显示：",
              },
              {
                type: "code",
                code: responsiveLayoutCode,
                language: "tsx",
              },
            ],
          },
        ],
      },
      {
        title: "常见问题",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "Q: 布局继承的顺序是什么？",
            blocks: [
              {
                type: "text",
                content: "A: 布局继承从最具体到最通用：",
              },
              {
                type: "list",
                ordered: true,
                items: [
                  "当前路径的布局（如 `/docs/core` 的布局）",
                  "父路径的布局（如 `/docs` 的布局）",
                  "根布局（`/` 的布局）",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "Q: 如何让某个页面不使用任何布局？",
            blocks: [
              {
                type: "text",
                content: "A: 在页面组件中导出 `export const layout = false`，该页面将不使用任何布局。",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "Q: `layout = false` 在布局文件中会影响子布局吗？",
            blocks: [
              {
                type: "text",
                content: "A: 是的。如果父布局设置了 `layout = false`，子布局也不会继承更上层的布局。",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "Q: 布局可以访问页面数据吗？",
            blocks: [
              {
                type: "text",
                content: "A: 布局组件只接收 `children` 属性，不能直接访问页面数据。如果需要共享数据，可以使用 Context 或其他状态管理方案。",
              },
            ],
          },
        ],
      },
      {
        title: "相关文档",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[路由系统](/docs/core/router) - 了解路由的基本概念",
              "[配置](/docs/configuration) - 了解如何配置应用",
              "[开发指南](/docs/development) - 了解开发流程",
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
