/**
 * 公共配置
 */

export const commonConfig = {
  appName: "react-hybrid-advanced-example",
  version: "1.0.0",
  apiBasePath: "/api",
  build: {
    server: {
      external: ["tailwindcss", "lightningcss"],
    },
  },
};
