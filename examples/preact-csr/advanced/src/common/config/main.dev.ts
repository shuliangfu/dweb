/**
 * 公共开发环境配置
 */

import { commonConfig } from "./main.ts";

/** 开发环境公共配置 */
export const commonDevConfig = {
  ...commonConfig,
  /** 开发模式 */
  isDev: true,
  /** 调试模式 */
  debug: true,
};
