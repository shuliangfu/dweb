/**
 * 公共开发环境配置
 * 框架会自动与 main.ts 深度合并，只需写增量覆盖
 */

/** 开发环境公共配置（仅写 AppConfig 定义的字段） */
export const commonDevConfig = {
  render: { debug: false },
  router: { debug: false },
};

export default commonDevConfig;
