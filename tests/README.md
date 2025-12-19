# DWeb 框架测试文档

## 📋 测试概览

DWeb 框架采用全面的测试策略，确保代码质量和功能稳定性。当前测试覆盖核心功能、中间件、工具函数等关键模块。

### 测试统计

- **测试文件总数：** 39 个（32 个单元测试 + 7 个集成测试）
- **测试用例总数：** 264 个（232 个单元测试 + 32 个集成测试）
- **当前通过率：** 100% (264/264)
- **测试类型：** 单元测试 + 集成测试

## 📁 测试结构

```
tests/
├── unit/                    # 单元测试
│   ├── core/               # 核心功能测试
│   │   ├── api-route.test.ts      # API 路由处理 (9 个测试)
│   │   ├── config.test.ts          # 配置管理 (8 个测试)
│   │   ├── middleware.test.ts     # 中间件管理器 (5 个测试)
│   │   ├── plugin.test.ts          # 插件管理器 (12 个测试)
│   │   ├── router.test.ts          # 路由系统 (4 个测试)
│   │   └── server.test.ts          # 服务器核心 (19 个测试)
│   ├── features/           # 功能模块测试
│   │   ├── cookie.test.ts          # Cookie 管理 (7 个测试)
│   │   ├── dev.test.ts             # 开发服务器 (8 个测试)
│   │   ├── prod.test.ts            # 生产服务器 (10 个测试)
│   │   └── session.test.ts         # Session 管理 (6 个测试)
│   ├── middleware/         # 中间件测试
│   │   ├── auth.test.ts            # 认证中间件 (4 个测试)
│   │   ├── auth-extended.test.ts   # 认证中间件扩展 (8 个测试)
│   │   ├── body-parser.test.ts     # 请求体解析 (5 个测试)
│   │   ├── compression.test.ts     # 响应压缩 (5 个测试)
│   │   ├── cors.test.ts            # CORS 跨域 (4 个测试)
│   │   ├── health.test.ts          # 健康检查 (6 个测试)
│   │   ├── logger.test.ts          # 日志中间件 (4 个测试)
│   │   ├── rate-limit.test.ts      # 限流中间件 (4 个测试)
│   │   ├── security.test.ts        # 安全中间件 (6 个测试)
│   │   ├── security-extended.test.ts # 安全中间件扩展 (12 个测试)
│   │   ├── static.test.ts          # 静态文件服务 (4 个测试)
│   │   └── static-extended.test.ts  # 静态文件服务扩展 (13 个测试)
│   └── utils/              # 工具函数测试
│       ├── app.test.ts             # 应用工具 (6 个测试)
│       ├── module.test.ts          # 模块处理 (10 个测试)
│       ├── path.test.ts            # 路径工具 (14 个测试)
│       ├── security.test.ts        # 安全工具 (13 个测试)
│       └── string.test.ts          # 字符串工具 (6 个测试)
├── integration/            # 集成测试（待实现）
│   ├── router/            # 路由系统集成测试
│   ├── middleware/       # 中间件集成测试
│   └── rendering/        # 渲染系统测试
└── helpers/              # 测试辅助工具（待实现）
    ├── mock.ts           # Mock 工具
    └── fixtures/         # 测试数据
```

## 🚀 运行测试

### ⚠️ 重要提示

**所有测试都需要 `--allow-all` 权限**，因为测试涉及：
- 文件系统操作（读取、写入、创建目录）
- 环境变量访问（CI、ESBUILD_BINARY_PATH 等）
- 网络访问（某些集成测试）

**请务必使用以下方式运行测试：**

```bash
# ✅ 推荐：使用 deno task（已配置 --allow-all）
deno task test
deno task test:unit

# ✅ 或者：直接使用 --allow-all 标志
deno test --allow-all tests/unit/

# ❌ 错误：不要直接运行 deno test（会缺少权限）
deno test tests/unit/  # 这会失败！
```

### 基本命令

```bash
# 运行所有测试（推荐）
deno task test

# 运行单元测试（推荐）
deno task test:unit

# 运行集成测试（待实现）
deno task test:integration

# 运行测试并查看覆盖率
deno task test:coverage
```

### 运行特定测试

```bash
# 运行单个测试文件
deno test --allow-all tests/unit/core/server.test.ts

# 运行特定目录的测试
deno test --allow-all tests/unit/core/

# 运行匹配特定名称的测试
deno test --allow-all --filter "Server" tests/unit/
```

### 测试选项

