/**
 * DWeb 框架示例配置文件
 * 单应用模式
 */

import { type AppConfig, cors, seo, tailwind } from "@dreamer/dweb";

const config: AppConfig = {
  name: "example",
  renderMode: "hybrid", //'ssr' | 'csr' | 'hybrid';

  // 全局渲染模式（可在页面组件中覆盖）
  // 可选值: 'ssr' | 'csr' | 'hybrid'
  // - ssr: 服务端渲染（默认）
  // - csr: 客户端渲染
  // - hybrid: 混合渲染（服务端渲染 + 客户端 hydration）
  // renderMode: 'ssr',

  // 开发配置
  dev: {
    // open: true,
    hmrPort: 24678,
    reloadDelay: 300,
  },

  // 构建配置
  build: {
    outDir: "dist",
  },

  // 服务器配置
  server: {
    port: 3000,
    host: "127.0.0.1", // Docker 环境需要监听所有网络接口
    tls: false, // 使用默认证书
  },

  // 路由配置
  routes: {
    dir: "routes",
    ignore: ["**/*.test.ts", "**/*.test.tsx"],
    // API 目录配置，默认为 'routes/api'，也可以配置为 'api' 等相对路径
    // apiDir: 'api',  // 如果配置为 'api'，则 API 文件应放在项目根目录的 api 文件夹中
  },

  // 静态资源目录，默认为 'assets'
  static: {
    dir: "assets",
    prefix: "/assets", // 访问前缀，例如 /assets/logo.png
    maxAge: 86400, // 缓存 1 天
    index: ["index.html", "index.htm"],
    dotfiles: "deny", // 禁止访问隐藏文件
    extendDirs: ["uploads"], // 扩展的静态资源目录
  },

  // Cookie 配置
  cookie: {
    secret: "462eec55bf89cd760e791e8ae7ffec888b95c21f8c79ac564e484337bc548493",
  },

  // Session 配置
  session: {
    secret: "525d78bd02739da55197c45cab91541652d32f508e9820e3fc57c8a7ff736a12",
    store: "memory",
    maxAge: 3600, // 1小时（单位：秒）
    secure: false,
    httpOnly: true,
  },

  prefetch: {
    enabled: true,
    loading: true,
		routes: ["*"]
  },

  // 插件配置
  plugins: [
    // Tailwind CSS v4 插件（默认使用 v4）
    tailwind({
      version: "v4",
      cssPath: "assets/tailwind.css", // 指定主 CSS 文件路径
      optimize: true, // 生产环境优化
    }),
    seo({
      title: "DWeb - 现代化的全栈 Web 框架",
      description: "基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web 框架",
      keywords: "DWeb, Deno, Preact, Tailwind CSS, Web 框架",
      author: "DWeb",
    }),
  ],
  middleware: [
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  ],
};

export default config;
