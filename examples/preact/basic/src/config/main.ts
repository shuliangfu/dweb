/**
 * 默认配置文件
 * 适用于所有环境
 */

import type { AppConfig } from "@dreamer/dweb";

/**
 * 默认配置
 */
const config: AppConfig = {
  // 应用信息
  name: "preact-basic-example",
  version: "1.0.0",

  // 服务器配置
  server: {
    port: 3000,
    host: "0.0.0.0",
  },

  // 渲染配置（hybrid：服务端渲染 + 客户端激活）
  render: {
    engine: "preact",
    mode: "hybrid",
  },

  // 路由配置
  router: {
    routesDir: "./src/routes",
  },

  // 日志配置
  logger: {
    level: "info",
    format: "text",
  },
};

export default config;
