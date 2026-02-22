/**
 * 公共配置
 * 前后端共享的配置；端口号写在各应用自己的配置中，不在此处配置
 */

/** 公共配置 */
export const commonConfig = {
  /** 应用名称 */
  appName: "view-ssg-advanced-example",
  /** 应用版本 */
  version: "1.0.0",
  /** API 基础路径 */
  apiBasePath: "/api",
  build: {
    server: {
      external: ["tailwindcss", "lightningcss"],
    },
  },
};
