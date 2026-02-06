/**
 * 开发环境配置
 * 覆盖默认配置中的开发环境特定设置
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  hotReload: true,
  server: {
    // debug: true, // 开启后控制台输出请求路径、路径前置处理器、中间件链、响应状态等详细调试信息
    dev: {
      hmr: { enabled: true, path: "/__hmr/websocket" },
      watch: {
        paths: ["./src"],
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },
  logger: {
    level: "debug",
    format: "text",
  },
  // 实时通信：type 为 websocket 时挂载到当前 HTTP 服务器同一端口（开发环境测试）
  socket: {
    type: "websocket",
    path: "/ws",
    debug: true, // 开启后通过 logger.debug 输出 WebSocket 请求路径、握手等调试信息
  },
};

export default config;