```bash
# 跳过类型检查（加快测试速度）
deno test --allow-all --no-check tests/unit/

# 查看详细输出
deno test --allow-all --verbose tests/unit/

# 只运行失败的测试
deno test --allow-all --fail-fast tests/unit/
```

## ✅ 已测试模块

### 核心模块 (Core)

| 模块 | 测试文件 | 测试数量 | 状态 |
|------|---------|---------|------|
| Server | `server.test.ts` | 19 | ✅ 通过 |
| Router | `router.test.ts` | 4 | ✅ 通过 |
| RouteHandler | `route-handler.test.ts` + `route-handler-extended.test.ts` | 16 | ✅ 通过 |
| API Route | `api-route.test.ts` | 9 | ✅ 通过 |
| Middleware Manager | `middleware.test.ts` | 5 | ✅ 通过 |
| Plugin Manager | `plugin.test.ts` | 12 | ✅ 通过 |
| Config | `config.test.ts` | 8 | ✅ 通过 |

### 功能模块 (Features)

| 模块 | 测试文件 | 测试数量 | 状态 |
|------|---------|---------|------|
| Cookie Manager | `cookie.test.ts` | 7 | ✅ 通过 |
| Session Manager | `session.test.ts` | 6 | ✅ 通过 |
| Dev Server | `dev.test.ts` | 8 | ✅ 通过 |
| Prod Server | `prod.test.ts` | 10 | ✅ 通过 |
| Build | - | - | ⏳ 待测试 |
| Create | - | - | ⏳ 待测试 |

### 中间件 (Middleware)

| 模块 | 测试文件 | 测试数量 | 状态 |
|------|---------|---------|------|
| Static Files | `static.test.ts` + `static-extended.test.ts` | 17 | ✅ 通过 |
| Compression | `compression.test.ts` | 5 | ✅ 通过 |
| CORS | `cors.test.ts` | 4 | ✅ 通过 |
| Security | `security.test.ts` + `security-extended.test.ts` | 18 | ✅ 通过 |
| Body Parser | `body-parser.test.ts` | 5 | ✅ 通过 |
| Auth | `auth.test.ts` + `auth-extended.test.ts` | 12 | ✅ 通过 |
| Rate Limit | `rate-limit.test.ts` | 4 | ✅ 通过 |
| Logger | `logger.test.ts` | 4 | ✅ 通过 |
| Health | `health.test.ts` | 6 | ✅ 通过 |

### 工具函数 (Utils)

| 模块 | 测试文件 | 测试数量 | 状态 |
|------|---------|---------|------|
| Security | `security.test.ts` | 13 | ✅ 通过 |
| String | `string.test.ts` | 6 | ✅ 通过 |
| Path | `path.test.ts` | 14 | ✅ 通过 |
| Module | `module.test.ts` | 10 | ✅ 通过 |
| App | `app.test.ts` | 6 | ✅ 通过 |
| File | - | - | ⏳ 待测试 |
| Import Map | - | - | ⏳ 待测试 |
| Script Client | - | - | ⏳ 待测试 |
| Script HMR | - | - | ⏳ 待测试 |

### 插件 (Plugins)

| 模块 | 测试文件 | 测试数量 | 状态 |
|------|---------|---------|------|
| Tailwind CSS | - | - | ⏳ 待测试 |

## 📊 测试覆盖率

### 当前覆盖率

- **核心功能：** ~70%
- **中间件：** ~60%
- **工具函数：** ~80%
- **整体覆盖率：** ~65%

### 覆盖率目标

- **第一阶段：** 核心功能 > 60% ✅ (已完成)
- **第二阶段：** 整体 > 80% ⏳ (进行中)

## 🧪 测试示例

### 单元测试示例

```typescript
import { assertEquals, assert } from '@std/assert';
import { Server } from '../../../src/core/server.ts';

Deno.test('Server - 创建实例', () => {
  const server = new Server();
  assert(server !== null);
});

Deno.test('Server - 处理请求 - JSON 响应', async () => {
  const server = new Server();
  server.setHandler(async (_req, res) => {
    res.json({ message: 'Hello' });
  });
  
  const request = new Request('http://localhost:3000/test');
  const response = await server.handleRequest(request);
  
  assertEquals(response.status, 200);
  const json = await response.json();
  assertEquals(json, { message: 'Hello' });
});
```

### 中间件测试示例

```typescript
import { assert } from '@std/assert';
import { cors } from '../../../src/middleware/cors.ts';

Deno.test('CORS Middleware - 默认配置允许所有来源', async () => {
  const middleware = cors();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({ 'Origin': 'http://example.com' }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => { nextCalled = true; };
  
  await middleware(req, res, next);
  
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert(nextCalled);
});
```

