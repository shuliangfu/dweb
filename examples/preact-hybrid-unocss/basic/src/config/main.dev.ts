/**
 * 开发环境配置
 * 框架会自动与 main.ts 深度合并，只需写增量覆盖
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  hotReload: true,
  server: {
    host: "127.0.0.1",
  },
  render: { debug: true },
  router: { debug: true },
  build: {
    client: { debug: true },
    server: { debug: true },
  },
  logger: {
    level: "debug",
    format: "text",
  },
  // 实时通信：type 为 socketio 时挂载到当前 HTTP 服务器同一端口
  socket: {
    adapter: "socketio",
    path: "/socket.io/",
    debug: false, // 开启后通过 logger.debug 输出 Socket.IO 请求路径、握手等调试信息
  },
};

export default config;
