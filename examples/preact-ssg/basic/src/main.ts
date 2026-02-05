/**
 * 服务端入口
 * Preact Basic 示例项目
 * 配置由框架自动加载 src/config/main.ts
 */

import { App } from "@dreamer/dweb";
import { staticPlugin } from "@dreamer/plugins/static";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";

const app = new App();

app.registerPlugin(tailwindPlugin({
  output: "dist/client/assets",
  cssEntry: "src/assets/tailwind.css",
  assetsPath: "/assets",
}));

app.registerPlugin(staticPlugin({
  statics: [
    { root: "assets", prefix: "/assets" },
    { root: "dist/client/assets", prefix: "/assets" },
  ],
}));

app.start();
