# DWeb 框架分析与优化报告

## 1. 框架架构概览

经过对 `src` 目录的深度分析，该框架是一个基于 Deno 的现代 Web 框架，采用了清晰的分层架构：

### 核心层 (`src/core`)
- **Server (`server.ts`)**: 基于 Deno 原生 `Deno.serve` 实现 HTTP 服务，封装了统一的 `Request`/`Response` 对象。
- **Router (`router.ts`)**: 实现了**文件系统路由 (File-system Routing)**，支持：
  - 动态路由 (`[id].tsx`, `[...slug].tsx`)
  - API 路由 (`api/`)
  - 布局系统 (`_layout.tsx`)
- **RouteHandler (`route-handler.ts`)**: 核心调度器，负责：
  - 请求分发与路由匹配
  - 模块加载 (Dynamic Import)
  - 数据加载 (`load` 函数执行)
  - 渲染策略 (SSR/CSR/Hybrid)
  - 客户端代码转换 (TSX -> JS)

### 功能层 (`src/features`)
- **Build (`build.ts`)**: 生产环境构建系统，集成了 `esbuild`，处理：
  - 代码分割 (Code Splitting)
  - Tree-shaking (移除服务端代码)
  - Hash 文件名生成
  - JSR/NPM 依赖解析
- **Session (`session.ts`)**: 支持多端存储的会话管理。
- **Dev/HMR**: 开发服务器支持热模块替换。

### 工具层 (`src/utils`)
- **Esbuild (`esbuild.ts`)**: 封装了编译器逻辑，实现了自定义插件来处理 Deno 特有的 `jsr:` 和 `npm:` 协议，使其兼容浏览器环境。

---

## 2. 性能优化 (Runtime Performance)

### 2.1. 开发环境编译缓存 (High Priority) ✅
**现状**：目前 `RouteHandler.handleModuleRequest` 在开发模式下每次请求都完整重新编译文件，无内存缓存。即使文件未修改，也会执行读取、解析、esbuild 编译的全过程。
**优化方案**：
- 实现 **LRU (Least Recently Used) 内存缓存**。
- **Key**: 文件路径
- **Value**: `{ mtime: number, code: string, hash: string }`
- **流程**: 请求到达 -> 检查文件 `mtime` -> 若未变更直接返回内存中的 `code` -> 若变更则重新编译并更新缓存。
**收益**：热更新响应时间从 几十ms 降至 **<1ms**。

### 2.2. 路由匹配算法 (Radix Tree) ✅
**现状**：`Router.match` 使用线性扫描 ($O(N)$) 和正则匹配。API 路由甚至在每次请求时都会执行排序操作。
**优化方案**：
- 引入 **Radix Tree (前缀树)** 数据结构存储路由。
- 将路由注册到树中。
**收益**：路由匹配复杂度降低为 **$O(K)$** (K 为 URL 长度)，与路由总数无关，在大规模路由下性能显著提升。

### 2.3. 静态资源流式传输与压缩
**现状**：`src/middleware/static.ts` 使用 `Deno.readFile` 一次性读取文件到内存，且不支持 Gzip/Brotli 压缩。
**优化方案**：
- 使用 `Deno.open` 配合 `readable` 流式传输，降低内存占用。
- 引入 `CompressionStream` 实现 Gzip/Brotli 动态压缩，根据 `Accept-Encoding` 头自动选择。
**收益**：显著降低大文件传输时的内存峰值，减少传输流量。

### 2.4. HTML 注入优化
**现状**：`RouteHandler.injectScripts` 使用多次 `String.replace` 和正则表达式将脚本注入到 HTML 中。对于大型 HTML 页面，频繁的字符串拷贝和正则扫描会消耗大量内存和 CPU。
**优化方案**：
- 在 `renderToString` 后，定位 `</head>` 和 `</body>` 的索引位置。
- 使用字符串拼接 (或 Buffer) 一次性插入所有脚本，避免多次全量扫描。
**收益**：减少 CPU 消耗和内存分配。

---

## 3. 代码优化 (Code Quality & Maintainability)

### 3.1. 类型安全增强
**现状**：`src/types/index.ts` 中部分类型（如 `ComponentChild`）使用了 `any`，Session 数据类型定义不一致。
**优化方案**：
- 消除关键路径上的 `any` 使用，使用更精确的联合类型。
- 统一 `SessionData` 的泛型定义，提供更强的类型推断。

### 3.2. 错误处理内容协商
**现状**：`error-handler.ts` 始终返回 JSON 格式错误，即使用户在浏览器中直接访问也是如此。
**优化方案**：
- 根据请求头 `Accept` 自动判断：
  - 如果是 `text/html`，返回渲染好的 HTML 错误页面。
  - 如果是 `application/json`，返回 JSON 错误信息。
**收益**：提升用户体验，特别是对于非 API 请求。

### 3.3. 中间件执行健壮性
**现状**：简单的递归调用，缺乏保护机制。
**优化方案**：
- 添加标志位，防止在一个中间件中多次调用 `next()`。
- 考虑添加中间件执行超时机制，防止某个中间件卡死导致请求挂起。

### 3.4. Session 存储优化
**现状**：`MemorySessionStore` 使用 `setInterval` 清理，`RedisSessionStore` 使用动态导入且缺乏类型。
**优化方案**：
- 优化内存清理策略，可以使用惰性清理（访问时检查过期）配合定时清理。
- 规范化 Redis 客户端依赖管理，提供明确的类型定义。

---

## 4. 模块解析与执行优化 (针对特定需求)

**分析**：关于"解析页面上任意方法并在编译时执行替换"的需求。
如果直接在运行时无缓存地执行复杂的 AST 解析和 `eval`，会严重拖慢开发服务器。

**建议**：
- **必须**配合 **2.1 编译缓存** 一起实现。
- 仅在文件内容发生变化时，才进行静态分析和执行。
- 将解析和执行的结果缓存起来。
- 流程：检查缓存 -> (未命中) -> 解析 AST -> 提取方法 -> 执行方法 -> 替换代码 -> **存入缓存** -> 返回代码。

---

## 5. 总结

框架核心架构设计良好，但在**大规模应用场景**下的性能（路由、静态资源）和**开发体验**（编译速度）方面有明确的提升空间。

**优先级建议**：
1.  **开发环境编译缓存** (立竿见影的 DX 提升)
2.  **HTML 注入优化** (低成本，高性能收益)
3.  **静态资源流式传输** (提升稳定性)
4.  **路由 Radix Tree** (针对大规模项目)
