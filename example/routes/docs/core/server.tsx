/**
 * 核心模块 - 服务器 (Server) 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "服务器 (Server) - DWeb 框架文档",
  description: "DWeb 框架的服务器功能介绍",
};

export default function CoreServerPage() {
  // 服务器基本使用
  const serverBasicCode = `import { Server } from '@dreamer/dweb';

const server = new Server();

// 设置请求处理器
server.setHandler(async (req, res) => {
  res.text('Hello World');
});

// 启动服务器
await server.start(3000, 'localhost');`;

  // 服务器响应方法
  const serverResponseCode = `server.setHandler(async (req, res) => {
  // 文本响应
  res.text('Hello');
  
  // JSON 响应
  res.json({ message: 'Hello' });
  
  // HTML 响应
  res.html('<h1>Hello</h1>');
  
  // 设置状态码
  res.status(404);
  
  // 设置响应头
  res.setHeader('Content-Type', 'application/json');
  
  // 重定向
  res.redirect('/new-path');
  
  // 发送文件
  await res.sendFile('./public/index.html');
});`;

  // 中间件使用
  const middlewareCode = `import { Server } from '@dreamer/dweb';
import { logger, cors } from '@dreamer/dweb';

const server = new Server();

// 添加中间件
server.use(logger());
server.use(cors({ origin: '*' }));

server.setHandler(async (req, res) => {
  res.json({ message: 'Hello' });
});

await server.start(3000);`;

  // TLS 支持
  const tlsCode = `// 启用 HTTPS
const server = new Server();

server.setHandler(async (req, res) => {
  res.text('Hello World');
});

// 启动 HTTPS 服务器
await server.start({
  port: 443,
  host: 'localhost',
  certFile: './cert.pem',
  keyFile: './key.pem',
});`;

  // 服务器事件
  const eventsCode = `const server = new Server();

// 监听服务器启动事件
server.on('start', () => {
  console.log('服务器已启动');
});

// 监听服务器关闭事件
server.on('close', () => {
  console.log('服务器已关闭');
});

await server.start(3000);`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "服务器 (Server)",
    description: "Server 类是框架的核心，提供了 HTTP 服务器功能。它基于 Deno 的原生 HTTP 服务器，提供了简洁易用的 API。",
    sections: [

      {
        title: "基本使用",
        blocks: [
          {
            type: "text",
            content: "创建一个服务器实例，设置请求处理器，然后启动服务器：",
          },
          {
            type: "code",
            code: serverBasicCode,
            language: "typescript",
          },
        ],
      },

      {
        title: "响应方法",
        blocks: [
          {
            type: "text",
            content: "Response 对象提供了多种响应方法，方便处理不同类型的响应：",
          },
          {
            type: "code",
            code: serverResponseCode,
            language: "typescript",
          },
          {
            type: "subsection",
            level: 3,
            title: "响应方法说明",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`res.text(content, type?)`** - 发送文本响应，支持自定义 Content-Type",
                  "**`res.json(data, options?)`** - 发送 JSON 响应，支持自定义状态码和响应头",
                  "**`res.html(html)`** - 发送 HTML 响应",
                  "**`res.status(code)`** - 设置 HTTP 状态码",
                  "**`res.setHeader(name, value)`** - 设置响应头",
                  "**`res.redirect(url, status?)`** - 重定向到指定 URL",
                  "**`res.sendFile(path)`** - 发送文件响应",
                ],
              },
            ],
          },
        ],
      },

      {
        title: "中间件",
        blocks: [
          {
            type: "text",
            content: "服务器支持添加中间件，用于在请求处理前或后执行逻辑：",
          },
          {
            type: "code",
            code: middlewareCode,
            language: "typescript",
          },
          {
            type: "text",
            content: "更多中间件使用说明，请查看 [中间件系统文档](/docs/core/middleware)。",
          },
        ],
      },
      {
        title: "TLS 支持",
        blocks: [
          {
            type: "text",
            content: "服务器支持 HTTPS（TLS）：",
          },
          {
            type: "code",
            code: tlsCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "服务器事件",
        blocks: [
          {
            type: "text",
            content: "服务器支持事件监听：",
          },
          {
            type: "code",
            code: eventsCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "服务器配置",
        blocks: [
          {
            type: "text",
            content: "服务器启动时可以配置端口和主机地址：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "**`port`** - 服务器监听端口（默认: 3000）",
              "**`host`** - 服务器监听地址（默认: 'localhost'）",
            ],
          },
        ],
      },

      {
        title: "核心架构与优化",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "设计模式",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**适配器与代理模式 (Adapter & Proxy Pattern)**：服务器不直接使用 Deno 原生的 Request 对象，而是通过 Proxy 创建了一个扩展的请求对象。这允许框架在不破坏原生 API 的前提下，无缝添加 session、cookies、query 等便捷属性。",
                  "**中间件链 (Middleware Chain)**：实现了经典的洋葱模型（责任链模式），支持 next() 控制流，允许中间件在请求处理前后执行逻辑，提供了极高的扩展性。",
                  "**统一错误处理 (Unified Error Handling)**：内置了 ErrorHandler 接口和降级处理机制，确保即使自定义错误处理器失败，服务器也能优雅降级，防止崩溃。",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "关键优化",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**惰性求值 (Lazy Evaluation)**：利用 Proxy 的 get 拦截器，只有在用户真正访问扩展属性（如 req.cookies 或 req.session）时才进行解析。这避免了对每个请求都进行昂贵的解析操作，显著提升了吞吐量。",
                  "**零拷贝/高效内存处理**：在处理响应体时，明确检查 Uint8Array 并使用 slice().buffer 创建视图，避免了不必要的数据拷贝，提升了 I/O 性能。",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "新特性",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**WebSocket 升级支持**：内置了 setWebSocketUpgradeHandler，允许在 HTTP 握手阶段平滑升级到 WebSocket 连接。",
                  "**集群感知**：通过读取 PUP_CLUSTER_INSTANCE 环境变量支持集群模式，自动调整端口，适合多实例部署。",
                  "**开发体验增强**：内置了对自签名证书（开发环境）和自定义 TLS 证书（生产环境）的支持，简化了安全配置。",
                ],
              },
            ],
          },
        ],
      },

      {
        title: "API 参考",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "构造函数",
            blocks: [
              {
                type: "code",
                code: "constructor()",
                language: "typescript",
              },
              {
                type: "text",
                content: "创建新的服务器实例。",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "方法",
            blocks: [
              {
                type: "api",
                name: "start(port, host?)",
                description: "启动服务器。",
                code: "await server.start(3000, 'localhost');",
              },
              {
                type: "api",
                name: "stop()",
                description: "停止服务器。",
                code: "await server.stop();",
              },
              {
                type: "api",
                name: "setHandler(handler)",
                description: "设置请求处理器。",
                code: `server.setHandler(async (req, res) => {
  res.text('Hello World');
});`,
              },
              {
                type: "api",
                name: "use(middleware)",
                description: "添加中间件。",
                code: `server.use(logger());
server.use(cors({ origin: '*' }));`,
              },
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
              "[Application (应用核心)](/docs/core/application)",
              "[中间件系统](/docs/core/middleware)",
              "[优雅关闭](/docs/features/shutdown)",
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
