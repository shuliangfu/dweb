/**
 * 开发环境配置
 * 覆盖默认配置中的开发环境特定设置
 */

import type { AppConfig } from "@dreamer/dweb";
import defaultConfig from "./main.ts";

const config: AppConfig = {
  ...defaultConfig,
  hotReload: true,
  server: {
    ...defaultConfig.server,
    host: "localhost",
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
