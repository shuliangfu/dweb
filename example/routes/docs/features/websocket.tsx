/**
 * 功能模块 - WebSocket 文档页面
 * 展示 DWeb 框架的 WebSocket 功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "WebSocket - DWeb 框架文档",
  description: "DWeb 框架的 WebSocket 服务器和客户端支持，可以实现实时通信功能",
};

export default function WebSocketPage() {
  // 创建 WebSocket 服务器
  const serverCode = `import { WebSocketServer, Server } from "@dreamer/dweb";

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
  if (req.url.startsWith("/ws")) {
    const upgrade = wsServer.handleUpgrade(req);
    if (upgrade) {
      return upgrade;
    }
  }
  res.text("Not Found", 404);
});

await server.start(3000);`;

  // 使用访问辅助函数
  const helperCode = `import {
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
wsServer.broadcast({ type: "notification", message: "系统通知" });`;

  // WebSocket 客户端
  const clientCode = `import { WebSocketClient } from "@dreamer/dweb";

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
await client.disconnect();`;

  // 在路由中使用
  const routeUsageCode = `// routes/api/ws.ts
import { WebSocketServer } from "@dreamer/dweb";
import type { ApiContext } from "@dreamer/dweb";

const wsServer = new WebSocketServer({
  path: "/ws",
  handlers: {
    onConnect: (conn) => {
      console.log("新连接:", conn.id);
    },
    onMessage: (conn, msg) => {
      // 处理消息
      wsServer.broadcast(msg);
    },
  },
});

export async function get({ req, res }: ApiContext) {
  const upgrade = wsServer.handleUpgrade(req);
  if (upgrade) {
    return upgrade;
  }
  return res.text("Not Found", 404);
}`;

  // 心跳检测
  const heartbeatCode = `const wsServer = new WebSocketServer({
  path: "/ws",
  heartbeatInterval: 30000, // 30 秒心跳间隔
  handlers: {
    onConnect: (conn) => {
      console.log("连接:", conn.id);
    },
    onMessage: (conn, msg) => {
      if (msg.type === "ping") {
        conn.send({ type: "pong" });
      }
    },
  },
});`;

  const webSocketConfigCode = `interface WebSocketConfig {
  path?: string;
  heartbeatInterval?: number;
  handlers?: WebSocketHandlers;
}

interface WebSocketHandlers {
  onConnect?: (conn: WebSocketConnection) => void;
  onMessage?: (conn: WebSocketConnection, msg: WebSocketMessage) => void;
  onClose?: (conn: WebSocketConnection) => void;
  onError?: (conn: WebSocketConnection, error: Error) => void;
}`;

  const webSocketClientConfigCode = `interface WebSocketClientConfig {
  url: string;
  handlers?: WebSocketClientHandlers;
}

interface WebSocketClientHandlers {
  onOpen?: () => void;
  onMessage?: (msg: WebSocketMessage) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}`;

  const content = {
    title: "WebSocket",
    description: "DWeb 框架提供了完整的 WebSocket 支持，包括服务器端和客户端实现，可以实现实时通信功能。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "创建 WebSocket 服务器",
            blocks: [
              {
                type: "code",
                code: serverCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用访问辅助函数",
            blocks: [
              {
                type: "code",
                code: helperCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "WebSocket 客户端",
            blocks: [
              {
                type: "code",
                code: clientCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "在路由中使用",
        blocks: [
          {
            type: "code",
            code: routeUsageCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "心跳检测",
        blocks: [
          {
            type: "text",
            content: "WebSocket 服务器支持心跳检测，可以自动检测和关闭无效连接：",
          },
          {
            type: "code",
            code: heartbeatCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "WebSocketServer",
            blocks: [
              {
                type: "code",
                code: `new WebSocketServer(config: WebSocketConfig)`,
                language: "typescript",
              },
              {
                type: "code",
                code: webSocketConfigCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "方法",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`handleUpgrade(req): Response | null`** - 处理 HTTP 升级请求",
                  "**`broadcast(message, excludeId?)`** - 广播消息给所有客户端",
                  "**`send(connectionId, message)`** - 发送消息给指定连接",
                  "**`close(connectionId)`** - 关闭指定连接",
                  "**`getStats()`** - 获取统计信息",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "WebSocketClient",
            blocks: [
              {
                type: "code",
                code: `new WebSocketClient(config: WebSocketClientConfig)`,
                language: "typescript",
              },
              {
                type: "code",
                code: webSocketClientConfigCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "方法",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`connect()`** - 建立连接",
                  "**`send(message)`** - 发送消息",
                  "**`disconnect()`** - 断开连接",
                  "**`getState()`** - 获取连接状态",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "使用场景",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**实时聊天**：构建聊天应用，实现消息的实时推送",
              "**实时通知**：推送系统通知、消息提醒等",
              "**实时数据更新**：股票价格、游戏状态等实时数据推送",
              "**协作编辑**：多人协作编辑文档，实时同步更改",
              "**在线状态**：显示用户在线/离线状态",
            ],
          },
        ],
      },
      {
        title: "相关文档",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[Server](/docs/core/server) - 服务器",
              "[API 路由](/docs/core/api) - API 路由系统",
              "[Application](/docs/core/application) - 应用核心",
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
