/**
 * 功能模块 - WebSocket 文档页面
 * 展示 DWeb 框架的 WebSocket 功能和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "WebSocket - DWeb 框架文档",
  description: "DWeb 框架的 WebSocket 服务器和客户端支持，可以实现实时通信功能",
};

export default function WebSocketPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
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

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        WebSocket
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架提供了完整的 WebSocket
        支持，包括服务器端和客户端实现，可以实现实时通信功能。
      </p>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          创建 WebSocket 服务器
        </h3>
        <CodeBlock code={serverCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          使用访问辅助函数
        </h3>
        <CodeBlock code={helperCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          WebSocket 客户端
        </h3>
        <CodeBlock code={clientCode} language="typescript" />
      </section>

      {/* 在路由中使用 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          在路由中使用
        </h2>
        <CodeBlock code={routeUsageCode} language="typescript" />
      </section>

      {/* 心跳检测 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          心跳检测
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          WebSocket 服务器支持心跳检测，可以自动检测和关闭无效连接：
        </p>
        <CodeBlock code={heartbeatCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          WebSocketServer
        </h3>
        <CodeBlock
          code={`new WebSocketServer(config: WebSocketConfig)`}
          language="typescript"
        />
        <CodeBlock
          code={`interface WebSocketConfig {
  path?: string;
  heartbeatInterval?: number;
  handlers?: WebSocketHandlers;
}

interface WebSocketHandlers {
  onConnect?: (conn: WebSocketConnection) => void;
  onMessage?: (conn: WebSocketConnection, msg: WebSocketMessage) => void;
  onClose?: (conn: WebSocketConnection) => void;
  onError?: (conn: WebSocketConnection, error: Error) => void;
}`}
          language="typescript"
        />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方法
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              handleUpgrade(req): Response | null
            </code>{" "}
            - 处理 HTTP 升级请求
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              broadcast(message, excludeId?)
            </code>{" "}
            - 广播消息给所有客户端
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              send(connectionId, message)
            </code>{" "}
            - 发送消息给指定连接
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              close(connectionId)
            </code>{" "}
            - 关闭指定连接
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              getStats()
            </code>{" "}
            - 获取统计信息
          </li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          WebSocketClient
        </h3>
        <CodeBlock
          code={`new WebSocketClient(config: WebSocketClientConfig)`}
          language="typescript"
        />
        <CodeBlock
          code={`interface WebSocketClientConfig {
  url: string;
  handlers?: WebSocketClientHandlers;
}

interface WebSocketClientHandlers {
  onOpen?: () => void;
  onMessage?: (msg: WebSocketMessage) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}`}
          language="typescript"
        />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方法
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              connect()
            </code>{" "}
            - 建立连接
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              send(message)
            </code>{" "}
            - 发送消息
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              disconnect()
            </code>{" "}
            - 断开连接
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              getState()
            </code>{" "}
            - 获取连接状态
          </li>
        </ul>
      </section>

      {/* 使用场景 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          使用场景
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <strong>实时聊天</strong>：构建聊天应用，实现消息的实时推送
          </li>
          <li>
            <strong>实时通知</strong>：推送系统通知、消息提醒等
          </li>
          <li>
            <strong>实时数据更新</strong>：股票价格、游戏状态等实时数据推送
          </li>
          <li>
            <strong>协作编辑</strong>：多人协作编辑文档，实时同步更改
          </li>
          <li>
            <strong>在线状态</strong>：显示用户在线/离线状态
          </li>
        </ul>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/core/server"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Server
            </a>{" "}
            - 服务器
          </li>
          <li>
            <a
              href="/docs/core/api"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              API 路由
            </a>{" "}
            - API 路由系统
          </li>
          <li>
            <a
              href="/docs/core/application"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Application
            </a>{" "}
            - 应用核心
          </li>
        </ul>
      </section>
    </article>
  );
}
