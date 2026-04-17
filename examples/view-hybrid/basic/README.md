# View Basic Example

这是一个使用 `@dreamer/dweb` 框架和 View 构建的基础示例项目。

## 项目结构

```
view-basic/
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

### 开发模式

```bash
deno task dev
```

访问 http://localhost:3012（端口以 `src/config/main.ts` 为准，可用环境变量
`PORT` 覆盖）。

启动后，终端会按 `src/config/main.dev.ts`
输出：**计划任务**（`scheduledPlugin`：每 40 秒一次 `deno eval`、每分钟第 20
秒执行 `src/scripts/scheduled-sample.ts`）以及 **队列**（`queuePlugin` +
`MemoryQueueAdapter`，队列名 `sample`，容器注册为
`queueManager:dev`）。内存队列仅在应用进程内有效，可另开终端执行
**`deno task enqueue-queue`**（或
`deno run -A src/scripts/enqueue-queue-sample.ts`）向
`POST /api/dev/queue-sample` 投递一条任务，服务端消费后会在 `process`
中打印日志。按 Ctrl+C 停止时插件会在 `onStop` 中关闭 Cron 与队列管理器。

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
- **View** - 轻量级响应式视图引擎
- **Deno** - 现代 JavaScript/TypeScript 运行时
- **TypeScript** - 类型安全的 JavaScript
