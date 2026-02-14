/**
 * 前端默认配置
 */

import { commonConfig } from "@common/config/main.ts";
import type { AppConfig } from "@dreamer/dweb";

/** 前端配置 */
const config: AppConfig = {
  name: "view-csr-advanced-example-frontend",
  version: commonConfig.version,

  server: {
    port: commonConfig.frontendPort,
    host: "0.0.0.0",
  },

  render: {
    engine: "view",
    mode: "csr",
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
