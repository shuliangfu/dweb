# 路由约定文件

DWeb 框架使用文件系统路由，并支持以 `_` 开头的特殊约定文件。这些文件具有特殊的功能，用于定义布局、中间件、错误页面等。

## 约定文件概览

DWeb 框架支持以下约定文件：

| 文件名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `_app.tsx` | 应用组件 | ✅ 必需 | 根应用组件，包裹所有页面 |
| `_layout.tsx` | 布局组件 | ❌ 可选 | 布局组件，支持继承 |
| `_middleware.ts` | 中间件 | ❌ 可选 | 路由级中间件 |
| `_404.tsx` | 错误页面 | ❌ 可选 | 404 页面未找到 |
| `_error.tsx` | 错误页面 | ❌ 可选 | 通用错误页面 |
| `_500.tsx` | 错误页面 | ❌ 可选 | 500 服务器错误 |

## 文件结构示例

```
routes/
├── _app.tsx              # 根应用组件（必需）
├── _layout.tsx            # 根布局（可选）
├── _middleware.ts         # 根中间件（可选）
├── _404.tsx               # 404 错误页面（可选）
├── _error.tsx             # 通用错误页面（可选）
├── _500.tsx               # 500 错误页面（可选）
├── index.tsx               # 首页 (/)
├── about.tsx               # 关于页面 (/about)
├── users/
│   ├── _layout.tsx        # 用户布局（应用到 /users 下的所有页面）
│   ├── _middleware.ts     # 用户中间件（应用到 /users 下的所有路由）
│   ├── index.tsx           # /users
│   └── [id].tsx            # /users/:id
└── api/                    # API 路由目录（默认在 routes/api，可通过 apiDir 配置）
    └── _middleware.ts      # API 中间件（应用到 /api 下的所有路由）
```

## _app.tsx - 根应用组件

`_app.tsx` 是框架**必需**的文件，用于提供完整的 HTML 文档结构，包裹所有页面内容。

### 位置

必须放在 `routes` 目录的根目录下：

```
routes/
└── _app.tsx  ✅ 正确
```

### 基本结构

```tsx
// routes/_app.tsx
export interface AppProps {
  /** 页面内容（已渲染的 HTML） */
  children: string;
}

export default function App({ children }: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>我的应用</title>
        <link rel="stylesheet" href="/assets/style.css" />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
```

### 重要说明

- **必需文件**：`_app.tsx` 是框架必需的文件，如果不存在会导致应用无法启动
- **HTML 结构**：必须包含完整的 HTML 文档结构（`<html>`、`<head>`、`<body>`）
- **children 属性**：接收已渲染的页面 HTML 字符串
- **自动注入**：框架会自动注入客户端脚本、HMR 脚本等，无需手动添加

### 完整示例

```tsx
// routes/_app.tsx
export interface AppProps {
  children: string;
}

export default function App({ children }: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DWeb - 现代化的全栈 Web 框架</title>
        <link rel="icon" type="image/png" href="/assets/favicon.png" />
        <link rel="stylesheet" href="/assets/tailwind.css" />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
```

## _layout.tsx - 布局组件

`_layout.tsx` 用于定义页面布局，支持布局继承。详细说明请参考 [布局系统文档](./layout.md)。

### 位置

可以放在任何目录下：

```
routes/
├── _layout.tsx            # 根布局（应用到所有页面）
└── docs/
    └── _layout.tsx        # 文档布局（应用到 /docs 下的所有页面）
```

### 基本结构

```tsx
// routes/_layout.tsx
import type { ComponentChildren } from "preact";

interface LayoutProps {
  children: ComponentChildren;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header>导航栏</header>
      <main>{children}</main>
      <footer>页脚</footer>
    </div>
  );
}
```

### 禁用布局继承

如果不想继承父布局，可以设置 `layout = false`：

```tsx
// routes/docs/_layout.tsx
export const layout = false; // 禁用布局继承

export default function DocsLayout({ children }: LayoutProps) {
  return (
    <html lang="zh-CN">
      <head>
        <title>文档</title>
      </head>
      <body>
        <div className="docs-container">
          {children}
        </div>
      </body>
    </html>
  );
}
```

### 相关文档

