/**
 * DWeb 框架配置文件
 * 项目: app-mult
 * 模式: 多应用模式
 */

import { tailwind, cors, type DWebConfig } from '@dreamer/dweb';

const config: DWebConfig = {
  // 开发配置（全局，也可以在每个应用中配置）
  dev: {
    // open: true,
    hmrPort: 24678,
    reloadDelay: 300
  },
  
  // Cookie 配置（全局）
  cookie: {
    secret: 'your-secret-key-here-change-in-production'
  },
  
  // Session 配置（全局）
  session: {
    secret: 'your-session-secret-here-change-in-production',
    store: 'memory',
    maxAge: 3600000, // 1小时
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
        host: 'localhost'
      },
      routes: {
        dir: 'backend/routes',
        ignore: ['**/*.test.ts', '**/*.test.tsx']
      },
      static: {
        dir: 'backend/assets',
        prefix: '/assets'
      },
      plugins: [
        tailwind({
          version: 'v4',
          cssPath: 'backend/assets/tailwind.css',
          optimize: true,
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
        outDir: 'dist/backend'
      },
    },
    {
      name: 'mobile',
      renderMode: 'hybrid', // 'ssr' | 'csr' | 'hybrid'
      server: {
        port: 3001,
        host: 'localhost'
      },
      routes: {
        dir: 'mobile/routes',
        ignore: ['**/*.test.ts', '**/*.test.tsx']
      },
      static: {
        dir: 'mobile/assets',
        prefix: '/assets'
      },
      plugins: [
        tailwind({
          version: 'v4',
          cssPath: 'mobile/assets/tailwind.css',
          optimize: true,
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
        outDir: 'dist/mobile'
      },
    }
  ]
};

export default config;
