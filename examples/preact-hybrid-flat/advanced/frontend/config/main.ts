/**
 * 前端默认配置
 * 支持环境变量 PORT 覆盖端口，供 e2e 指定端口避免冲突
 */
import type { AppConfig } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : 3039;

export default {
  name: "preact-hybrid-flat-advanced-example-frontend",

  server: {
    port: serverPort,
    host: "0.0.0.0",
  },

  render: {
    engine: "preact",
    mode: "hybrid",
  },

  router: {
    routesDir: "./frontend/routes",
  },

  logger: {
    level: "info",
    format: "text",
  },
} satisfies AppConfig;
