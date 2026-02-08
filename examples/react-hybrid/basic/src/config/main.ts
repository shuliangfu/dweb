/**
 * 默认配置文件
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "react-hybrid-basic-example",
  version: "1.0.0",
  server: {
    port: 3004, // e2e 并行测试时与 preact-csr/preact-hybrid/react-csr 端口区分
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
