/**
 * 后端开发环境配置
 */

import type { AppConfig } from "@dreamer/dweb";
import defaultConfig from "./main.ts";

/** 后端开发环境配置 */
const config: AppConfig = {
  ...defaultConfig,

  server: {
    ...defaultConfig.server,
    host: "localhost",
  },

  logger: {
    level: "debug",
    format: "text",
  },
};

export default config;
