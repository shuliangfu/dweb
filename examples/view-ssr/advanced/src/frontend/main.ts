/**
 * 前端入口
 * SSR 渲染服务器
 */

import { default as frontendConfig } from "@frontend/config/main.ts";
import { commonConfig } from "@common/config/main.ts";
import { App } from "@dreamer/dweb";
import { staticPlugin } from "@dreamer/plugins/static";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";

// 创建前端应用实例
const app = new App({
  name: "view-ssr-advanced-example-frontend",
  version: commonConfig.version,

  // 服务器配置（端口写死在前端应用配置中）
  server: {
    port: frontendConfig.server.port,
    host: "127.0.0.1",
  },

  // 渲染配置
  render: {
    engine: "view",
    mode: "ssr",
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
    { root: "src/frontend/assets", prefix: "/assets" },
    { root: "dist/frontend/client/assets", prefix: "/assets" },
  ],
}));

// 启动应用
console.log(
  `🚀 前端服务器启动: http://localhost:${frontendConfig.server.port}`,
);
app.start();
