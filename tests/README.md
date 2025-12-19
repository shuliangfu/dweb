# DWeb 框架测试文档

## 📋 测试概览

DWeb 框架采用全面的测试策略，确保代码质量和功能稳定性。当前测试覆盖核心功能、中间件、工具函数等关键模块。

### 测试统计

- **测试文件总数：** 18 个
- **测试用例总数：** 142 个
- **当前通过率：** 100% (142/142)
- **测试类型：** 单元测试

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
│   │   └── session.test.ts         # Session 管理 (6 个测试)
│   ├── middleware/         # 中间件测试
│   │   ├── body-parser.test.ts     # 请求体解析 (5 个测试)
│   │   ├── compression.test.ts     # 响应压缩 (5 个测试)
│   │   ├── cors.test.ts            # CORS 跨域 (4 个测试)
│   │   ├── security.test.ts        # 安全中间件 (6 个测试)
│   │   └── static.test.ts          # 静态文件服务 (4 个测试)
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

### 基本命令

```bash
# 运行所有测试
deno task test

# 运行单元测试
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
| RouteHandler | - | - | ⏳ 待测试 |
| API Route | `api-route.test.ts` | 9 | ✅ 通过 |
| Middleware Manager | `middleware.test.ts` | 5 | ✅ 通过 |
| Plugin Manager | `plugin.test.ts` | 12 | ✅ 通过 |
| Config | `config.test.ts` | 8 | ✅ 通过 |

### 功能模块 (Features)

| 模块 | 测试文件 | 测试数量 | 状态 |
|------|---------|---------|------|
| Cookie Manager | `cookie.test.ts` | 7 | ✅ 通过 |
| Session Manager | `session.test.ts` | 6 | ✅ 通过 |
| Dev Server | - | - | ⏳ 待测试 |
| Prod Server | - | - | ⏳ 待测试 |
| Build | - | - | ⏳ 待测试 |
| Create | - | - | ⏳ 待测试 |

### 中间件 (Middleware)

| 模块 | 测试文件 | 测试数量 | 状态 |
|------|---------|---------|------|
| Static Files | `static.test.ts` | 4 | ✅ 通过 |
| Compression | `compression.test.ts` | 5 | ✅ 通过 |
| CORS | `cors.test.ts` | 4 | ✅ 通过 |
| Security | `security.test.ts` | 6 | ✅ 通过 |
| Body Parser | `body-parser.test.ts` | 5 | ✅ 通过 |
| Auth | - | - | ⏳ 待测试 |
| Rate Limit | - | - | ⏳ 待测试 |
| Logger | - | - | ⏳ 待测试 |
| Health | - | - | ⏳ 待测试 |

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
   - `RouteHandler` 完整测试
   - `dev.ts` 和 `prod.ts` 测试
   - `build.ts` 测试
   - `create.ts` 测试

3. **中间件测试**
   - `auth.ts` 认证中间件
   - `rate-limit.ts` 限流中间件
   - `logger.ts` 日志中间件
   - `health.ts` 健康检查

4. **插件测试**
   - Tailwind CSS 插件测试

5. **工具函数测试**
   - `file.ts` 文件工具
   - `import-map.ts` 导入映射
   - `script-client.ts` 客户端脚本
   - `script-hmr.ts` HMR 脚本

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
