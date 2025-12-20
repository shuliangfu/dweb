/**
 * DWeb 框架配置文件
 * 项目: example
 * 模式: 多应用模式
 */

import { tailwind, cors, type DWebConfig } from '@dreamer/dweb';

const config: DWebConfig = {
  // Cookie 配置（全局）
  cookie: {
    secret: 'your-secret-key-here-change-in-production',
  },

  // Session 配置（全局）
  session: {
    secret: 'your-session-secret-here-change-in-production',
    store: 'memory',
    maxAge: 3600000, // 1小时
    secure: false,
    httpOnly: true,
  },

  // 应用列表
  apps: [
    {
      name: 'dweb',
      renderMode: 'hybrid', // 'ssr' | 'csr' | 'hybrid'
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      routes: {
        dir: 'dweb/routes',
        ignore: ['**/*.test.ts', '**/*.test.tsx'],
      },
      static: {
        dir: 'dweb/assets',
      },
      plugins: [
        tailwind({
          version: 'v4',
          cssPath: 'dweb/assets/style.css',
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
        outDir: 'dist/dweb',
      },
      // 开发配置（全局）
      dev: {
        // open: true,
        hmrPort: 24678,
        reloadDelay: 300,
      },
    },
    {
      name: 'docs',
      renderMode: 'hybrid', // 'ssr' | 'csr' | 'hybrid'
      server: {
        port: 3001,
        host: '0.0.0.0',
      },
      routes: {
        dir: 'docs/routes',
        ignore: ['**/*.test.ts', '**/*.test.tsx'],
      },
      static: {
        dir: 'docs/assets',
      },
      plugins: [
        tailwind({
          version: 'v4',
          cssPath: 'docs/assets/style.css',
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
        outDir: 'dist/docs',
      },
      // 开发配置（全局）
      dev: {
        // open: true,
        hmrPort: 24678,
        reloadDelay: 300,
      },
    },
  ],
};

export default config;
