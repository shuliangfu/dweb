/**
 * 开发环境配置
 * 框架会自动与 main.ts 深度合并，只需写增量覆盖
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: {
    host: "127.0.0.1",
  },
  render: { debug: true },
  router: { debug: true },
  build: {
    client: { debug: true },
    server: { debug: true },
  },
  logger: {
    level: "debug",
    format: "text",
  },
  hotReload: true,
};

export default config;
