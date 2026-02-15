/**
 * 后端默认配置
 * version 等公共字段由 common/config 自动合并，无需手动导入
 */
import type { AppConfig } from "@dreamer/dweb";

export default {
  name: "preact-hybrid-flat-advanced-example-backend",

  server: {
    port: 3038,
    host: "0.0.0.0",
  },

  router: {
    routesDir: "./backend/routes",
    apiMode: "restful",
  },

  logger: {
    level: "info",
    format: "json",
  },
} satisfies AppConfig;
