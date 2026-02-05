/**
 * 前端默认配置
 * 框架会先加载 common/config 再加载本文件并合并
 */

import { commonConfig } from "@common/config/main.ts";
import type { AppConfig } from "@dreamer/dweb";

/** 前端配置 */
const config: AppConfig = {
  name: "react-ssg-advanced-example-frontend",
  version: commonConfig.version,

  server: {
    port: 3000,
    host: "127.0.0.1",
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
  },
};

export default config;
