import type { AppConfig } from "@dreamer/dweb";

export default {
  name: "kinds-console",
  kind: "console",
  version: "1.0.0",
  router: { routesDir: "./console/routes" },
  logger: {
    level: "info",
    format: "text",
    output: { console: "auto" },
  },
} satisfies AppConfig;
