/**
 * 公共配置
 * 前后端共享的配置
 */

/** 公共配置 */
export const commonConfig = {
  /** 应用版本 */
  version: "1.0.0",
  /** API 基础路径 */
  apiBasePath: "/api",
  /** 后端端口（e2e 与 basic 端口错开） */
  backendPort: 3034,
  /** 前端端口 */
  frontendPort: 3035,

  build: {
    server: {
      external: ["tailwindcss", "lightningcss"],
    },
  },
};
