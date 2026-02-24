/**
 * 后端默认配置
 * 支持环境变量 PORT 覆盖端口，供 e2e 指定端口避免冲突
 */
import type { AppConfig, AppLanguage } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : 3038;
const language = getEnv("LANGUAGE") || "zh-CN";

export default {
  name: "preact-hybrid-flat-advanced-example-backend",
  language: language as AppLanguage,

  server: {
    port: serverPort,
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
