/**
 * 默认配置文件
 * 框架会自动加载 ./src/config/main.ts（及 main.dev.ts 等环境配置）
 * 支持环境变量 PORT 覆盖端口，供 e2e 等指定端口避免冲突
 */

import type { AppConfig, AppLanguage } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : 3006;
const language = getEnv("LANGUAGE") || "zh-CN";

const config: AppConfig = {
  name: "preact-basic-example-ssg",
  version: "1.0.0",
  language: language as AppLanguage,

  // 服务器配置（e2e 并行测试时端口区分；PORT 环境变量可覆盖）
  server: {
    port: serverPort,
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

  // 构建配置（服务端 external 含 preact 等，避免与动态加载的组件双实例导致 SSG/SSR 报错 r.__H）
  build: {
    server: {
      useNativeCompile: false,
      external: [
        "tailwindcss",
        "lightningcss",
        "preact",
        "preact-render-to-string",
        "preact/hooks",
        "preact/jsx-runtime",
      ],
    },
  },
};

export default config;
