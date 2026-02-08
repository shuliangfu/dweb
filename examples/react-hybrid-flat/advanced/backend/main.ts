/**
 * 后台管理入口
 * 配置由框架自动加载 common/config + backend/config（无 src 目录，扁平结构）
 */

import { App } from "@dreamer/dweb";
import { staticPlugin } from "@dreamer/plugins/static";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";

const app = new App();

app.registerPlugin(tailwindPlugin({
  output: "dist/backend/client/assets",
  cssEntry: "backend/assets/tailwind.css",
  assetsPath: "/assets",
}));

app.registerPlugin(staticPlugin({
  statics: [
    { root: "backend/assets", prefix: "/assets" },
    { root: "dist/backend/client/assets", prefix: "/assets" },
  ],
}));

app.start();
