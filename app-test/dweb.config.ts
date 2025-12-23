/**
 * DWeb 框架配置文件
 * 项目: app-test
 * 模式: 单应用模式
 */

import { tailwind, cors, store, type AppConfig } from '@dreamer/dweb';


const config: AppConfig = {
  name: 'app-test',
  renderMode: 'hybrid', // 'ssr' | 'csr' | 'hybrid'
  
  // 服务器配置
  server: {
    port: 3000,
    host: 'localhost'
  },
  
  // 路由配置
  routes: {
    dir: 'routes',
    ignore: ['**/*.test.ts', '**/*.test.tsx']
  },
  
  // 静态资源目录，默认为 'assets'
  // static: { dir: 'assets' },
  
  // 开发配置
  dev: {
    // open: true,
    hmrPort: 24678,
    reloadDelay: 300
  },
  
  // Cookie 配置
  cookie: {
    secret: 'your-secret-key-here'
  },
  
  // Session 配置
  session: {
    secret: 'your-secret-key-here',
    store: 'memory',
    maxAge: 3600, // 1小时（单位：秒）
    secure: false,
    httpOnly: true
  },
  
  // 插件配置
  plugins: [
    // Tailwind CSS v4 插件
    tailwind({
      version: 'v4',
      cssPath: 'assets/tailwind.css', // 指定主 CSS 文件路径
      optimize: true, // 生产环境优化
    }),
    // Store 状态管理插件（自动收集 stores 目录中的初始状态）
    store({
      persist: true, // 启用持久化，状态会保存到 localStorage
      storageKey: 'dweb-store',
    }),
  ],
  
  // 中间件配置
  middleware: [
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  ],
  
  // 构建配置
  build: {
    outDir: 'dist'
  }
};

export default config;
