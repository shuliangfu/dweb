# WebSocket 使用指南

本文档介绍如何在 DWeb 框架中使用 WebSocket 功能。

## 📋 目录

- [快速开始](#快速开始)
- [配置 WebSocket](#配置-websocket)
- [使用 WebSocket 服务器](#使用-websocket-服务器)
- [消息处理](#消息处理)
- [连接管理](#连接管理)
- [消息广播](#消息广播)
- [客户端示例](#客户端示例)
- [最佳实践](#最佳实践)

---

## 快速开始

### 1. 配置 WebSocket

在 `dweb.config.ts` 中配置 WebSocket：

```typescript
import type { AppConfig } from '@dreamer/dweb';

const config: AppConfig = {
  // ... 其他配置
  
  websocket: {
    path: '/ws',
    heartbeat: true,
    heartbeatInterval: 30000,
    maxConnections: 1000,
    handlers: {
      onConnect: (connection) => {
        console.log('新连接:', connection.id);
      },
      onMessage: (connection, message) => {
        console.log('收到消息:', message);
      },
      onClose: (connection, code, reason) => {
        console.log('连接关闭:', connection.id, code, reason);
      },
    },
  },
};

export default config;
```

### 2. 在代码中使用

```typescript
import { getWebSocketServer } from '@dreamer/dweb';

// 获取 WebSocket 服务器实例
const wsServer = getWebSocketServer();

// 广播消息
wsServer.broadcast({ type: 'text', data: 'Hello everyone' });
```

---

## 配置 WebSocket

### 基本配置

```typescript
websocket: {
  // WebSocket 路径前缀（默认: '/ws'）
  path: '/ws',
  
  // 是否启用心跳检测（默认: true）
  heartbeat: true,
  
  // 心跳间隔（毫秒，默认: 30000）
  heartbeatInterval: 30000,
  
  // 连接超时时间（毫秒，默认: 60000）
  timeout: 60000,
  
  // 最大连接数（默认: 1000）
  maxConnections: 1000,
  
  // 是否启用消息压缩（默认: false）
  compress: false,
  
  // 事件处理器
  handlers: {
    onConnect: (connection) => { /* ... */ },
    onMessage: (connection, message) => { /* ... */ },
    onClose: (connection, code, reason) => { /* ... */ },
    onError: (connection, error) => { /* ... */ },
  },
}
```

### 配置选项说明

- **path**: WebSocket 连接路径，客户端通过此路径连接
- **heartbeat**: 是否启用心跳检测，用于保持连接活跃
- **heartbeatInterval**: 心跳检测间隔，单位毫秒
- **timeout**: 连接超时时间，单位毫秒
- **maxConnections**: 最大连接数限制
- **compress**: 是否启用消息压缩（需要客户端支持）
- **handlers**: 事件处理器对象

---

## 使用 WebSocket 服务器

### 获取服务器实例

```typescript
import { getWebSocketServer } from '@dreamer/dweb';

// 注意：需要在服务器启动后调用
const wsServer = getWebSocketServer();
if (!wsServer) {
  console.error('WebSocket 服务器未配置');
}
```

### 发送消息到指定连接

```typescript
const wsServer = getWebSocketServer();
if (wsServer) {
  const success = wsServer.send('connection-id', {
    type: 'text',
    data: 'Hello',
  });
  
  if (success) {
    console.log('消息发送成功');
  }
}
```

### 广播消息

```typescript
const wsServer = getWebSocketServer();
if (wsServer) {
  // 广播到所有连接
  const count = wsServer.broadcast({
    type: 'json',
    data: { message: 'Hello everyone', timestamp: Date.now() },
  });
  
  console.log(`消息已发送到 ${count} 个连接`);
  
  // 排除发送者
  wsServer.broadcast(
    { type: 'text', data: 'Hello' },
    'sender-connection-id'
  );
}
```

### 获取连接信息

```typescript
const wsServer = getWebSocketServer();
if (wsServer) {
  // 获取指定连接
  const connection = wsServer.getConnection('connection-id');
  if (connection) {
    console.log('连接 ID:', connection.id);
    console.log('创建时间:', connection.createdAt);
    console.log('元数据:', connection.metadata);
  }
  
  // 获取所有连接
  const allConnections = wsServer.getAllConnections();
  console.log(`当前有 ${allConnections.length} 个连接`);
}
```

### 关闭连接

```typescript
const wsServer = getWebSocketServer();
if (wsServer) {
  // 关闭指定连接
  wsServer.closeConnection('connection-id', 1000, 'Normal closure');
  
  // 关闭所有连接
  wsServer.closeAll(1000, 'Server shutdown');
}
```

### 获取统计信息

```typescript
const wsServer = getWebSocketServer();
if (wsServer) {
  const stats = wsServer.getStats();
  console.log('当前连接数:', stats.connections);
  console.log('总连接数:', stats.totalConnections);
  console.log('总消息数:', stats.totalMessages);
  console.log('服务器启动时间:', stats.startTime);
}
```

---

## 消息处理

### 消息类型

WebSocket 支持三种消息类型：

1. **text**: 文本消息
2. **binary**: 二进制消息
3. **json**: JSON 消息（自动序列化/反序列化）

### 消息格式

```typescript
interface WebSocketMessage {
  type: 'text' | 'binary' | 'json';
  data: string | Uint8Array | Record<string, unknown>;
  from?: string;        // 发送者连接 ID
  to?: string;          // 目标连接 ID（用于点对点消息）
  timestamp?: number;   // 消息时间戳
}
```

### 处理消息

在配置的 `handlers.onMessage` 中处理消息：

```typescript
websocket: {
  handlers: {
    onMessage: (connection, message) => {
      console.log('收到消息:', message);
      
      // 根据消息类型处理
      if (message.type === 'json') {
        const data = message.data as Record<string, unknown>;
        if (data.type === 'chat') {
          // 处理聊天消息
          wsServer.broadcast({
            type: 'json',
            data: {
              type: 'chat',
              user: connection.metadata?.username,
              message: data.message,
              timestamp: Date.now(),
            },
          }, connection.id); // 排除发送者
        }
      }
    },
  },
}
```

---

## 连接管理

### 连接元数据

可以在连接建立时设置元数据：

```typescript
websocket: {
  handlers: {
    onConnect: (connection) => {
      // 设置连接元数据
      connection.metadata = {
        username: 'user123',
        userId: 123,
        ip: connection.socket.url,
      };
    },
  },
}
```

### 连接验证

可以在 `onConnect` 中验证连接：

```typescript
websocket: {
  handlers: {
    onConnect: async (connection) => {
      const url = new URL(connection.socket.url);
      const token = url.searchParams.get('token');
      
      if (!token || !await validateToken(token)) {
        // 关闭未验证的连接
        connection.socket.close(1008, 'Invalid token');
        return;
      }
      
      // 设置用户信息
      connection.metadata = {
        userId: await getUserIdFromToken(token),
        token: token,
      };
    },
  },
}
```

---

## 消息广播

### 广播到所有连接

```typescript
wsServer.broadcast({
  type: 'json',
  data: { type: 'notification', message: 'System update' },
});
```

### 排除发送者

```typescript
wsServer.broadcast(
  { type: 'text', data: 'Hello' },
  connection.id  // 排除发送者
);
```

### 条件广播

```typescript
const connections = wsServer.getAllConnections();
const targetConnections = connections.filter(
  (conn) => conn.metadata?.roomId === 'room123'
);

for (const conn of targetConnections) {
  wsServer.send(conn.id, {
    type: 'json',
    data: { type: 'room-message', message: 'Hello room' },
  });
}
```

---

## 客户端示例

### JavaScript/TypeScript 客户端

```typescript
// 连接 WebSocket
const ws = new WebSocket('ws://localhost:3000/ws');

// 连接建立
ws.onopen = () => {
  console.log('WebSocket 连接已建立');
  
  // 发送文本消息
  ws.send('Hello Server');
  
  // 发送 JSON 消息
  ws.send(JSON.stringify({ type: 'chat', message: 'Hello' }));
};

// 接收消息
ws.onmessage = (event) => {
  if (typeof event.data === 'string') {
    try {
      const data = JSON.parse(event.data);
      console.log('收到 JSON 消息:', data);
    } catch {
      console.log('收到文本消息:', event.data);
    }
  } else {
    console.log('收到二进制消息:', event.data);
  }
};

// 连接关闭
ws.onclose = (event) => {
  console.log('连接已关闭:', event.code, event.reason);
};

// 连接错误
ws.onerror = (error) => {
  console.error('WebSocket 错误:', error);
};
```

### HTML 示例

```html
<!DOCTYPE html>
<html>
<head>
  <title>WebSocket 示例</title>
</head>
<body>
  <div id="messages"></div>
  <input type="text" id="messageInput" />
  <button onclick="sendMessage()">发送</button>

  <script>
    const ws = new WebSocket('ws://localhost:3000/ws');
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');

    ws.onopen = () => {
      console.log('连接已建立');
    };

    ws.onmessage = (event) => {
      const message = document.createElement('div');
      message.textContent = event.data;
      messagesDiv.appendChild(message);
    };

    function sendMessage() {
      const message = messageInput.value;
      ws.send(message);
      messageInput.value = '';
    }
  </script>
</body>
</html>
```

---

## 最佳实践

### 1. 连接验证

在生产环境中，始终验证连接：

```typescript
handlers: {
  onConnect: async (connection) => {
    // 验证 token 或 session
    const isValid = await validateConnection(connection);
    if (!isValid) {
      connection.socket.close(1008, 'Unauthorized');
      return;
    }
  },
}
```

### 2. 错误处理

始终处理错误：

```typescript
handlers: {
  onError: (connection, error) => {
    console.error(`连接 ${connection.id} 错误:`, error);
    // 记录错误日志
    logError(error);
  },
}
```

### 3. 消息验证

验证消息格式和内容：

```typescript
handlers: {
  onMessage: (connection, message) => {
    if (message.type !== 'json') {
      return; // 忽略非 JSON 消息
    }
    
    const data = message.data as Record<string, unknown>;
    if (!data.type || !data.message) {
      // 发送错误消息
      wsServer.send(connection.id, {
        type: 'json',
        data: { error: 'Invalid message format' },
      });
      return;
    }
    
    // 处理有效消息
    handleMessage(connection, data);
  },
}
```

### 4. 资源清理

在服务器关闭时清理资源：

```typescript
// 在优雅关闭处理中
setupSignalHandlers({
  close: async () => {
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.closeAll(1001, 'Server shutdown');
    }
    // ... 其他清理工作
  },
});
```

### 5. 性能优化

- 使用消息队列处理大量消息
- 限制单个连接的消息频率
- 使用连接池管理大量连接
- 定期清理无效连接

---

## 相关文档

- [完整文档](./DOC.md) - 详细的功能说明和 API 文档
- [使用指南](./GUIDES.md) - 完整的使用指南

---

**最后更新**: 2024-12-20