- [布局系统完整文档](./layout.md)

## _middleware.ts - 路由中间件

`_middleware.ts` 用于定义路由级中间件，可以为特定路径及其子路径应用中间件逻辑。详细说明请参考 [中间件文档](./middleware.md#路由级中间件-_middlewarets)。

### 位置

可以放在任何目录下：

```
routes/
├── _middleware.ts          # 根中间件（应用到所有路由）
└── api/                    # API 路由目录（默认在 routes/api，可通过 apiDir 配置）
    └── _middleware.ts      # API 中间件（应用到 /api 下的所有路由）
```

### 基本结构

#### 单个中间件

```tsx
// routes/_middleware.ts
import type { Middleware } from '@dreamer/dweb';

const routeMiddleware: Middleware = async (req, res, next) => {
  // 请求处理前的逻辑
  console.log(`[中间件] ${req.method} ${req.url}`);
  
  // 调用下一个中间件或路由处理器
  await next();
  
  // 请求处理后的逻辑
  res.setHeader('X-Processed', 'true');
};

export default routeMiddleware;
```

#### 多个中间件

```tsx
// routes/api/_middleware.ts
import type { Middleware } from '@dreamer/dweb';

const authMiddleware: Middleware = async (req, res, next) => {
  // 认证逻辑
  const token = req.headers.get('Authorization');
  if (!token) {
    res.status = 401;
    res.json({ error: 'Unauthorized' });
    return;
  }
  await next();
};

const loggerMiddleware: Middleware = async (req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  await next();
};

// 导出中间件数组，按顺序执行
export default [authMiddleware, loggerMiddleware];
```

### 中间件继承

中间件会按照路径层级从根到具体路径依次执行：

- 访问 `/api/users` 时：
  1. `routes/_middleware.ts`（根中间件）
  2. `routes/api/_middleware.ts`（API 中间件）

### 相关文档

- [中间件完整文档](./middleware.md#路由级中间件-_middlewarets)

## _404.tsx - 404 错误页面

`_404.tsx` 用于定义 404 页面未找到时的错误页面。

### 位置

必须放在 `routes` 目录的根目录下：

```
routes/
└── _404.tsx  ✅ 正确
```

### 基本结构

```tsx
// routes/_404.tsx
export const metadata = {
  title: '404 - 页面未找到',
  description: '抱歉，您访问的页面不存在。',
};

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-indigo-600 mb-4">404</h1>
        <h2 className="text-3xl font-semibold text-gray-800 mb-4">
          页面未找到
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          抱歉，您访问的页面不存在。请检查 URL 是否正确，或返回首页。
        </p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}
```

### 使用说明

- **自动触发**：当访问不存在的路由时，框架会自动使用 `_404.tsx` 渲染 404 页面
- **状态码**：框架会自动设置响应状态码为 404
- **SEO**：建议设置 `metadata.robots = false`，避免搜索引擎索引 404 页面

## _error.tsx - 通用错误页面

`_error.tsx` 用于定义通用错误页面，处理服务器错误、渲染错误等。

### 位置

必须放在 `routes` 目录的根目录下：

```
routes/
└── _error.tsx  ✅ 正确
```

### 基本结构

```tsx
// routes/_error.tsx
export const metadata = {
  title: '500 - 服务器错误',
  description: '发生了服务器错误。请稍后重试。',
};

interface ErrorProps {
  error?: {
    message?: string;
    statusCode?: number;
  };
}

export default function ErrorPage({ error }: ErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-9xl font-bold text-red-600 mb-4">500</h1>
        <h2 className="text-3xl font-semibold text-gray-800 mb-4">
          服务器错误
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          {error?.message || '发生了未知错误。请稍后重试，或联系管理员。'}
        </p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}
```

### 使用说明

- **自动触发**：当发生服务器错误、渲染错误等时，框架会自动使用 `_error.tsx` 渲染错误页面
- **错误信息**：组件会接收 `error` 属性，包含错误信息
- **状态码**：框架会根据错误类型自动设置响应状态码（通常是 500）

## _500.tsx - 500 服务器错误页面

`_500.tsx` 专门用于处理 500 服务器错误，优先级高于 `_error.tsx`。

### 位置

必须放在 `routes` 目录的根目录下：

```
routes/
└── _500.tsx  ✅ 正确
```

### 基本结构

```tsx
// routes/_500.tsx
export const metadata = {
  title: '500 - 服务器错误',
  description: '发生了服务器内部错误。',
};

interface ErrorProps {
  error?: {
    message?: string;
  };
}

export default function ServerErrorPage({ error }: ErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-9xl font-bold text-red-600 mb-4">500</h1>
        <h2 className="text-3xl font-semibold text-gray-800 mb-4">
          服务器内部错误
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          {error?.message || '服务器遇到了一个错误，无法完成您的请求。'}
        </p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}
```

### 错误页面优先级

当发生错误时，框架会按以下优先级选择错误页面：

1. `_500.tsx` - 专门处理 500 错误
2. `_error.tsx` - 处理其他错误
3. `_404.tsx` - 处理 404 错误
4. 默认错误页面 - 如果以上都不存在

## 约定文件总结

### 必需文件

- ✅ `_app.tsx` - 根应用组件（必需）

### 可选文件

- ❌ `_layout.tsx` - 布局组件（可选，支持继承）
- ❌ `_middleware.ts` - 路由中间件（可选）
- ❌ `_404.tsx` - 404 错误页面（可选）
- ❌ `_error.tsx` - 通用错误页面（可选）
- ❌ `_500.tsx` - 500 错误页面（可选）

### 文件命名规则

- 所有约定文件都以 `_` 下划线开头
- 支持 `.tsx` 和 `.ts` 扩展名（`_middleware.ts` 只支持 `.ts`）
- 文件名必须完全匹配（区分大小写）

### 文件位置规则

| 文件 | 位置要求 | 作用范围 |
|------|---------|---------|
| `_app.tsx` | 必须在 `routes/` 根目录 | 所有页面 |
| `_layout.tsx` | 可以放在任何目录 | 该目录及其子目录 |
| `_middleware.ts` | 可以放在任何目录 | 该目录及其子目录 |
| `_404.tsx` | 必须在 `routes/` 根目录 | 所有 404 错误 |
| `_error.tsx` | 必须在 `routes/` 根目录 | 所有错误（除 404 和 500） |
| `_500.tsx` | 必须在 `routes/` 根目录 | 所有 500 错误 |

## 最佳实践

### 1. 保持 _app.tsx 简洁

`_app.tsx` 应该只包含 HTML 文档结构，业务逻辑应该放在布局或页面组件中。

### 2. 合理使用布局继承

- 使用根布局提供全局结构
- 使用子布局提供特定区域的布局
- 在需要完全独立布局时使用 `layout = false`

### 3. 中间件职责分离

- 使用全局中间件处理通用功能（CORS、压缩等）
- 使用路由中间件处理路径特定的逻辑（认证、日志等）

### 4. 错误页面友好

- 提供清晰的错误信息
- 提供返回首页或相关页面的链接
- 设置合适的 SEO 元数据（`robots: false`）

## 常见问题

### Q: 可以创建多个 _app.tsx 吗？

A: 不可以。`_app.tsx` 只能有一个，必须放在 `routes/` 根目录。

### Q: _layout.tsx 和 _app.tsx 的区别是什么？

A: 
- `_app.tsx`：提供 HTML 文档结构（`<html>`、`<head>`、`<body>`），必需
- `_layout.tsx`：提供页面布局结构（导航、侧边栏等），可选，支持继承

### Q: 中间件和布局的执行顺序是什么？

A: 
1. 全局中间件（`server.use()`）
2. 路由中间件（从根到具体路径）
3. 布局组件（从最具体到最通用）
4. 页面组件

### Q: 错误页面可以访问错误信息吗？

A: 可以。错误页面组件会接收 `error` 属性，包含错误信息：

```tsx
export default function ErrorPage({ error }: { error?: { message?: string } }) {
  return <div>{error?.message || '未知错误'}</div>;
}
```

## 相关文档

- [路由系统](./core.md#路由系统) - 了解路由的基本概念
- [布局系统](./layout.md) - 了解布局继承的详细说明
- [中间件](./middleware.md) - 了解中间件的详细说明
- [配置](./configuration.md) - 了解如何配置应用

