/**
 * 前端入口
 * 配置由框架自动加载 common/config + src/frontend/config 并合并
 */

import { App } from "@dreamer/dweb";
import { staticPlugin } from "@dreamer/plugins/static";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";
import { getEnv } from "@dreamer/runtime-adapter";

const app = new App({
  configDirectory: "./src/frontend/config",
});

const isDev = getEnv("DENO_ENV") === "dev";

app.registerPlugin(tailwindPlugin({
  output: "dist/frontend/client/assets",
  cssEntry: "src/frontend/assets/tailwind.css",
  assetsPath: isDev ? "/assets" : "/client/assets",
}));

app.registerPlugin(staticPlugin({
  statics: [
    { root: "src/frontend/assets", prefix: "/assets" },
    { root: "dist/frontend/client/assets", prefix: "/client/assets" },
  ],
}));

console.log("🚀 前端服务器启动: http://localhost:3000");
app.start();
