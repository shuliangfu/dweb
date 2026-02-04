/**
 * 前端入口
 * SSR 渲染服务器
 */

import { commonConfig } from "@common/config/main.ts";
import { App } from "@dreamer/dweb";
import { staticPlugin } from "@dreamer/plugins/static";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";

// 创建前端应用实例
const app = new App({
  name: "preact-hybrid-advanced-example-frontend",
  version: commonConfig.version,

  // 服务器配置
  server: {
    port: commonConfig.frontendPort,
    host: "localhost",
  },

  // 渲染配置
  render: {
    engine: "preact",
    mode: "hybrid",
  },

  // 路由配置
  router: {
    routesDir: "./src/frontend/routes",
  },

  // 日志配置
  logger: {
    level: "info",
  },
});

// 注册 TailwindCSS 插件
app.registerPlugin(tailwindPlugin({
  output: "dist/frontend/client/assets",
  cssEntry: "src/frontend/assets/tailwind.css",
  assetsPath: "/assets",
}));

// 注册静态文件插件
app.registerPlugin(staticPlugin({
  statics: [
    { root: "frontend/assets", prefix: "/assets" },
    { root: "dist/frontend/client/assets", prefix: "/assets" },
  ],
}));

// 启动应用
console.log(`🚀 前端服务器启动: http://localhost:${commonConfig.frontendPort}`);
app.start();
