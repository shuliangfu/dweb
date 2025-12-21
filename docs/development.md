# 开发指南

DWeb 框架开发指南，包括项目创建、开发流程、构建部署等。

## 项目创建

### 使用 CLI 创建项目

```bash
# 交互式创建项目（会提示输入项目名称和配置选项）
deno run -A jsr:@dreamer/dweb/init

# 指定项目名称（跳过名称输入，直接使用提供的名称）
deno run -A jsr:@dreamer/dweb/init my-app
```

**创建过程说明：**

1. **项目名称输入**：如果未提供项目名称，会提示输入（只允许字母、数字、连字符和下划线）
2. **应用模式选择**：
   - **单应用模式**（默认）：适合简单的单页面应用或 API 服务
   - **多应用模式**：适合需要多个独立应用的场景（如前端 + 后端）
3. **Tailwind CSS 版本选择**：
   - **V4（推荐）**：最新版本，性能更好
   - **V3**：稳定版本，兼容性更好
4. **渲染模式选择**：
   - **SSR（服务端渲染）**：所有页面在服务端渲染，SEO 友好
   - **CSR（客户端渲染）**：所有页面在客户端渲染，交互性强
   - **Hybrid（混合渲染）**（默认）：根据路由自动选择渲染方式

### 项目结构

创建的项目结构如下：

```
my-app/
├── routes/              # 路由目录
│   ├── index.tsx        # 首页
│   ├── about.tsx        # 关于页面
│   └── api/             # API 路由（默认在 routes/api，可通过 apiDir 配置）
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
// createApp() 函数签名：
// function createApp(): App
// 
// 返回值 App 接口包含：
// - server: Server - 服务器实例
// - middleware: MiddlewareManager - 中间件管理器
// - plugins: PluginManager - 插件管理器
// - use(middleware: Middleware | MiddlewareConfig): void - 添加中间件
// - plugin(plugin: Plugin | { name: string; config?: Record<string, unknown> }): void - 注册插件
const app = createApp();

// 配置中间件
// app.use() 方法可以接受：
// 1. 中间件函数：app.use((req, res, next) => { ... })
// 2. 中间件配置对象：app.use({ name: 'cors', options: { ... } })
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
// app.plugin() 方法可以接受：
// 1. 插件对象：app.plugin({ name: 'my-plugin', setup: (app) => { ... } })
// 2. 插件配置对象：app.plugin({ name: 'my-plugin', config: { ... } })
// app.plugin(customPlugin);

// 导出应用实例
// 框架会自动检测并加载导出的应用实例
export default app;
```

**使用说明：**
- 如果存在 `main.ts` 文件，框架会自动加载并应用其中的配置
- 如果不存在 `main.ts` 文件，框架会使用 `dweb.config.ts` 中的配置
- `main.ts` 主要用于需要编程式配置的场景，如动态添加中间件或插件
- 在多应用模式下，每个应用可以有自己的 `main.ts` 文件（位于应用目录下）

## 开发流程

### 启动开发服务器

#### 单应用模式

```bash
# 启动开发服务器（默认端口 3000）
deno task dev

# 或使用 CLI 命令
deno run -A src/cli.ts dev

# 指定端口（通过配置文件或环境变量）
# 在 dweb.config.ts 中配置：
# server: { port: 8080 }
```

#### 多应用模式

```bash
# 启动所有应用
deno task dev

# 启动指定应用（使用应用名称）
deno run -A src/cli.ts dev:app-name

# 或在 deno.json 中配置任务别名
# "dev:app-name": "deno run -A src/cli.ts dev:app-name"
```

**命令格式说明：**
- `dev` - 单应用模式，启动默认应用
- `dev:app-name` - 多应用模式，启动指定名称的应用
- 应用名称必须与 `dweb.config.ts` 中 `apps` 配置的键名一致

**开发服务器特性：**
- 自动热更新（HMR）：修改代码后自动重新加载
- 自动路由扫描：自动发现 `routes/` 目录下的路由文件
- 自动加载中间件和插件：从 `main.ts` 或配置文件中加载
- 错误提示：详细的错误信息和堆栈跟踪

### 热更新 (HMR)

开发服务器支持热更新，修改代码后自动刷新：

- **服务端组件**：自动重新加载
- **客户端组件**：通过 WebSocket 推送更新
- **样式文件**：自动重新编译

### 开发工具

#### 代码格式化

```bash
# 格式化所有文件
deno fmt

# 格式化指定文件或目录
deno fmt src/
deno fmt routes/index.tsx

# 检查格式（不修改文件）
deno fmt --check
```

#### 代码检查

```bash
# 检查所有文件
deno lint

# 检查指定文件或目录
deno lint src/
deno lint routes/

# 自动修复可修复的问题
deno lint --fix
```

#### 类型检查

```bash
# 检查所有 TypeScript 文件
deno check

# 检查指定文件或目录
deno check src/
deno check routes/

# 检查特定文件
deno check main.ts
```

#### 其他有用的命令

```bash
# 查看依赖树
deno info

# 查看特定模块的信息
deno info jsr:@dreamer/dweb

# 清理 Deno 缓存
deno cache --reload

# 查看任务列表（deno.json 中定义的）
deno task
```

## 构建

### 构建生产版本

#### 单应用模式

