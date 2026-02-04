/**
 * 开发环境配置文件
 */

import type { AppConfig } from "@dreamer/dweb";
import defaultConfig from "./main.ts";

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
  hotReload: true,
};

export default config;
