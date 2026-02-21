/**
 * 默认配置文件
 * 支持环境变量 PORT 覆盖端口，供 e2e 等指定端口避免冲突
 */

import type { AppConfig } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : 3008;

const config: AppConfig = {
  name: "react-ssg-basic-example",
  version: "1.0.0",
  server: {
    port: serverPort,
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
  build: {
    server: {
      external: ["tailwindcss", "lightningcss"],
    },
  },
};

export default config;
