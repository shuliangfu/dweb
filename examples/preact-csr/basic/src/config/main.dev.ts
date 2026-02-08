/**
 * 开发环境配置
 * 框架会自动与 main.ts 深度合并，只需写增量覆盖
 */

import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: {
    host: "127.0.0.1",
  },
  build: {
    client: { debug: true }, // 开启后输出 esbuild resolver 调试信息（如 React/Preact 解析）
    server: { debug: true },
  },
  logger: {
    level: "debug",
    format: "text",
  },
  hotReload: true,
};

export default config;
