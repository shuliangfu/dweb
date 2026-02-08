/**
 * 后台管理入口
 * 完整的管理后台应用
 */

import { commonConfig } from "@common/config/main.ts";
import { App } from "@dreamer/dweb";
import { staticPlugin } from "@dreamer/plugins/static";
import { unocssPlugin } from "@dreamer/plugins/unocss";

// 创建后台管理应用实例
const app = new App({
  name: "preact-hybrid-advanced-example-backend",
  version: commonConfig.version,

  // 服务器配置
  server: {
    port: commonConfig.backendPort,
    host: "127.0.0.1",
  },

  // 渲染配置
  render: {
    engine: "preact",
    mode: "hybrid",
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

// 注册 UnoCSS 插件（显式使用 preset-wind3 兼容 Tailwind 类名）
app.registerPlugin(unocssPlugin({
  output: "dist/backend/client/assets",
  cssEntry: "src/backend/assets/uno.css",
  content: ["./src/backend/**/*.{ts,tsx}"],
  assetsPath: "/assets",
  // presets: ["@unocss/preset-wind3"],
  // 动态 class（如 badge 颜色）需 safelist 确保被生成
  safelist: [
    "bg-purple-100",
    "text-purple-700",
    "bg-blue-100",
    "text-blue-700",
    "bg-gray-100",
    "text-gray-700",
    "text-indigo-600",
    "hover:text-indigo-700",
  ],
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
