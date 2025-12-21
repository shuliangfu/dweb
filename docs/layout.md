# 布局系统

DWeb 框架支持布局继承，允许你创建可复用的布局组件，并在多个页面之间共享。

## 布局继承

布局继承是 DWeb 框架的核心特性之一。通过创建 `_layout.tsx`
文件，你可以为特定路径下的所有页面提供统一的布局结构。

### 基本概念

布局文件使用 `_layout.tsx`
命名约定，放置在路由目录中。布局会自动应用到该目录及其所有子目录的页面。

### 布局文件结构

```
routes/
├── _layout.tsx          # 根布局（应用到所有页面）
├── index.tsx            # 首页
├── about.tsx            # 关于页面
└── docs/
    ├── _layout.tsx      # 文档布局（应用到 /docs 下的所有页面）
    ├── index.tsx         # /docs
    └── core/
        └── router.tsx   # /docs/core/router
```

### 布局继承顺序

当访问 `/docs/core/router` 时，布局的嵌套顺序为：

1. `routes/docs/_layout.tsx`（最具体）
2. `routes/_layout.tsx`（根布局）

布局组件会从最内层到最外层嵌套，最终结构为：

```tsx
<RootLayout>
  <DocsLayout>
    <PageContent />
  </DocsLayout>
</RootLayout>;
```

## 创建布局

### 基本布局示例

```tsx
// routes/_layout.tsx
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
}
```

### 嵌套布局示例

```tsx
// routes/docs/_layout.tsx
import Sidebar from "../../components/Sidebar.tsx";
import type { ComponentChildren } from "preact";

interface DocsLayoutProps {
  children: ComponentChildren;
}

export default function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 页面标题 */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            文档
          </h1>
        </div>
      </div>

      {/* 主要内容区域：左侧菜单 + 文档内容 */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        {/* 侧边栏导航 */}
        <Sidebar />

        {/* 文档内容区域 */}
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
}
```

## 禁用布局

DWeb 框架提供了两种禁用布局的方式：

### 1. 禁用布局继承（布局级别）

在某些情况下，你可能不希望某个布局继承父布局。例如，你可能希望文档页面使用完全独立的布局，而不继承根布局。

#### 使用 `layout = false`

在布局文件中导出 `export const layout = false` 可以禁用布局继承：

```tsx
// routes/docs/_layout.tsx
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
}
```

### 继承行为说明

- **默认行为**：布局会自动继承所有父级布局
- **`layout = false`**（布局级别）：设置后，该布局及其所有子页面将不再继承更上层的布局
- **`layout = false`**（页面级别）：设置后，该页面将不使用任何布局，包括父级布局
- **继承链中断**：当遇到 `layout = false` 的布局时，继承链会在此处停止

### 示例场景

#### 场景 1：禁用布局继承

假设你有以下布局结构：

```
routes/
├── _layout.tsx          # 根布局（包含 HTML 结构、导航栏、页脚）
└── docs/
    ├── _layout.tsx      # 文档布局（设置了 layout = false）
    └── core/
        └── router.tsx   # 页面
```

当访问 `/docs/core/router` 时：

- **如果 `docs/_layout.tsx` 没有设置 `layout = false`**：
  ```tsx
  <RootLayout>
    <DocsLayout>
      <RouterPage />
    </DocsLayout>
  </RootLayout>;
  ```

- **如果 `docs/_layout.tsx` 设置了 `layout = false`**：
  ```tsx
  <DocsLayout>
    <RouterPage />
  </DocsLayout>;
  ```

#### 场景 2：禁用页面布局

假设你有以下结构：

```
routes/
├── _layout.tsx          # 根布局（包含 HTML 结构、导航栏、页脚）
├── index.tsx            # 首页（使用布局）
└── login.tsx            # 登录页面（设置了 layout = false）
```

当访问不同页面时：

- **访问 `/`（首页）**：
  ```tsx
  <RootLayout>
    <HomePage />
  </RootLayout>;
  ```

- **访问 `/login`（登录页）**：
  ```tsx
  <LoginPage />; // 不使用任何布局
  ```

## 布局组件属性

布局组件接收一个 `children` 属性，包含子页面或子布局的内容：

```tsx
interface LayoutProps {
  children: ComponentChildren;
}
```

### 使用 children

```tsx
export default function MyLayout({ children }: LayoutProps) {
  return (
    <div className="layout-wrapper">
      <header>导航栏</header>
      <main>{children}</main>
      <footer>页脚</footer>
    </div>
  );
}
```

## 最佳实践

### 1. 保持布局简洁

布局应该只包含结构性的内容，业务逻辑应该放在页面组件中。

### 2. 合理使用布局继承

- 使用根布局提供全局结构（HTML、导航、页脚等）
- 使用子布局提供特定区域的布局（如文档侧边栏、管理后台菜单等）
- 在需要完全独立布局时使用 `layout = false`

### 3. 布局与页面分离

- 布局文件：`_layout.tsx` - 提供结构
- 页面文件：`*.tsx` - 提供内容

### 4. 响应式设计

在布局中使用响应式类（如 Tailwind CSS）确保在不同设备上正常显示：

```tsx
export default function ResponsiveLayout({ children }: LayoutProps) {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <aside className="md:col-span-1">侧边栏</aside>
        <main className="md:col-span-2">{children}</main>
      </div>
    </div>
  );
}
```

## 常见问题

### Q: 布局继承的顺序是什么？

A: 布局继承从最具体到最通用：

1. 当前路径的布局（如 `/docs/core` 的布局）
2. 父路径的布局（如 `/docs` 的布局）
3. 根布局（`/` 的布局）

### Q: 如何让某个页面不使用任何布局？

A: 目前不支持完全禁用布局。如果你需要，可以在页面组件中返回完整的 HTML
结构，但这不推荐。

### Q: `layout = false` 在布局文件中会影响子布局吗？

A: 是的。如果父布局设置了 `layout = false`，子布局也不会继承更上层的布局。

### Q: 布局可以访问页面数据吗？

A: 布局组件只接收 `children`
属性，不能直接访问页面数据。如果需要共享数据，可以使用 Context
或其他状态管理方案。

## 相关文档

- [路由系统](./core.md#路由系统) - 了解路由的基本概念
- [配置](./configuration.md) - 了解如何配置应用
- [开发指南](./development.md) - 了解开发流程
