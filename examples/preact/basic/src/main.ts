/**
 * 服务端入口
 * Preact Basic 示例项目
 */

import { App } from "@dreamer/dweb"
import { staticPlugin } from "@dreamer/plugins/static"
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss"
import { getEnv } from "@dreamer/runtime-adapter"

// 创建应用实例
const app = new App({
  name: "preact-basic-example",
  version: "1.0.0",

  // 服务器配置
  server: {
    port: 3000,
    host: "localhost",
    // 开发模式下的 HMR 配置（仅 DENO_ENV=dev 时生效；启动命令需带 --watch-hmr，见 deno.json tasks.dev）
    dev: {
      hmr: { enabled: true, path: "/__hmr" },
      watch: {
        paths: ["./src"],
        // 排除文件/目录：路径包含以下任一子串时忽略，不触发 HMR
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },

  // 渲染配置（hybrid：服务端渲染 + 客户端激活）
  render: {
    engine: "preact",
    mode: "hybrid",
    // mode: "ssg",
    // ssg: {
    //   // 动态路由按参数展开：/user/[id] 生成 /user/1、/user/2、/user/3
    //   // 实际项目可从数据库读取 ID 列表后传入
    //   dynamicRoutes: {
    //     "/user/[id]": ["1", "2", "3"],
    //   },
    // },
  },

  // 路由配置
  router: {
    routesDir: "./src/routes",
  },

  // 日志配置
  logger: {
    level: "info",
  },

  // 构建配置
  build: {
    server: {
      // // 入口文件
      // entry: "src/main.ts",
      // // 输出目录
      // output: "dist",
      // 使用 esbuild 编译成 JS 文件（调试用）
      // useNativeCompile: true 会使用 deno compile 生成可执行文件
      useNativeCompile: false,
    },
  },
});

const isDev = getEnv("DENO_ENV") === "dev";

// 注册 TailwindCSS 插件
app.registerPlugin(tailwindPlugin({
  cssEntry: "src/assets/tailwind.css",
  assetsPath: isDev ? "/assets" : "/client/assets",
}));

// 注册静态文件插件（单应用：客户端产物在 dist/client/assets）
app.registerPlugin(staticPlugin({
  statics: [
    { root: "assets", prefix: "/assets" },
    { root: "dist/client/assets", prefix: "/client/assets" },
  ],
}));

// 启动应用
app.start();
