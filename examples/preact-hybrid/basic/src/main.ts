/**
 * 服务端入口
 * Preact Basic 示例项目
 * 配置由框架自动加载 src/config/main.ts
 */

import { App, getSocketIoServer, getWebSocketServer } from "@dreamer/dweb";
import { staticPlugin } from "@dreamer/plugins/static";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";

const app = new App();

app.registerPlugin(tailwindPlugin({
  output: "dist/client/assets",
  cssEntry: "src/assets/tailwind.css",
  assetsPath: "/assets",
}));

app.registerPlugin(staticPlugin({
  statics: [
    { root: "assets", prefix: "/assets" },
    { root: "dist/client/assets", prefix: "/assets" },
  ],
}));

// Socket.IO：在 init 阶段注册 connection 与 chat-message 处理，与前端示例配套
app.on("init", () => {
  if (app.container.has("socketIoServer")) {
    const io = getSocketIoServer(app.container);
    io.on("connection", (socket) => {
      socket.on("chat-message", (data: { text?: string }) => {
        socket.emit("chat-response", {
          text: data?.text != null ? `Echo: ${data.text}` : "received",
        });
      });
    });
  }
  // WebSocket：在 init 阶段注册 connection 与 chat-message 处理，与前端示例配套
  if (app.container.has("websocketServer")) {
    const ws = getWebSocketServer(app.container);
    ws.on("connection", (socket) => {
      socket.on("chat-message", (data: { text?: string }) => {
        socket.emit("chat-response", {
          text: data?.text != null ? `Echo: ${data.text}` : "received",
        });
      });
    });
  }
});

app.start();
