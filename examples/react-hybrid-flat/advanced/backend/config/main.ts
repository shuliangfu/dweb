/**
 * 后端默认配置
 * 支持环境变量 PORT 覆盖端口，供 e2e 指定端口避免冲突
 */

import { commonConfig } from "@common/config/main.ts";
import type { AppConfig, AppLanguage } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : 3048;
const language = getEnv("LANGUAGE") || "zh-CN";

/** 后端配置 */
const config: AppConfig = {
  name: "react-hybrid-flat-advanced-example-backend",
  version: commonConfig.version,
  language: language as AppLanguage,

  server: {
    port: serverPort,
    host: "127.0.0.1",
    dev: {
      hmr: { enabled: true, path: "/__hmr" },
      watch: {
        paths: ["./backend", "./common"],
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },

  render: {
    engine: "react",
    mode: "hybrid",
  },

  router: {
    routesDir: "./backend/routes",
  },

  logger: {
    level: "info",
  },
};

export default config;
