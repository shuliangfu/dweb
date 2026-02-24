/**
 * 默认配置文件
 * 框架会自动加载 ./src/config/main.ts（及 main.dev.ts 等环境配置）
 * 支持环境变量 PORT 覆盖端口，供 e2e 等指定端口避免冲突
 */

import type { AppConfig, AppLanguage } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : 3002;
const language = getEnv("LANGUAGE") || "zh-CN";

const config: AppConfig = {
  name: "preact-hybrid-basic-example",
  version: "1.0.0",
  language: language as AppLanguage,

  // 服务器配置（e2e 并行测试时与 preact-csr/react-csr/react-hybrid 端口区分；PORT 环境变量可覆盖）
  server: {
    port: serverPort,
    host: "127.0.0.1",
  },

  // 渲染配置
  render: {
    engine: "preact",
    mode: "hybrid",
  },

  // 路由配置
  router: {
    routesDir: "./src/routes",
  },

  // 日志配置（main.dev.ts 开发环境已设置 level: "debug"）
  logger: {
    level: "info",
  },

  // 构建配置（服务端 external 含 preact 等，避免与动态加载的 _app 双实例导致 SSR 输出为空）
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
    /** 资源处理：复制 src/assets、压缩并 hash 化图片后输出到 client/assets/images */
    assets: {
      publicDir: "src/assets",
      assetsDir: "assets",
      /** 排除会被其他插件编译的 CSS 源文件，只保留编译产物（如 tailwind.xxx.css） */
      exclude: ["tailwind.css", "uno.css", "index.css"],
      images: {
        compress: true,
        quality: 50, // 压缩质量 0-100，80 平衡质量与体积
        format: "avif", // 需 ImageMagick；若转换失败可改为 "original" 仅做 hash
        hash: true,
      },
    },
  },

  // 实时通信：type 为 websocket 时挂载到当前 HTTP 服务器同一端口（开发环境测试）
  socket: {
    adapter: "websocket",
    path: "/ws",
    debug: false, // 开启后通过 logger.debug 输出 WebSocket 请求路径、握手等调试信息
  },
};

export default config;
