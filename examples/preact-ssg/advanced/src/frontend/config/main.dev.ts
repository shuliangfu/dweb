/**
 * 前端开发环境配置
 */

import type { AppConfig } from "@dreamer/dweb";
import defaultConfig from "./main.ts";

/** 前端开发环境配置 */
const config: AppConfig = {
  ...defaultConfig,

  server: {
    ...defaultConfig.server,
    host: "127.0.0.1",
  },

  logger: {
    level: "debug",
    format: "text",
  },

  hotReload: true,
};

export default config;
