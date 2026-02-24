/**
 * 前端默认配置
 * 支持环境变量 PORT 覆盖端口，供 e2e 指定端口避免冲突
 */

import { commonConfig } from "@common/config/main.ts";
import type { AppConfig, AppLanguage } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv
  ? Number(portFromEnv)
  : commonConfig.frontendPort;
const language = getEnv("LANGUAGE") || "zh-CN";

/** 前端配置 */
const config: AppConfig = {
  name: "preact-ssr-advanced-example-frontend",
  version: commonConfig.version,
  language: language as AppLanguage,

  server: {
    port: serverPort,
    host: "0.0.0.0",
  },

  render: {
    engine: "preact",
    mode: "ssr",
  },

  router: {
    routesDir: "./src/frontend/routes",
  },

  logger: {
    level: "info",
    format: "text",
  },
};

export default config;
