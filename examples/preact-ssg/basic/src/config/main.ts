/**
 * 默认配置文件
 * 框架会自动加载 ./src/config/main.ts（及 main.dev.ts 等环境配置）
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "preact-basic-example-ssg",
  version: "1.0.0",

  // 服务器配置
  server: {
    port: 3000,
    host: "127.0.0.1",
    dev: {
      hmr: { enabled: true, path: "/__hmr" },
      watch: {
        paths: ["./src"],
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },

  // 渲染配置
  render: {
    engine: "preact",
    mode: "ssg",
    ssg: {
      // 动态路由按参数展开：/user/[id] 生成 /user/1、/user/2、/user/3
      // 实际项目可从数据库读取 ID 列表后传入
      dynamicRoutes: {
        "/user/[id]": ["1", "2", "3"],
      },
    },
  },

  // 路由配置
  router: {
    routesDir: "./src/routes",
  },

  // 日志配置
  logger: {
    level: "info",
  },

  // 构建配置
  build: {
    server: {
      useNativeCompile: false,
    },
  },
};

export default config;
