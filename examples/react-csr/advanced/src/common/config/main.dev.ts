/**
 * 公共开发环境配置
 * 框架会自动与 main.ts 深度合并，只需写增量覆盖
 */

/** 开发环境公共配置（仅写 AppConfig 定义的字段） */
export const commonDevConfig = {
  render: { debug: false },
  router: { debug: false },
};

/** 默认导出供框架 loadModuleConfig 深度合并 */
export default commonDevConfig;
