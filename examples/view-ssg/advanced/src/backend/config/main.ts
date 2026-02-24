/**
 * 后端默认配置
 * 支持环境变量 PORT 覆盖端口，供 e2e 指定端口避免冲突
 */

import { commonConfig } from "@common/config/main.ts";
import type { AppConfig, AppLanguage } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

/** 后端服务端口（默认值；PORT 环境变量可覆盖） */
export const BACKEND_PORT = 3026;
const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : BACKEND_PORT;
const language = getEnv("LANGUAGE") || "zh-CN";

/** 后端配置 */
const config: AppConfig = {
  name: "view-ssg-advanced-example-backend",
  version: commonConfig.version,
  language: language as AppLanguage,

  server: {
    port: serverPort,
    host: "0.0.0.0",
  },

  router: {
    routesDir: "./src/backend/routes",
    apiMode: "restful",
  },

  logger: {
    level: "info",
    format: "json",
  },
};

export default config;
