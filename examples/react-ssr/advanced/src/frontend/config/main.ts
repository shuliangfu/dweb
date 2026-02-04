/**
 * 前端默认配置
 * 框架会先加载 common/config 再加载本文件并合并
 */

import { commonConfig } from "@common/config/main.ts";
import type { AppConfig } from "@dreamer/dweb";

/** 前端配置 */
const config: AppConfig = {
  name: "react-ssr-advanced-example-frontend",
  version: commonConfig.version,

  server: {
    port: 3000,
    host: "localhost",
    dev: {
      hmr: { enabled: true, path: "/__hmr" },
      watch: {
        paths: ["./src/frontend", "./src/common"],
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },

  render: {
    engine: "react",
    mode: "ssr",
  },

  router: {
    routesDir: "./src/frontend/routes",
  },

  logger: {
    level: "info",
  },
};

export default config;
