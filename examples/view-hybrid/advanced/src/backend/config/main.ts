/**
 * 后端默认配置
 * 端口号写死在本应用配置中
 */
import type { AppConfig } from "@dreamer/dweb";

/** 后端服务端口（写死在本应用配置） */
const BACKEND_PORT = 3022;

export default {
  name: "view-hybrid-advanced-example-backend",

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
} satisfies AppConfig;
