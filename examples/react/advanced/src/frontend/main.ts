/**
 * 前端入口
 */

import { commonConfig } from "@common/config/main.ts";
import { App } from "@dreamer/dweb";
import { staticPlugin } from "@dreamer/plugins/static";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";
import { getEnv } from "@dreamer/runtime-adapter";

const app = new App({
  name: `${commonConfig.appName}-frontend`,
  version: commonConfig.version,
  server: {
    port: commonConfig.frontendPort,
    host: "localhost",
  },
  render: {
    engine: "react",
    mode: "hybrid",
  },
  router: {
    routesDir: "./src/frontend/routes",
  },
  logger: {
    level: "info",
  },
});

const isDev = getEnv("DENO_ENV") === "dev";

app.registerPlugin(tailwindPlugin({
  cssEntry: "src/frontend/assets/tailwind.css",
  assetsPath: isDev ? "/assets" : "/client/assets",
}));

app.registerPlugin(staticPlugin({
  statics: [
    { root: "src/frontend/assets", prefix: "/assets" },
    { root: "dist/frontend/client/assets", prefix: "/client/assets" },
  ],
}));

console.log(`🚀 前端服务器启动: http://localhost:${commonConfig.frontendPort}`);
app.start();
