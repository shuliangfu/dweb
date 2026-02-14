/**
 * 默认配置文件
 * 框架会自动加载 ./src/config/main.ts（及 main.dev.ts 等环境配置）
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "view-hybrid-basic-example",
  version: "1.0.0",

  language: "zh-CN",

  // 服务器配置（e2e 并行测试时与 view-csr/react-csr/react-hybrid 端口区分）
  server: {
    port: 3012,
    host: "127.0.0.1",
  },

  // 渲染配置
  render: {
    engine: "view",
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

  // 构建配置
  build: {
    server: {
      useNativeCompile: false,
      external: ["tailwindcss", "lightningcss"],
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
