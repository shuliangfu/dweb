/**
 * 默认配置文件
 * 框架会自动加载 ./src/config/main.ts（及 main.dev.ts 等环境配置）
 * 支持环境变量 PORT 覆盖端口，便于 CI/集成测试
 */

import type { AppConfig, AppLanguage } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : 3013;
const language = getEnv("LANGUAGE") || "zh-CN";

const config: AppConfig = {
  name: "view-ssr-basic-example",
  version: "1.0.0",
  language: language as AppLanguage,

  // 服务器配置（e2e 并行测试时端口区分）
  server: {
    port: serverPort,
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
