# 开发指南

DWeb 框架开发指南，包括项目创建、开发流程、构建部署等。

## 项目创建

### 使用 CLI 创建项目

```bash
# 交互式创建项目
deno run -A jsr:@dreamer/dweb/init

# 指定项目名称
deno run -A jsr:@dreamer/dweb/init my-app
```

### 项目结构

创建的项目结构如下：

```
my-app/
├── routes/              # 路由目录
│   ├── index.tsx        # 首页
│   ├── about.tsx        # 关于页面
│   └── api/             # API 路由
│       └── users.ts
├── components/          # 组件目录
├── assets/              # 静态资源
├── public/              # 公共文件
├── dweb.config.ts       # 配置文件
├── deno.json            # Deno 配置
└── main.ts              # 入口文件（可选）
```

### 入口文件 (main.ts)

**注意：`main.ts` 文件是可选的，不是必须的。** 框架可以通过 CLI 命令（`deno task dev` 或 `deno task start`）自动启动服务器，无需手动创建入口文件。

如果你需要自定义应用配置（如添加中间件、插件等），可以创建 `main.ts` 文件：

```typescript
// main.ts（可选）
/**
 * DWeb 框架应用配置文件
 * 用于创建应用实例并配置中间件和插件
 * 
 * 注意：此文件只用于配置，不直接启动服务
 * 服务启动通过 CLI 命令：deno task dev 或 deno task start
 */

import { createApp, cors, staticFiles } from '@dreamer/dweb';

// 创建应用实例
const app = createApp();

// 配置中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 配置静态文件服务
app.use(staticFiles({
  dir: 'assets',
  prefix: '/assets',
  maxAge: 86400, // 缓存 1 天
}));

// 可以添加更多中间件
// app.use(customMiddleware);

// 可以注册插件
// app.plugin(customPlugin);

// 导出应用实例
export default app;
```

**使用说明：**
- 如果存在 `main.ts` 文件，框架会自动加载并应用其中的配置
- 如果不存在 `main.ts` 文件，框架会使用 `dweb.config.ts` 中的配置
- `main.ts` 主要用于需要编程式配置的场景，如动态添加中间件或插件

## 开发流程

### 启动开发服务器

```bash
# 启动开发服务器（默认端口 3000）
deno task dev

# 指定端口
deno task dev --port 8080

# 多应用模式
deno task dev:frontend
deno task dev:backend
```

### 热更新 (HMR)

开发服务器支持热更新，修改代码后自动刷新：

- **服务端组件**：自动重新加载
- **客户端组件**：通过 WebSocket 推送更新
- **样式文件**：自动重新编译

### 开发工具

#### 代码格式化

```bash
deno fmt
```

#### 代码检查

```bash
deno lint
```

#### 类型检查

```bash
deno check src/
```

## 构建

### 构建生产版本

```bash
# 构建项目
deno task build

# 构建输出到 dist 目录
```

### 构建配置

在 `dweb.config.ts` 中配置构建选项：

```typescript
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: true,
    target: 'es2022',
  },
});
```

## 部署

### 生产服务器

```bash
# 启动生产服务器
deno task start

# 使用环境变量
DENO_ENV=production deno task start
```

### Docker 部署

```bash
# 构建镜像
docker build -t dweb-app .

# 运行容器
docker run -p 3000:3000 dweb-app
```

详细说明请参考 [Docker 文档](./docker.md)。

## 调试

### 开发模式调试

开发服务器默认启用调试模式，可以在浏览器控制台查看：

- 请求日志
- 错误堆栈
- 组件渲染信息

### 生产模式调试

```typescript
// 启用调试模式
export default defineConfig({
  dev: {
    debug: true,
  },
});
```

### 使用 Deno 调试器

```bash
# 启动调试服务器
deno run --inspect-brk -A main.ts

# 在 Chrome DevTools 中连接
# chrome://inspect
```

## 测试

### 运行测试

```bash
# 运行所有测试
deno test

# 运行特定测试文件
deno test tests/unit/server.test.ts

# 带覆盖率
deno test --coverage=coverage/
```

### 测试结构

```
tests/
├── unit/           # 单元测试
├── integration/    # 集成测试
└── fixtures/       # 测试数据
```

## 性能优化

### 代码分割

框架自动进行代码分割，按路由分割代码。

### 预加载

```typescript
// 预加载关键资源
<link rel="preload" href="/critical.css" as="style">
```

### 缓存策略

```typescript
// 静态资源缓存
export default defineConfig({
  static: {
    maxAge: 3600, // 1 小时
  },
});
```

## 环境变量

### 开发环境

创建 `.env.development`：

```env
PORT=3000
DB_HOST=localhost
DB_NAME=mydb_dev
```

### 生产环境

创建 `.env.production`：

```env
PORT=3000
DB_HOST=prod-db.example.com
DB_NAME=mydb
```

### 使用环境变量

```typescript
// dweb.config.ts
export default defineConfig({
  server: {
    port: parseInt(Deno.env.get('PORT') || '3000'),
  },
  database: {
    connection: {
      host: Deno.env.get('DB_HOST') || 'localhost',
      database: Deno.env.get('DB_NAME') || 'mydb',
    },
  },
});
```

## 常见问题

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3000

# 或修改配置
export default defineConfig({
  server: {
    port: 8080,
  },
});
```

### 模块导入错误

确保 `deno.json` 中配置了正确的导入映射：

```json
{
  "imports": {
    "@dreamer/dweb": "jsr:@dreamer/dweb@^1.0.0"
  }
}
```

### 构建失败

检查：

1. 所有依赖是否正确安装
2. TypeScript 类型错误
3. 配置文件格式是否正确

## 最佳实践

1. **使用 TypeScript**：充分利用类型检查
2. **代码格式化**：保持代码风格一致
3. **错误处理**：使用 try-catch 处理异步错误
4. **日志记录**：使用框架提供的日志功能
5. **环境变量**：敏感信息使用环境变量
6. **测试覆盖**：编写单元测试和集成测试
7. **性能监控**：使用性能监控插件

