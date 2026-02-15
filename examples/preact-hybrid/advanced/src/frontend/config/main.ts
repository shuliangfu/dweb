/**
 * 前端默认配置
 * version、port 等可由 common/config 提供，框架自动合并
 */
import type { AppConfig } from "@dreamer/dweb";

export default {
  name: "preact-hybrid-advanced-example-frontend",

  server: {
    port: 3033,
    host: "0.0.0.0",
  },

  render: {
    engine: "preact",
    mode: "hybrid",
  },

  router: {
    routesDir: "./src/frontend/routes",
  },

  logger: {
    level: "info",
    format: "text",
  },
} satisfies AppConfig;
