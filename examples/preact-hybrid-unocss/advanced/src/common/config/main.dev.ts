/**
 * 公共开发环境配置
 * 框架会自动与 main.ts 深度合并，只需写增量覆盖
 */

/** 开发环境公共配置 */
export const commonDevConfig = {
  /** 开发模式 */
  isDev: true,
  /** 调试模式 */
  debug: true,
  render: { debug: true },
  router: { debug: true },
};

export default commonDevConfig;
