/**
 * 默认配置文件
 * 支持环境变量 PORT 覆盖端口，供 e2e 等指定端口避免冲突
 */

import type { AppConfig } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : 3003;

const config: AppConfig = {
  name: "react-csr-basic-example",
  version: "1.0.0",
  server: {
    port: serverPort,
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
  // 构建配置（服务端 external 含 react 等，避免与动态加载的组件双实例导致 SSR 报错）
  build: {
    server: {
      external: [
        "tailwindcss",
        "lightningcss",
        "react",
        "react-dom",
        "react-dom/server",
        "react/jsx-runtime",
      ],
    },
  },
};

export default config;
