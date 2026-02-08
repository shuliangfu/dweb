/**
 * 服务端入口
 * React Basic 示例项目（无 src 目录，扁平结构）
 */

import { App } from "@dreamer/dweb";
import { staticPlugin } from "@dreamer/plugins/static";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";

// 创建应用实例
const app = new App({
  name: "react-hybrid-flat-basic-example",
  version: "1.0.0",

  // 服务器配置（e2e 并行测试时端口 3010，与 react-hybrid=3004 等区分）
  server: {
    port: 3010,
    host: "127.0.0.1",
    dev: {
      hmr: { enabled: true, path: "/__hmr" },
      watch: {
        paths: ["."],
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },

  // 渲染配置（hybrid：服务端渲染 + 客户端激活）
  render: {
    engine: "react",
    mode: "hybrid",
  },

  // 路由配置
  router: {
    routesDir: "./routes",
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
});

// 注册 TailwindCSS 插件
app.registerPlugin(tailwindPlugin({
  output: "dist/client/assets",
  cssEntry: "assets/tailwind.css",
  assetsPath: "/assets",
}));

// 注册静态文件插件
app.registerPlugin(staticPlugin({
  statics: [
    { root: "assets", prefix: "/assets" },
    { root: "dist/client/assets", prefix: "/assets" },
  ],
}));

// 启动应用
app.start();
