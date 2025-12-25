/**
 * DWeb 框架配置文件
 * 项目: app-mult
 * 模式: 多应用模式
 */

import { tailwind, cors, store, type DWebConfig } from '@dreamer/dweb';

const config: DWebConfig = {
  // 开发配置（全局，也可以在每个应用中配置）
  dev: {
    // open: true,
    hmrPort: 24678,
    reloadDelay: 300
  },
  
  // Cookie 配置（全局）
  cookie: {
    secret: 'your-secret-key-here'
  },
  
  // Session 配置（全局）
  session: {
    secret: 'your-secret-key-here',
    store: 'memory',
    maxAge: 3600, // 1小时（单位：秒）
    secure: false,
    httpOnly: true
  },
  
  // 应用列表
  apps: [
    {
      name: 'backend',
      renderMode: 'hybrid', // 'ssr' | 'csr' | 'hybrid'
      server: {
        port: 3000,
        host: '127.0.0.1'
      },
      routes: {
        dir: 'backend/routes',
        ignore: ['**/*.test.ts', '**/*.test.tsx'],
        // API 路由模式：'method'（方法路由，默认使用中划线格式，例如 /api/users/get-user）或 'rest'（RESTful API，基于 HTTP 方法，例如 GET /api/users）
        apiMode: 'method'
      },
      // 静态资源目录，默认为 'assets', prefix 为 /assets
      // static: {
      //   dir: 'backend/assets',
      //   prefix: '/assets'
      // },
      plugins: [
        tailwind({
          version: 'v4',
          cssPath: 'backend/assets/tailwind.css',
          optimize: true,
        }),
        // Store 状态管理插件（自动收集 stores 目录中的初始状态）
        store({
          persist: true, // 启用持久化，状态会保存到 localStorage
          storageKey: 'dweb-store',
        }),
      ],
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
      },
    },
    {
      name: 'frontend',
      renderMode: 'hybrid', // 'ssr' | 'csr' | 'hybrid'
      server: {
        port: 3001,
        host: '127.0.0.1'
      },
      routes: {
        dir: 'frontend/routes',
        ignore: ['**/*.test.ts', '**/*.test.tsx'],
        // API 路由模式：'method'（方法路由，默认使用中划线格式，例如 /api/users/get-user）或 'rest'（RESTful API，基于 HTTP 方法，例如 GET /api/users）
        apiMode: 'method'
      },
      // 静态资源目录，默认为 'assets', prefix 为 /assets
      // static: {
      //   dir: 'frontend/assets',
      //   prefix: '/assets'
      // },
      plugins: [
        tailwind({
          version: 'v4',
          cssPath: 'frontend/assets/tailwind.css',
          optimize: true,
        }),
        // Store 状态管理插件（自动收集 stores 目录中的初始状态）
        store({
          persist: true, // 启用持久化，状态会保存到 localStorage
          storageKey: 'dweb-store',
        }),
      ],
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
      },
    }
  ]
};

export default config;
