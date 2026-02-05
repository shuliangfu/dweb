/**
 * 公共配置
 * 前后端共享的配置，框架会自动与各应用配置深度合并
 */

/** 公共配置（供其他模块直接引用，如需要 version 时） */
export const commonConfig = {
  /** 应用名称 */
  appName: "preact-hybrid-advanced-example",
  /** 应用版本 */
  version: "1.0.0",
  /** 前端端口（供 frontend 使用） */
  frontendPort: 3000,
  /** 后端端口（供 backend 使用） */
  backendPort: 3001,
};

/** 默认导出，框架会自动深度合并到各应用配置 */
export default commonConfig;
