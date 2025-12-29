# WebSocket 模块

DWeb 框架提供了完整的 WebSocket 支持，包括服务器端和客户端实现。

## 目录结构

```
src/features/websocket/
├── server.ts      # WebSocket 服务器
├── client.ts      # WebSocket 客户端
├── access.ts      # 访问辅助函数
├── types.ts       # 类型定义
└── mod.ts         # 模块导出
```

## 快速开始

### 创建 WebSocket 服务器

```typescript
import { WebSocketServer } from "@dreamer/dweb";
import { Server } from "@dreamer/dweb";

const server = new Server();
const wsServer = new WebSocketServer({
  path: "/ws",
  handlers: {
    onConnect: (conn) => {
      console.log("客户端连接:", conn.id);
      // 发送欢迎消息
      conn.send({ type: "welcome", message: "欢迎连接" });
    },
    onMessage: (conn, msg) => {
      console.log("收到消息:", msg);
      // 广播消息给所有客户端
      wsServer.broadcast({ type: "message", data: msg });
    },
    onClose: (conn) => {
      console.log("客户端断开:", conn.id);
    },
    onError: (conn, error) => {
      console.error("连接错误:", error);
    },
  },
});

// 在 HTTP 请求处理中升级连接
server.setHandler(async (req, res) => {
  if (req.path === "/ws") {
    const upgrade = wsServer.handleUpgrade(req);
    if (upgrade) {
      return upgrade;
    }
  }
  res.text("Not Found", 404);
});
```

### 使用访问辅助函数

```typescript
import {
  getWebSocketServer,
  initWebSocket,
} from "@dreamer/dweb";

// 初始化 WebSocket
await initWebSocket({
  path: "/ws",
  handlers: {
    onConnect: (conn) => console.log("连接:", conn.id),
    onMessage: (conn, msg) => console.log("消息:", msg),
  },
});

// 获取 WebSocket 服务器实例
const wsServer = getWebSocketServer();
wsServer.broadcast({ type: "notification", message: "系统通知" });
```

### WebSocket 客户端

```typescript
import { WebSocketClient } from "@dreamer/dweb";

const client = new WebSocketClient({
  url: "ws://localhost:3000/ws",
  handlers: {
    onOpen: () => {
      console.log("连接已建立");
      client.send({ type: "hello", message: "Hello Server" });
    },
    onMessage: (msg) => {
      console.log("收到消息:", msg);
    },
    onClose: () => {
      console.log("连接已关闭");
    },
    onError: (error) => {
      console.error("连接错误:", error);
    },
  },
});

// 连接
await client.connect();

// 发送消息
client.send({ type: "chat", message: "Hello" });

// 断开连接
await client.disconnect();
```

## API 参考

### WebSocketServer

#### 构造函数

```typescript
new WebSocketServer(config: WebSocketConfig)
```

#### 方法

- `handleUpgrade(req: Request): Response | null` - 处理 HTTP 升级请求
- `broadcast(message: WebSocketMessage, excludeId?: string)` - 广播消息
- `send(connectionId: string, message: WebSocketMessage)` - 发送消息给指定连接
- `close(connectionId: string)` - 关闭指定连接
- `getStats(): WebSocketStats` - 获取统计信息

### WebSocketClient

#### 构造函数

```typescript
new WebSocketClient(config: WebSocketClientConfig)
```

#### 方法

- `connect(): Promise<void>` - 建立连接
- `send(message: WebSocketMessage): void` - 发送消息
- `disconnect(): Promise<void>` - 断开连接
- `getState(): WebSocketClientState` - 获取连接状态

### 类型定义

```typescript
interface WebSocketConfig {
  path?: string;
  heartbeatInterval?: number;
  handlers?: WebSocketHandlers;
}

interface WebSocketHandlers {
  onConnect?: (conn: WebSocketConnection) => void;
  onMessage?: (conn: WebSocketConnection, msg: WebSocketMessage) => void;
  onClose?: (conn: WebSocketConnection) => void;
  onError?: (conn: WebSocketConnection, error: Error) => void;
}
```

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