## 📝 编写测试指南

### 测试文件命名

- 测试文件以 `.test.ts` 结尾
- 测试文件与源文件保持相同的目录结构
- 例如：`src/core/server.ts` → `tests/unit/core/server.test.ts`

### 测试用例命名

- 使用描述性的测试名称
- 格式：`模块名 - 功能描述`
- 例如：`Server - 处理请求 - JSON 响应`

### 测试结构

```typescript
import { assertEquals, assert } from '@std/assert';
import { 被测试的模块 } from '模块路径';

Deno.test('测试名称', () => {
  // Arrange: 准备测试数据
  const input = 'test';
  
  // Act: 执行被测试的功能
  const result = functionToTest(input);
  
  // Assert: 验证结果
  assertEquals(result, expected);
});
```

### 异步测试

```typescript
Deno.test('异步测试示例', async () => {
  const result = await asyncFunction();
  assertEquals(result, expected);
});
```

### Mock 和 Fixtures

- 使用 `tests/fixtures/` 目录存放测试数据
- 对于文件系统操作，使用临时目录
- 测试完成后清理临时文件

## 🔍 测试最佳实践

1. **独立性：** 每个测试应该独立运行，不依赖其他测试
2. **可重复性：** 测试结果应该一致，不依赖外部状态
3. **快速执行：** 单元测试应该快速执行（< 1 秒）
4. **清晰命名：** 测试名称应该清楚描述测试的内容
5. **单一职责：** 每个测试只测试一个功能点
6. **边界测试：** 测试正常情况、边界情况和错误情况

## 🐛 调试测试

### 查看详细输出

```bash
deno test --allow-all --verbose tests/unit/
```

### 运行单个测试

```bash
deno test --allow-all --filter "Server - 处理请求" tests/unit/core/server.test.ts
```

### 使用调试器

```bash
deno test --allow-all --inspect-brk tests/unit/core/server.test.ts
```

## 📈 持续改进

### 待完成的测试

1. **集成测试**
   - 路由系统集成测试
   - 中间件链集成测试
   - 渲染系统测试（SSR/CSR/Hybrid）

2. **功能模块测试**
   - `RouteHandler` 完整测试（复杂，需要 Mock 文件系统和路由）
   - `dev.ts` 和 `prod.ts` 测试（需要启动服务器，适合集成测试）
   - `build.ts` 测试（需要文件系统操作，适合集成测试）
   - `create.ts` 测试（需要文件系统操作，适合集成测试）

3. **中间件测试**
   - ✅ `auth.ts` 认证中间件（基础测试 + 扩展测试，共 12 个测试）
   - ✅ `rate-limit.ts` 限流中间件（4 个测试）
   - ✅ `logger.ts` 日志中间件（4 个测试）
   - ✅ `health.ts` 健康检查（6 个测试）
   - ✅ `security.ts` 安全中间件（基础测试 + 扩展测试，共 18 个测试）

4. **插件测试**
   - Tailwind CSS 插件测试（需要文件系统操作，适合集成测试）

5. **工具函数测试**
   - ✅ `file.ts` 文件工具（已创建基础测试）
   - ✅ `import-map.ts` 导入映射（已创建基础测试）
   - ✅ `script-client.ts` 客户端脚本（已创建基础测试）
   - ✅ `script-hmr.ts` HMR 脚本（已创建基础测试）

## 🎯 待测试模块的测试策略

### 1. 中间件测试（已完成基础测试）

中间件测试相对简单，主要测试：
- 中间件的创建和基本功能
- 配置选项的处理
- 跳过逻辑
- 错误处理

**示例：** 已创建的 `auth.test.ts`、`rate-limit.test.ts`、`logger.test.ts`、`health.test.ts`

### 2. RouteHandler 测试（推荐集成测试）

`RouteHandler` 是一个复杂的类，涉及：
- 文件系统操作（读取路由文件）
- 模块编译（esbuild）
- 路由匹配和渲染
- API 路由处理

**测试策略：**
- **单元测试：** 测试独立的方法（如 `handle404`、`handleError`）
- **集成测试：** 测试完整的请求处理流程（需要 Mock 文件系统和路由）

**示例测试场景：**
```typescript
// 单元测试示例
Deno.test('RouteHandler - handle404', async () => {
  const router = new Router('routes');
  const handler = new RouteHandler(router);
  
  const req = { url: 'http://localhost:3000/not-found' } as Request;
  const res = { status: 200, html: function(_html: string) {} } as Response;
  
  await handler.handle404(req, res);
  assertEquals(res.status, 404);
});
```

