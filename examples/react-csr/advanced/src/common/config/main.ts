/**
 * 公共配置
 */

export const commonConfig = {
  appName: "react-csr-advanced-example",
  version: "1.0.0",
  apiBasePath: "/api",

  build: {
    server: {
      external: [
        "tailwindcss",
        "lightningcss",
        "react",
        "react-dom",
        "react-dom/server",
        "react/jsx-runtime",
      ],
    },
  },
};

/** 默认导出供框架 loadModuleConfig 深度合并（module.default || module） */
export default commonConfig;
