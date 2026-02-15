/**
 * 前端默认配置
 * 端口号写死在本应用配置中；后端端口供前端路由请求 API 使用
 */

import { commonConfig } from "@common/config/main.ts";
import type { AppConfig } from "@dreamer/dweb";

/** 前端服务端口（写死在本应用配置） */
const FRONTEND_PORT = 3029;
/** 后端 API 端口（供前端路由请求接口使用） */
export const backendPort = 3028;

/** 前端配置 */
const config: AppConfig = {
  name: "view-hybrid-advanced-example-frontend",
  version: commonConfig.version,

  server: {
    port: FRONTEND_PORT,
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
