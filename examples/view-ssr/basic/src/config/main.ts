/**
 * 默认配置文件
 * 框架会自动加载 ./src/config/main.ts（及 main.dev.ts 等环境配置）
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "view-ssr-basic-example",
  version: "1.0.0",

  // 服务器配置（e2e 并行测试时端口区分）
  server: {
    port: 3013,
    host: "127.0.0.1",
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
    engine: "view",
    mode: "ssr",
  },

  // 路由配置
  router: {
    routesDir: "./src/routes",
  },

  // 日志配置
  logger: {
    level: "info",
  },

  // 构建配置
  build: {
    server: {
      useNativeCompile: false,
      external: ["tailwindcss", "lightningcss"],
    },
  },
};

export default config;
