import type { AppConfig } from "@dreamer/dweb";

export default {
  name: "kinds-web",
  kind: "web",
  version: "1.0.0",
  server: { host: "127.0.0.1", port: 3410 },
  router: { routesDir: "./web/routes" },
  render: { engine: "view", mode: "csr" },
} satisfies AppConfig;
