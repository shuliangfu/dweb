/**
 * 后端默认配置
 */

import { commonConfig } from "@common/config/main.ts";
import type { AppConfig } from "@dreamer/dweb";

/** 后端配置 */
const config: AppConfig = {
  name: "view-csr-advanced-example-backend",
  version: commonConfig.version,

  server: {
    port: commonConfig.backendPort,
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
