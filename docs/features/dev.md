## 开发流程

### 启动开发服务器

#### 开发体验优化

*   **智能 HMR**：
    基于 WebSocket 的即时热更新机制，支持 CSS 毫秒级更新和组件状态保留，修改代码无需手动刷新浏览器。

*   **自动 TLS**：
    开发环境自动生成自签名证书，一键开启 HTTPS 调试，方便测试 HTTP/2 和 Service Worker 等特性。

*   **惰性启动**：
    路由和中间件采用按需加载策略，即使在大型项目中也能保持秒级启动速度。

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
