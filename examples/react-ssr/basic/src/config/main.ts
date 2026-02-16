/**
 * 默认配置文件
 * 支持环境变量 PORT 覆盖端口，便于 CI/集成测试与其它示例错开
 */

import type { AppConfig } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : 3007;

const config: AppConfig = {
  name: "react-ssr-basic-example",
  version: "1.0.0",
  server: {
    port: serverPort,
    host: "127.0.0.1",
  },
  render: {
    engine: "react",
    mode: "ssr",
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
