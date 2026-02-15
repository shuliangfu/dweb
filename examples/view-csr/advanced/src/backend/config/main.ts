/**
 * 后端默认配置
 * 端口号写死在本应用配置中
 */

import { commonConfig } from "@common/config/main.ts";
import type { AppConfig } from "@dreamer/dweb";

/** 后端服务端口（写死在本应用配置） */
export const BACKEND_PORT = 3020;

/** 后端配置 */
const config: AppConfig = {
  name: "view-csr-advanced-example-backend",
  version: commonConfig.version,

  server: {
    port: BACKEND_PORT,
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
