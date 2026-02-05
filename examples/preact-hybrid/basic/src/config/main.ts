/**
 * 默认配置文件
 * 框架会自动加载 ./src/config/main.ts（及 main.dev.ts 等环境配置）
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "preact-hybrid-basic-example",
  version: "1.0.0",

  language: "en-US",

  // 服务器配置
  server: {
    port: 3000,
    host: "localhost",
    // debug: true, // 开启后控制台输出请求路径、路径前置处理器、中间件链、响应状态等详细调试信息
    dev: {
      hmr: { enabled: true, path: "/__hmr" },
      watch: {
        paths: ["./src"],
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },

  // 渲染配置
  render: {
    engine: "preact",
    mode: "hybrid",
  },

  // 路由配置
  router: {
    routesDir: "./src/routes",
  },

  // 日志配置（main.dev.ts 开发环境已设置 level: "debug"）
  logger: {
    level: "info",
  },

  // 构建配置
  build: {
    server: {
      useNativeCompile: false,
    },
  },

  // 实时通信：type 为 websocket 时挂载到当前 HTTP 服务器同一端口（开发环境测试）
  socket: {
    type: "websocket",
    path: "/ws",
    debug: false, // 开启后通过 logger.debug 输出 WebSocket 请求路径、握手等调试信息
  },
};

export default config;
