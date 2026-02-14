/**
 * 前端默认配置
 */

import { commonConfig } from "@common/config/main.ts";
import type { AppConfig } from "@dreamer/dweb";

/** 前端配置 */
const config: AppConfig = {
  name: "view-ssg-advanced-example-frontend",
  version: commonConfig.version,

  server: {
    port: commonConfig.frontendPort,
    host: "0.0.0.0",
  },

  render: {
    engine: "view",
    mode: "ssg",
    ssg: {
      // 动态路由按参数展开：/users/[id] 生成 /users/1、/users/2、/users/3
      // 实际项目可从数据库读取 ID 列表后传入
      dynamicRoutes: {
        "/users/[id]": ["1", "2", "3"],
      },
    },
  },

  router: {
    routesDir: "./src/frontend/routes",
  },

  logger: {
    level: "info",
    format: "text",
  },
};

export default config;
