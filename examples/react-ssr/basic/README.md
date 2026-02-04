# React Basic Example

这是一个使用 `@dreamer/dweb` 框架和 React 构建的基础示例项目。

## 项目结构

```
react-basic/
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
├── deno.json               # Deno 配置
└── README.md
```

## 快速开始

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

## 技术栈

- **@dreamer/dweb** - 全栈 Web 框架
- **React** - 流行的 UI 库
- **Deno** - 现代 JavaScript/TypeScript 运行时
- **TypeScript** - 类型安全的 JavaScript
