/**
 * 默认配置文件
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "react-hybrid-basic-example",
  version: "1.0.0",
  server: {
    port: 3004,
    host: "0.0.0.0",
  },
  render: {
    engine: "react",
    mode: "hybrid",
  },
  router: {
    routesDir: "./src/routes",
  },
  logger: {
    level: "info",
    format: "text",
  },
  build: {
    server: {
      external: ["tailwindcss", "lightningcss"],
    },
  },
};

export default config;