```bash
# 构建项目
deno task build

# 或使用 CLI 命令
deno run -A src/cli.ts build
```

#### 多应用模式

```bash
# 构建所有应用
deno task build

# 构建指定应用
deno run -A src/cli.ts build:app-name
```

### 构建配置

在 `dweb.config.ts` 中配置构建选项：

```typescript
export default defineConfig({
  build: {
    // 输出目录
    outDir: 'dist',
    
    // 是否生成 source map（用于调试）
    sourcemap: true,
    
    // 是否压缩代码
    minify: true,
    
    // 目标 JavaScript 版本
    target: 'es2022',
    
    // 其他选项
    // assetsDir: 'assets',      // 静态资源目录
    // publicDir: 'public',      // 公共文件目录
    // emptyOutDir: true,        // 构建前清空输出目录
  },
});
```

**构建输出结构：**
```
dist/
├── routes/          # 编译后的路由文件
├── assets/          # 静态资源
├── public/          # 公共文件（直接复制）
└── index.js         # 入口文件（如果存在）
```

## 部署

### 生产服务器

#### 单应用模式

```bash
# 启动生产服务器
deno task start

# 或使用 CLI 命令
deno run -A src/cli.ts start

# 使用环境变量指定环境
DENO_ENV=production deno task start
```

#### 多应用模式

```bash
# 启动所有应用
deno task start

# 启动指定应用
deno run -A src/cli.ts start:app-name
```

**生产服务器特性：**
- 优化的性能：代码已编译和压缩
- 静态资源缓存：配置的缓存策略生效
- 错误处理：生产环境友好的错误信息
- 日志记录：可配置的日志级别和输出

**环境变量：**
- `DENO_ENV` - 环境名称（development、production 等）
- `PORT` - 服务器端口（会覆盖配置文件中的设置）
- 其他自定义环境变量可在配置文件中通过 `Deno.env.get()` 获取

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

Deno 内置了调试器支持，可以使用 Chrome DevTools 进行调试。

#### 启动调试服务器

```bash
# 方式1：如果有 main.ts 文件（不推荐，因为框架会自动管理服务器）
deno run --inspect-brk -A main.ts

# 方式2：使用 CLI 命令（推荐）
deno run --inspect-brk -A src/cli.ts dev

# 方式3：使用 JSR 包（如果从 JSR 安装）
deno run --inspect-brk -A jsr:@dreamer/dweb/cli dev

# 方式4：指定调试端口
deno run --inspect=127.0.0.1:9229 -A src/cli.ts dev
```

#### 连接调试器

1. **Chrome DevTools**：
   - 打开 Chrome 浏览器
   - 访问 `chrome://inspect`
   - 点击 "Open dedicated DevTools for Node"
   - 在 "Remote Target" 中可以看到 Deno 进程，点击 "inspect"

2. **VS Code**：
   - 创建 `.vscode/launch.json` 配置：
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Deno: Debug",
         "type": "node",
         "request": "launch",
         "cwd": "${workspaceFolder}",
         "runtimeExecutable": "deno",
         "runtimeArgs": ["run", "--inspect-brk", "-A", "src/cli.ts", "dev"],
         "outputCapture": "std",
         "port": 9229
       }
     ]
   }
   ```
   - 按 F5 启动调试

**调试选项说明：**
- `--inspect` - 启动调试服务器，不中断执行
- `--inspect-brk` - 启动调试服务器并在第一行代码处中断
- `--inspect=host:port` - 指定调试服务器地址和端口

## 测试

### 运行测试

```bash
# 运行所有测试
deno test

# 运行特定测试文件
deno test tests/unit/server.test.ts

# 运行匹配模式的测试
deno test --filter "server"

# 带覆盖率
deno test --coverage=coverage/

# 查看覆盖率报告
deno coverage coverage/

# 并行运行测试（默认）
deno test --parallel

# 串行运行测试
deno test --serial

# 只运行失败的测试
deno test --reload --failfast
```

### 测试结构

```
tests/
├── unit/           # 单元测试
│   ├── server.test.ts
│   ├── router.test.ts
│   └── middleware.test.ts
├── integration/    # 集成测试
│   ├── api.test.ts
│   └── routes.test.ts
└── fixtures/       # 测试数据
    ├── users.json
    └── config.json
```

### 编写测试示例

```typescript
// tests/unit/server.test.ts
import { assertEquals } from '@std/assert';
import { Server } from '@dreamer/dweb/core/server';

Deno.test('Server should start on specified port', async () => {
  const server = new Server();
  server.setHandler(async (req, res) => {
    res.text('Hello');
  });
  
  await server.start(3000);
  
  // 测试请求
  const response = await fetch('http://localhost:3000');
  const text = await response.text();
  
  assertEquals(text, 'Hello');
  
  await server.close();
});
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

---

## 📚 相关文档

### 核心文档
- [文档总览](./README.md)
- [核心模块](./core.md)
- [配置文档](./configuration.md)
- [开发指南](./development.md)

### 功能模块
- [数据库](./database.md)
- [GraphQL](./graphql.md)
- [WebSocket](./websocket.md)
- [Session](./session.md)
- [Cookie](./cookie.md)
- [Logger](./logger.md)

### 扩展模块
- [中间件](./middleware.md)
- [插件](./plugins.md)

### 部署与运维
- [Docker 部署](./docker.md)

