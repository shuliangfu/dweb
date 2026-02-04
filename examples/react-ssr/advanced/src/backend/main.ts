/**
 * 后台管理入口
 * 配置由框架自动加载 common/config + src/backend/config 并合并
 */

import { App } from "@dreamer/dweb";
import { staticPlugin } from "@dreamer/plugins/static";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";
import { getEnv } from "@dreamer/runtime-adapter";

const app = new App({
  configDirectory: "./src/backend/config",
});

const isDev = getEnv("DENO_ENV") === "dev";

app.registerPlugin(tailwindPlugin({
  output: "dist/backend/client/assets",
  cssEntry: "src/backend/assets/tailwind.css",
  assetsPath: isDev ? "/assets" : "/client/assets",
}));

app.registerPlugin(staticPlugin({
  statics: [
    { root: "src/backend/assets", prefix: "/assets" },
    { root: "dist/backend/client/assets", prefix: "/client/assets" },
  ],
}));

console.log("🚀 后台管理启动: http://localhost:3001");
app.start();
