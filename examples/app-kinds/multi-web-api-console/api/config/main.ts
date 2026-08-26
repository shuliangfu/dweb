import type { AppConfig } from "@dreamer/dweb";

export default {
  name: "kinds-api",
  kind: "api",
  version: "1.0.0",
  server: { host: "127.0.0.1", port: 3411 },
  router: { routesDir: "./api/routes" },
} satisfies AppConfig;
