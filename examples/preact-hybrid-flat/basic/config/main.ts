/**
 * 默认配置文件
 * 框架会自动加载 ./config/main.ts（无 src 目录，扁平结构）
 * 支持环境变量 PORT 覆盖端口，供 e2e 等指定端口避免冲突
 */

import type { AppConfig } from "@dreamer/dweb";
import { getEnv } from "@dreamer/runtime-adapter";

const portFromEnv = getEnv("PORT");
const serverPort = portFromEnv ? Number(portFromEnv) : 3009;

const config: AppConfig = {
  name: "preact-hybrid-flat-basic-example",
  version: "1.0.0",

  language: "zh-CN",

  // 服务器配置（e2e 并行测试时端口 3009，与 preact-hybrid=3002 等区分；PORT 环境变量可覆盖）
  server: {
    port: serverPort,
    host: "127.0.0.1",
  },

  // 渲染配置
  render: {
    engine: "preact",
    mode: "hybrid",
    // stream: true,
  },

  // 路由配置
  router: {
    routesDir: "./routes",
  },

  // 日志配置（main.dev.ts 开发环境已设置 level: "debug"）
  logger: {
    level: "info",
  },

  // 构建配置（服务端 external 含 preact 等，避免与动态加载的组件双实例导致 SSR 报错 r.__H）
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
    /** 资源处理：复制 assets、压缩并 hash 化图片后输出到 client/assets/images */
    assets: {
      publicDir: "assets",
      assetsDir: "assets",
      /** 排除会被其他插件编译的 CSS 源文件，只保留编译产物（如 tailwind.xxx.css） */
      exclude: ["tailwind.css", "uno.css", "index.css"],
      images: {
        compress: true,
        quality: 80, // 压缩质量 0-100，80 平衡质量与体积
        format: "webp", // 需 ImageMagick；若转换失败可改为 "original" 仅做 hash
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
