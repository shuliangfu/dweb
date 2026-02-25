# Preact Basic Example

这是一个使用 `@dreamer/dweb` 框架和 Preact 构建的基础示例项目。

## 项目结构

```
preact-basic/
├── src/
│   ├── routes/              # 文件路由
│   │   ├── _app.tsx        # 应用根组件（HTML 结构）
│   │   ├── _layout.tsx     # 布局组件
│   │   ├── _404.tsx        # 404 错误页面
│   │   ├── _error.tsx      # 错误页面
│   │   ├── _middleware.ts  # 路由中间件
│   │   ├── index.tsx       # / 路由
│   │   ├── about.tsx       # /about 路由
│   │   └── user/
│   │       └── [id].tsx    # /user/:id 动态路由
│   ├── main.ts             # 服务端入口
│   └── config/             # 配置文件
│       ├── main.ts         # 默认配置
│       └── main.dev.ts     # 开发环境配置
├── deno.json               # Deno 配置
└── README.md
```

## 快速开始

### Bun 用户（build / start 前必读）

示例依赖的 `@dreamer/i18n` 等包已由 **dweb 根目录** 的 `package.json` 声明。请先在 **dweb 仓库根目录**（本示例的 `../../../`）执行一次 `bun install`，再在本目录执行 `bun run build` 与 `bun run start`。这样运行时会沿目录向上解析到根 `node_modules`，无需在示例中重复声明这些依赖。

```bash
# 在 dweb 根目录执行（仅需一次）
cd ../../../ && bun install && cd -

# 本目录：构建与启动
bun run build
bun run start
```

### 开发模式

```bash
deno task dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
deno task build
```

### 运行生产版本

```bash
deno task start
```

## 路由说明

| 路由        | 文件            | 描述                 |
| ----------- | --------------- | -------------------- |
| `/`         | `index.tsx`     | 首页                 |
| `/about`    | `about.tsx`     | 关于页面             |
| `/user/:id` | `user/[id].tsx` | 用户详情（动态路由） |

## 特殊文件

| 文件             | 描述                           |
| ---------------- | ------------------------------ |
| `_app.tsx`       | 应用根组件，定义 HTML 文档结构 |
| `_layout.tsx`    | 布局组件，定义页面通用布局     |
| `_404.tsx`       | 404 错误页面                   |
| `_error.tsx`     | 通用错误页面                   |
| `_middleware.ts` | 路由中间件                     |

## 技术栈

- **@dreamer/dweb** - 全栈 Web 框架
- **Preact** - 轻量级 React 替代方案
- **Deno** - 现代 JavaScript/TypeScript 运行时
- **TypeScript** - 类型安全的 JavaScript
