/**
 * 默认配置文件
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "react-ssg-basic-example",
  version: "1.0.0",
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  render: {
    engine: "react",
    mode: "ssg",
    ssg: {
      // 动态路由按参数展开：/user/[id] 生成 /user/1、/user/2、/user/3
      // 实际项目可从数据库读取 ID 列表后传入
      dynamicRoutes: {
        "/user/[id]": ["1", "2", "3"],
      },
    },
  },
  router: {
    routesDir: "./src/routes",
  },
  logger: {
    level: "info",
    format: "text",
  },
};

export default config;
