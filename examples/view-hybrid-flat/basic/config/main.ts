/**
 * 默认配置文件
 * 框架会自动加载 ./config/main.ts（及 main.dev.ts 等环境配置）
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "view-hybrid-unocss-example",
  version: "1.0.0",

  // 服务器配置（e2e 并行测试时端口 3015，与其它 view-* 区分）
  server: {
    port: 3015,
    host: "127.0.0.1",
    // debug: true, // 开启后控制台输出请求路径、路径前置处理器、中间件链、响应状态等详细调试信息
    dev: {
      hmr: { enabled: true, path: "/__hmr" },
      watch: {
        paths: ["./config", "./routes", "./assets"],
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },

  // 渲染配置
  render: {
    engine: "view",
    mode: "hybrid",
  },

  // 路由配置
  router: {
    routesDir: "./routes",
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

  // 实时通信：type 为 socketio 时挂载到当前 HTTP 服务器同一端口
  socket: {
    adapter: "socketio",
    path: "/socket.io/",
    debug: false, // 开启后通过 logger.debug 输出 Socket.IO 请求路径、握手等调试信息
  },
};

export default config;