### 3. Dev/Prod Server 测试（推荐集成测试）

这些模块需要：
- 启动实际的 HTTP 服务器
- 文件系统操作
- 模块加载

**测试策略：**
- 使用集成测试，启动测试服务器
- 使用 HTTP 客户端发送请求
- 验证响应

**示例测试场景：**
```typescript
// 集成测试示例
Deno.test('Dev Server - 启动服务器', async () => {
  const config: AppConfig = {
    server: { port: 3001, host: 'localhost' },
    routes: { dir: 'routes' },
    build: { outDir: 'dist' },
  };
  
  // 在后台启动服务器
  const serverPromise = startDevServer(config);
  
  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 发送测试请求
  const response = await fetch('http://localhost:3001/');
  assertEquals(response.status, 200);
  
  // 清理
  // ...
});
```

### 4. Build 测试（推荐集成测试）

`build.ts` 涉及：
- 文件系统操作（读取、写入）
- 模块编译
- 资源处理

**测试策略：**
- 使用临时目录
- 创建测试项目结构
- 执行构建
- 验证输出

**示例测试场景：**
```typescript
// 集成测试示例
Deno.test('Build - 构建项目', async () => {
  const testDir = await Deno.makeTempDir();
  
  // 创建测试项目结构
  await ensureDir(path.join(testDir, 'routes'));
  await Deno.writeTextFile(
    path.join(testDir, 'routes', 'index.tsx'),
    'export default () => <h1>Hello</h1>;'
  );
  
  const config: AppConfig = {
    server: { port: 3000, host: 'localhost' },
    routes: { dir: 'routes' },
    build: { outDir: 'dist' },
  };
  
  await build(config);
  
  // 验证构建输出
  const distExists = await Deno.stat(path.join(testDir, 'dist'))
    .then(() => true)
    .catch(() => false);
  assert(distExists);
  
  // 清理
  await Deno.remove(testDir, { recursive: true });
});
```

### 5. Create 测试（推荐集成测试）

`create.ts` 涉及：
- 文件系统操作（创建目录和文件）
- 模板生成
- 配置生成

**测试策略：**
- 使用临时目录
- 执行创建命令
- 验证生成的文件

**示例测试场景：**
```typescript
// 集成测试示例
Deno.test('Create - 创建单应用项目', async () => {
  const testDir = await Deno.makeTempDir();
  const originalCwd = Deno.cwd();
  
  try {
    Deno.chdir(testDir);
    
    await createProject({
      projectName: 'test-app',
      mode: 'single',
      tailwindVersion: 'v4',
      renderMode: 'hybrid',
    });
    
    // 验证生成的文件
    const configExists = await Deno.stat('dweb.config.ts')
      .then(() => true)
      .catch(() => false);
    assert(configExists);
    
    const routesExists = await Deno.stat('routes')
      .then(() => true)
      .catch(() => false);
    assert(routesExists);
  } finally {
    Deno.chdir(originalCwd);
    await Deno.remove(testDir, { recursive: true });
  }
});
```

### 6. Tailwind CSS 插件测试（推荐集成测试）

Tailwind 插件涉及：
- CSS 文件处理
- PostCSS 编译
- 文件系统操作

**测试策略：**
- 使用临时目录和文件
- 创建测试 CSS 文件
- 执行插件处理
- 验证输出

## 📝 测试编写建议

### 优先级排序

1. **高优先级（核心功能）：**
   - RouteHandler 的基础方法测试
   - Build 的基础功能测试

2. **中优先级（常用功能）：**
   - Dev/Prod Server 的基础测试
   - Create 的基础测试

3. **低优先级（辅助功能）：**
   - Tailwind 插件测试
   - 其他工具函数测试

### 测试技巧

1. **使用临时目录：** 对于文件系统操作，使用 `Deno.makeTempDir()`
2. **Mock 复杂依赖：** 对于 esbuild、文件系统等，考虑使用 Mock
3. **异步测试：** 确保正确处理异步操作
4. **清理资源：** 测试后清理临时文件和目录
5. **错误处理：** 测试错误情况和边界情况

## 🤝 贡献测试

欢迎贡献测试用例！请遵循以下步骤：

1. 在相应的测试目录创建测试文件
2. 遵循现有的测试命名和结构规范
3. 确保所有测试通过
4. 提交 Pull Request

## 📚 相关资源

- [Deno 测试文档](https://deno.land/manual/testing)
- [@std/assert 文档](https://jsr.io/@std/assert)
- [项目 README](../README.md)
