/**
 * 开发环境配置文件
 * 覆盖默认配置中的开发环境特定设置
 */

import type { AppConfig } from "@dreamer/dweb";
import defaultConfig from "./main.ts";

/**
 * 开发环境配置
 */
const config: AppConfig = {
  ...defaultConfig,

  // 服务器配置 - 开发环境使用 localhost
  server: {
    ...defaultConfig.server,
    host: "localhost",
  },

  // 日志配置 - 开发环境使用 debug 级别
  logger: {
    level: "debug",
    format: "text",
  },

  // 启用热重载
  hotReload: true,
};

export default config;
