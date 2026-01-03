# DWeb 框架示例项目

这是一个使用 DWeb 框架的示例项目，演示了框架的基本功能。

## 项目结构

```
example/
├── dweb.config.ts    # 框架配置文件
├── main.ts           # 应用入口文件（动态注册中间件和插件）
├── routes/           # 路由目录
│   ├── _layout.tsx   # 根布局
│   ├── index.tsx     # 首页
│   ├── about.tsx     # 关于页面
│   ├── api/          # API 路由
│   │   └── test.ts   # 测试 API
│   ├── _404.tsx      # 404 页面
│   └── _error.tsx    # 错误页面
└── public/           # 静态资源目录
```

## 运行示例

### 1. 开发模式

```bash
# 从项目根目录运行
deno run --allow-all src/cli.ts dev

# 或者从 example 目录运行（需要调整路径）
cd example
deno run --allow-all ../src/cli.ts dev
```

开发服务器将在 `http://localhost:3000` 启动，并支持热更新。

### 2. 构建项目

```bash
deno run --allow-all src/cli.ts build
```

构建输出将生成到 `dist/` 目录。

### 3. 生产模式

```bash
deno run --allow-all src/cli.ts start
```

## 主要文件说明

### main.ts

应用入口文件，用于动态注册中间件和插件。框架会在启动时自动加载此文件。

示例：

```typescript
import { createApp } from "../src/mod.ts";

const app = createApp();

// 注册中间件
app.use((req, res, next) => {
  res.setHeader("X-Powered-By", "DWeb");
  next();
});

// 注册插件
app.plugin({
  name: "my-plugin",
  onInit: async (app) => {
    console.log("插件初始化");
  },
});

export default app;
```

## 测试功能

### 页面路由

- 首页: http://localhost:3000/
- 关于页: http://localhost:3000/about

### API 路由（函数式 API）

- 测试 API: http://localhost:3000/api/test/test
- 获取用户: http://localhost:3000/api/test/get-user?id=123
- 登录: POST http://localhost:3000/api/test/login
  ```json
  {
    "username": "test",
    "password": "123456"
  }
  ```
- 登出: http://localhost:3000/api/test/logout

**注意**：API 路由 URL 必须使用中划线格式（kebab-case），例如
`/api/test/get-user`，不允许使用驼峰格式（camelCase），例如 `/api/test/getUser`
会返回 400 错误。

### 热更新测试

1. 启动开发服务器
2. 修改 `routes/index.tsx` 文件
3. 保存后，页面应该自动重载

### main.ts 测试

1. 修改 `main.ts` 中的中间件或插件
2. 重启开发服务器
3. 查看控制台输出，应该看到从 main.ts 加载的中间件和插件

## 注意事项

1. 确保 Deno 版本 >= 2.0.0
2. 首次运行会下载依赖，可能需要一些时间
3. 如果端口被占用，可以在 `dweb.config.ts` 中修改端口号
