/**
 * 布局系统文档页面
 * 展示 DWeb 框架的布局系统使用方法
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
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
  const responsiveLayoutCode = `export default function ResponsiveLayout({ children }: LayoutProps) {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <aside className="md:col-span-1">侧边栏</aside>
        <main className="md:col-span-2">{children}</main>
      </div>
    </div>
  );
}`;

  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>布局系统</h1>

      <p>
        DWeb 框架支持布局继承，允许你创建可复用的布局组件，并在多个页面之间共享。
      </p>

      <h2>布局继承</h2>

      <p>
        布局继承是 DWeb 框架的核心特性之一。通过创建 <code>_layout.tsx</code>{" "}
        文件，你可以为特定路径下的所有页面提供统一的布局结构。
      </p>

      <h3>基本概念</h3>

      <p>
        布局文件使用 <code>_layout.tsx</code>{" "}
        命名约定，放置在路由目录中。布局会自动应用到该目录及其所有子目录的页面。
      </p>

      <h3>布局文件结构</h3>

      <CodeBlock language="text" code={`routes/
├── _layout.tsx          # 根布局（应用到所有页面）
├── index.tsx            # 首页
├── about.tsx            # 关于页面
└── docs/
    ├── _layout.tsx      # 文档布局（应用到 /docs 下的所有页面）
    ├── index.tsx         # /docs
    └── core/
        └── router.tsx   # /docs/core/router`} />

      <h3>布局继承顺序</h3>

      <p>当访问 <code>/docs/core/router</code> 时，布局的嵌套顺序为：</p>

      <ol>
        <li><code>routes/docs/_layout.tsx</code>（最具体）</li>
        <li><code>routes/_layout.tsx</code>（根布局）</li>
      </ol>

      <p>布局组件会从最内层到最外层嵌套，最终结构为：</p>

      <CodeBlock
        language="tsx"
        code={`<RootLayout>
  <DocsLayout>
    <PageContent />
  </DocsLayout>
</RootLayout>`}
      />

      <h2>创建布局</h2>

      <h3>基本布局示例</h3>

      <CodeBlock language="tsx" code={basicLayoutCode} />

      <h3>嵌套布局示例</h3>

      <CodeBlock language="tsx" code={nestedLayoutCode} />

      <h2>禁用布局</h2>

      <p>DWeb 框架提供了两种禁用布局的方式：</p>

      <h3>1. 禁用布局继承（布局级别）</h3>

      <p>
        在某些情况下，你可能不希望某个布局继承父布局。例如，你可能希望文档页面使用完全独立的布局，而不继承根布局。
      </p>

      <h4>使用 <code>layout = false</code></h4>

      <p>
        在布局文件中导出 <code>export const layout = false</code> 可以禁用布局继承：
      </p>

      <CodeBlock language="tsx" code={disableLayoutCode} />

      <h3>继承行为说明</h3>

      <ul>
        <li>
          <strong>默认行为</strong>：布局会自动继承所有父级布局
        </li>
        <li>
          <strong><code>layout = false</code></strong>（布局级别）：设置后，该布局及其所有子页面将不再继承更上层的布局
        </li>
        <li>
          <strong><code>layout = false</code></strong>（页面级别）：设置后，该页面将不使用任何布局，包括父级布局
        </li>
        <li>
          <strong>继承链中断</strong>：当遇到 <code>layout = false</code>{" "}
          的布局时，继承链会在此处停止
        </li>
      </ul>

      <h2>布局组件属性</h2>

      <p>布局组件接收一个 <code>children</code> 属性，包含子页面或子布局的内容：</p>

      <CodeBlock
        language="tsx"
        code={`interface LayoutProps {
  children: ComponentChildren;
}`}
      />

      <h3>使用 children</h3>

      <CodeBlock
        language="tsx"
        code={`export default function MyLayout({ children }: LayoutProps) {
  return (
    <div className="layout-wrapper">
      <header>导航栏</header>
      <main>{children}</main>
      <footer>页脚</footer>
    </div>
  );
}`}
      />

      <h2>重要限制</h2>

      <h3>⚠️ 布局组件不能是异步函数</h3>

      <p>
        <strong>布局组件不能定义为 <code>async function</code></strong>。如果需要进行异步操作（如数据获取），请在组件内部使用{" "}
        <code>useEffect</code> 钩子处理。
      </p>

      <h4>❌ 错误示例</h4>

      <CodeBlock
        language="tsx"
        code={`// ❌ 错误：布局组件不能是异步函数
export default async function MyLayout({ children }: LayoutProps) {
  const data = await fetchData(); // 这会导致错误
  return <div>{children}</div>;
}`}
      />

      <h4>✅ 正确示例</h4>

      <CodeBlock language="tsx" code={asyncLayoutCode} />

      <h2>最佳实践</h2>

      <h3>1. 保持布局简洁</h3>

      <p>
        布局应该只包含结构性的内容，业务逻辑应该放在页面组件中。
      </p>

      <h3>2. 合理使用布局继承</h3>

      <ul>
        <li>使用根布局提供全局结构（HTML、导航、页脚等）</li>
        <li>使用子布局提供特定区域的布局（如文档侧边栏、管理后台菜单等）</li>
        <li>在需要完全独立布局时使用 <code>layout = false</code></li>
      </ul>

      <h3>3. 布局与页面分离</h3>

      <ul>
        <li>布局文件：<code>_layout.tsx</code> - 提供结构</li>
        <li>页面文件：<code>*.tsx</code> - 提供内容</li>
      </ul>

      <h3>4. 响应式设计</h3>

      <p>
        在布局中使用响应式类（如 Tailwind CSS）确保在不同设备上正常显示：
      </p>

      <CodeBlock language="tsx" code={responsiveLayoutCode} />

      <h2>常见问题</h2>

      <h3>Q: 布局继承的顺序是什么？</h3>

      <p>A: 布局继承从最具体到最通用：</p>

      <ol>
        <li>当前路径的布局（如 <code>/docs/core</code> 的布局）</li>
        <li>父路径的布局（如 <code>/docs</code> 的布局）</li>
        <li>根布局（<code>/</code> 的布局）</li>
      </ol>

      <h3>Q: 如何让某个页面不使用任何布局？</h3>

      <p>
        A: 在页面组件中导出 <code>export const layout = false</code>，该页面将不使用任何布局。
      </p>

      <h3>Q: <code>layout = false</code> 在布局文件中会影响子布局吗？</h3>

      <p>
        A: 是的。如果父布局设置了 <code>layout = false</code>，子布局也不会继承更上层的布局。
      </p>

      <h3>Q: 布局可以访问页面数据吗？</h3>

      <p>
        A: 布局组件只接收 <code>children</code>{" "}
        属性，不能直接访问页面数据。如果需要共享数据，可以使用 Context
        或其他状态管理方案。
      </p>

      <h2>相关文档</h2>

      <ul>
        <li>
          <a href="/docs/core/router">路由系统</a> - 了解路由的基本概念
        </li>
        <li>
          <a href="/docs/configuration">配置</a> - 了解如何配置应用
        </li>
        <li>
          <a href="/docs/development">开发指南</a> - 了解开发流程
        </li>
      </ul>
    </article>
  );
}