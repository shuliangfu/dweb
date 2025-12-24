# 优雅关闭

DWeb 框架提供了优雅关闭功能，确保服务器在关闭时能够正确处理未完成的请求和清理资源。

## 目录结构

```
src/features/
└── shutdown.ts    # 优雅关闭实现
```

## 快速开始

### 基本使用

```typescript
import { setupSignalHandlers, registerShutdownHandler } from "@dreamer/dweb/features/shutdown";
import { Server } from "@dreamer/dweb/core/server";

const server = new Server();

// 设置信号监听器（自动处理 SIGTERM 和 SIGINT）
setupSignalHandlers(server);

// 注册关闭处理器（清理资源）
registerShutdownHandler(async () => {
  console.log("关闭数据库连接...");
  await database.close();
});

registerShutdownHandler(async () => {
  console.log("清理临时文件...");
  await cleanupTempFiles();
});

// 启动服务器
await server.start(3000);
```

## 工作原理

优雅关闭流程包括以下步骤：

1. **停止接收新请求**：服务器停止接受新的连接
2. **等待现有请求完成**：给现有请求一定时间完成处理
3. **执行关闭处理器**：按注册顺序的逆序执行所有关闭处理器
4. **退出进程**：正常退出或错误退出

## API 参考

### 注册关闭处理器

```typescript
registerShutdownHandler(handler: ShutdownHandler): void
```

注册一个关闭处理器，在服务器关闭时执行。

**参数：**
- `handler`: 关闭处理函数，可以是同步或异步函数

**示例：**

```typescript
registerShutdownHandler(async () => {
  // 关闭数据库连接
  await db.close();
  
  // 清理缓存
  await cache.clear();
  
  // 保存状态
  await saveState();
});
```

### 移除关闭处理器

```typescript
unregisterShutdownHandler(handler: ShutdownHandler): void
```

移除已注册的关闭处理器。

**示例：**

```typescript
const handler = async () => {
  await cleanup();
};

registerShutdownHandler(handler);

// 稍后移除
unregisterShutdownHandler(handler);
```

### 设置信号监听器

```typescript
setupSignalHandlers(server?: { close?: () => Promise<void> | void }): void
```

设置系统信号监听器，自动处理 `SIGTERM` 和 `SIGINT` 信号。

**参数：**
- `server`: 服务器实例（可选），如果提供，会在关闭时调用其 `close()` 方法

**示例：**

```typescript
const server = new Server();
setupSignalHandlers(server);
```

### 手动触发优雅关闭

```typescript
gracefulShutdown(
  signal: string,
  server?: { close?: () => Promise<void> | void }
): Promise<void>
```

手动触发优雅关闭流程。

**参数：**
- `signal`: 信号名称（如 "SIGTERM"）
- `server`: 服务器实例（可选）

**示例：**

```typescript
await gracefulShutdown("SIGTERM", server);
```

## 使用示例

### 完整示例

```typescript
import { Server } from "@dreamer/dweb/core/server";
import { setupSignalHandlers, registerShutdownHandler } from "@dreamer/dweb/features/shutdown";
import { Database } from "./database";

const server = new Server();
const database = new Database();

// 注册关闭处理器
registerShutdownHandler(async () => {
  console.log("关闭数据库连接...");
  await database.close();
});

registerShutdownHandler(async () => {
  console.log("关闭 Redis 连接...");
  await redis.quit();
});

registerShutdownHandler(async () => {
  console.log("保存应用状态...");
  await saveApplicationState();
});

// 设置信号监听器
setupSignalHandlers(server);

// 配置服务器
server.setHandler(async (req, res) => {
  res.text("Hello World");
});

// 启动服务器
await server.start(3000);
console.log("服务器运行在 http://localhost:3000");
```

### Docker 环境

在 Docker 容器中，优雅关闭特别重要：

```dockerfile
# Dockerfile
FROM denoland/deno:latest

# 设置信号处理
STOPSIGNAL SIGTERM

# 运行应用
CMD ["deno", "run", "-A", "main.ts"]
```

```typescript
// main.ts
import { setupSignalHandlers } from "@dreamer/dweb/features/shutdown";

const server = new Server();
setupSignalHandlers(server);

await server.start(3000);
```

### 进程管理器

使用 PM2 或其他进程管理器时：

```json
{
  "name": "dweb-app",
  "script": "main.ts",
  "instances": 4,
  "exec_mode": "cluster",
  "kill_timeout": 5000,
  "wait_ready": true
}
```

## 关闭处理器执行顺序

关闭处理器按照**注册顺序的逆序**执行（后注册的先执行）：

```typescript
// 注册顺序
registerShutdownHandler(() => console.log("1"));
registerShutdownHandler(() => console.log("2"));
registerShutdownHandler(() => console.log("3"));

// 执行顺序：3 -> 2 -> 1
```

这样设计是为了确保：
- 最后注册的处理器（通常是关键资源）最先执行
- 先注册的处理器（通常是次要资源）最后执行

## 超时处理

优雅关闭会等待现有请求完成，但不会无限等待：

```typescript
// 默认等待 1 秒
await new Promise(resolve => setTimeout(resolve, 1000));
```

如果需要在更长时间内等待，可以修改 `shutdown.ts` 中的超时时间。

## 最佳实践

1. **注册所有资源清理**：
   - 数据库连接
   - Redis 连接
   - 文件句柄
   - 定时器
   - WebSocket 连接

2. **处理异步操作**：
   - 确保所有异步操作在关闭前完成
   - 使用 `await` 等待异步清理

3. **错误处理**：
   - 关闭处理器中的错误不会阻止其他处理器执行
   - 记录所有错误以便调试

4. **测试优雅关闭**：
   - 在开发环境中测试关闭流程
   - 确保所有资源正确清理

## 注意事项

- 优雅关闭仅在收到 `SIGTERM` 或 `SIGINT` 信号时触发
- 强制终止（`SIGKILL`）无法被捕获，不会执行关闭处理器
- 确保关闭处理器不会执行过长时间的操作
- 在生产环境中，确保进程管理器配置了合理的超时时间

## 相关文档

- [开发服务器](./dev.md) - 开发模式服务器
- [生产服务器](./prod.md) - 生产模式服务器
- [性能监控](./monitoring.md) - 性能监控功能

