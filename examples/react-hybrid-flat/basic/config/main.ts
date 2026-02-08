/**
 * 默认配置文件
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "react-hybrid-flat-basic-example",
  version: "1.0.0",
  server: {
    port: 3010, // e2e 并行测试时端口 3010，与 react-hybrid=3004 等区分
    host: "0.0.0.0",
  },
  render: {
    engine: "react",
    mode: "hybrid",
  },
  router: {
    routesDir: "./routes",
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
