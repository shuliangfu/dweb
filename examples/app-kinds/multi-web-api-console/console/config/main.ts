import type { AppConfig, ConsoleMiddleware } from "@dreamer/dweb";
import { readyPlugin } from "../plugins/ready.ts";

const configTag: ConsoleMiddleware = async (ctx, next) => {
  console.log(`[config] ${ctx.name}`);
  return await next();
};

export default {
  name: "kinds-console",
  kind: "console",
  version: "1.0.0",
  plugins: [readyPlugin()],
  middlewares: [configTag],
  router: { routesDir: "./console/routes" },
  console: { slim: true },
  logger: {
    level: "info",
    format: "text",
    output: { console: true },
  },
} satisfies AppConfig;
