# Preact Hybrid Flat Basic Example

无 `src` 目录的扁平结构示例，使用 `@dreamer/dweb` 框架和 Preact（hybrid 模式）。

## 项目结构

```
preact-hybrid-flat/basic/
├── routes/                 # 文件路由
├── config/                 # 配置文件
├── assets/                 # 静态资源
├── main.ts                 # 服务端入口
├── _client.tsx             # 客户端入口
├── deno.json               # Deno 配置
└── README.md
```

## 快速开始

### 开发模式

```bash
deno task dev
```

访问 http://localhost:3002

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
