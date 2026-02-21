/**
 * 后端默认配置
 * 支持环境变量 PORT 覆盖端口，供 e2e 指定端口避免冲突
 */
import type { AppConfig } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

/** 后端服务端口（默认值；PORT 环境变量可覆盖） */
const BACKEND_PORT = 3022;
const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : BACKEND_PORT;

export default {
  name: "view-hybrid-advanced-example-backend",

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
} satisfies AppConfig;
