/**
 * 开发环境配置
 * 覆盖默认配置中的开发环境特定设置
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  hotReload: true,
  server: {
    dev: {
      hmr: { enabled: true, path: "/__hmr/websocket" },
      watch: {
        paths: ["."],
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },
  logger: {
    level: "debug",
    format: "text",
  },
  render: {
    debug: false,
  },
  router: { debug: false },
  build: {
    client: { debug: false },
    server: { debug: false },
  },
  // 实时通信：type 为 websocket 时挂载到当前 HTTP 服务器同一端口（开发环境测试）
  socket: {
    adapter: "websocket",
    path: "/ws",
    debug: false, // 开启后通过 logger.debug 输出 WebSocket 请求路径、握手等调试信息
  },
};

export default config;
