/**
 * 后台管理入口
 * 完整的管理后台应用
 */

import { commonConfig } from "@common/config/main.ts";
import { App } from "@dreamer/dweb";
import { staticPlugin } from "@dreamer/plugins/static";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";

// 创建后台管理应用实例
const app = new App({
  name: "view-ssg-advanced-example-backend",
  version: commonConfig.version,

  // 服务器配置
  server: {
    port: commonConfig.backendPort,
    host: "127.0.0.1",
  },

  // 渲染配置
  render: {
    engine: "view",
    mode: "ssg",
  },

  // 路由配置
  router: {
    routesDir: "./src/backend/routes",
  },

  // 日志配置
  logger: {
    level: "info",
  },
});

// 注册 TailwindCSS 插件
app.registerPlugin(tailwindPlugin({
  output: "dist/backend/client/assets",
  cssEntry: "src/backend/assets/tailwind.css",
  assetsPath: "/assets",
}));

// 注册静态文件插件
app.registerPlugin(staticPlugin({
  statics: [
    { root: "backend/assets", prefix: "/assets" },
    { root: "dist/backend/client/assets", prefix: "/assets" },
  ],
}));

// 启动应用
console.log(`🚀 后台管理启动: http://localhost:${commonConfig.backendPort}`);
app.start();
