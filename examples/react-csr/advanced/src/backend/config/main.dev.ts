/**
 * 后端开发环境配置
 * 框架会自动与 main.ts 深度合并，只需写增量覆盖
 */

export default {
  render: { debug: false },
  router: { debug: false },
  server: {
    host: "127.0.0.1",
  },
  build: {
    client: { debug: false },
    server: { debug: false },
  },
  logger: {
    level: "debug",
  },
};
