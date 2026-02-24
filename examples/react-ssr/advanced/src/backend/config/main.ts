/**
 * 后端默认配置
 * 支持环境变量 PORT 覆盖端口，供 e2e 指定端口避免冲突
 */

import { commonConfig } from "@common/config/main.ts";
import type { AppConfig, AppLanguage } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

/** 后端端口（默认值；PORT 环境变量可覆盖） */
export const BACKEND_PORT = 3044;
const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : BACKEND_PORT;
const language = getEnv("LANGUAGE") || "zh-CN";

/** 后端配置 */
const config: AppConfig = {
  name: "react-ssr-advanced-example-backend",
  version: commonConfig.version,
  language: language as AppLanguage,

  server: {
    port: serverPort,
    host: "127.0.0.1",
    dev: {
      hmr: { enabled: true, path: "/__hmr" },
      watch: {
        paths: ["./src/backend", "./src/common"],
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },

  render: {
    engine: "react",
    mode: "ssr",
  },

  router: {
    routesDir: "./src/backend/routes",
  },

  logger: {
    level: "info",
  },
};

export default config;
