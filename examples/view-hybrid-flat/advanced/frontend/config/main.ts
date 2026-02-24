/**
 * 前端默认配置
 * 支持环境变量 PORT 覆盖端口，供 e2e 指定端口避免冲突；后端端口供前端路由请求 API 使用
 */

import { commonConfig } from "@common/config/main.ts";
import type { AppConfig, AppLanguage } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

/** 前端服务端口（默认值；PORT 环境变量可覆盖） */
const FRONTEND_PORT = 3029;
/** 后端 API 端口（供前端路由请求接口使用） */
export const backendPort = 3028;
const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : FRONTEND_PORT;
const language = getEnv("LANGUAGE") || "zh-CN";

/** 前端配置 */
const config: AppConfig = {
  name: "view-hybrid-advanced-example-frontend",
  version: commonConfig.version,
  language: language as AppLanguage,

  server: {
    port: serverPort,
    host: "0.0.0.0",
  },

  render: {
    engine: "view",
    mode: "hybrid",
  },

  router: {
    routesDir: "./frontend/routes",
  },

  logger: {
    level: "info",
    format: "text",
  },
};

export default config;
