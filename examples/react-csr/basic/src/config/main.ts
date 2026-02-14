/**
 * 默认配置文件
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "react-csr-basic-example",
  version: "1.0.0",
  server: {
    port: 3003,
    host: "0.0.0.0",
  },
  render: {
    engine: "react",
    mode: "csr",
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
