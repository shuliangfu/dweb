/**
 * 后台管理入口
 */

import { commonConfig } from "@common/config/main.ts";
import { App } from "@dreamer/dweb";
import { staticPlugin } from "@dreamer/plugins/static";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";
import { getEnv } from "@dreamer/runtime-adapter";

const app = new App({
  name: `${commonConfig.appName}-backend`,
  version: commonConfig.version,
  server: {
    port: commonConfig.backendPort,
    host: "localhost",
  },
  render: {
    engine: "react",
    mode: "hybrid",
  },
  router: {
    routesDir: "./src/backend/routes",
  },
  logger: {
    level: "info",
  },
});

const isDev = getEnv("DENO_ENV") === "dev";

app.registerPlugin(tailwindPlugin({
  cssEntry: "src/backend/assets/tailwind.css",
  assetsPath: isDev ? "/assets" : "/client/assets",
}));

app.registerPlugin(staticPlugin({
  statics: [
    { root: "src/backend/assets", prefix: "/assets" },
    { root: "dist/backend/client/assets", prefix: "/client/assets" },
  ],
}));

console.log(`🚀 后台管理启动: http://localhost:${commonConfig.backendPort}`);
app.start();
