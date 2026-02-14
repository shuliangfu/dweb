/**
 * 后端开发环境配置
 * 只需写增量覆盖，框架会自动与 main.ts 深度合并
 */
export default {
  server: {
    host: "127.0.0.1",
  },
  build: {
    client: { debug: false },
    server: { debug: false },
  },
  logger: {
    level: "debug",
    format: "text",
  },
};
