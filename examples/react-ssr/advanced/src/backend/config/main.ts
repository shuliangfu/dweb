/**
 * 后端默认配置
 * 框架会先加载 common/config 再加载本文件并合并
 */

import { commonConfig } from "@common/config/main.ts";
import type { AppConfig } from "@dreamer/dweb";

/** 后端端口（与 e2e 一致，避免冲突） */
export const BACKEND_PORT = 3044;

/** 后端配置 */
const config: AppConfig = {
  name: "react-ssr-advanced-example-backend",
  version: commonConfig.version,

  server: {
    port: BACKEND_PORT,
    host: "127.0.0.1",
    dev: {
      hmr: { enabled: true, path: "/__hmr" },
      watch: {
        paths: ["./src/backend", "./src/common"],
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },

  render: {
    engine: "react",
    mode: "ssr",
  },

  router: {
    routesDir: "./src/backend/routes",
  },

  logger: {
    level: "info",
  },
};

export default config;
