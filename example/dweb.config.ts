/**
 * DWeb 框架示例配置文件
 * 单应用模式
 */

import { tailwind, cors, type AppConfig } from '@dreamer/dweb';

const config: AppConfig = {
  name: 'example',
  renderMode: 'hybrid', //'ssr' | 'csr' | 'hybrid';

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
    outDir: 'dist',
  },

  // 服务器配置
  server: {
    port: 3000,
    host: '0.0.0.0', // Docker 环境需要监听所有网络接口
  },

  // 路由配置
  routes: {
    dir: 'routes',
    ignore: ['**/*.test.ts', '**/*.test.tsx'],
  },

  // 静态资源目录，默认为 'assets'
  static: {
    dir: 'assets',
    prefix: '/assets', // 访问前缀，例如 /assets/logo.png
    maxAge: 86400, // 缓存 1 天
    index: ['index.html', 'index.htm'],
    dotfiles: 'deny', // 禁止访问隐藏文件
  },

  // Cookie 配置
  cookie: {
    secret: 'your-secret-key-here',
  },

  // Session 配置
  session: {
    secret: 'your-session-secret-here',
    store: 'memory',
    maxAge: 3600000, // 1小时
    secure: false,
    httpOnly: true,
  },

  // 插件配置
  plugins: [
    // Tailwind CSS v4 插件（默认使用 v4）
    tailwind({
      version: 'v4',
      cssPath: 'assets/style.css', // 指定主 CSS 文件路径
      optimize: true, // 生产环境优化
    }),
  ],
  middleware: [
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  ],
};

export default config;
