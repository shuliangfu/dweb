/**
 * DWeb 框架应用配置文件
 * 用于创建应用实例并配置中间件和插件
 * 
 * 注意：此文件只用于配置，不直接启动服务
 * 服务启动通过 CLI 命令：deno task dev 或 deno task start
 */

import { AppConfig, cors, i18n, theme, store } from '@dreamer/dweb';
import { createServicePlugin } from '@plugins/register-services.ts';
import { services } from '@services/mod.ts';

export const config: AppConfig = {
  middleware: [
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  ],
  plugins: [
    i18n({
      languages: [
        { code: 'en-US', name: 'English' },
        { code: 'zh-CN', name: '中文' },
      ],
		}),
		theme({
			defaultTheme: 'light', // 'light' | 'dark' | 'auto'
			storageKey: 'theme',
			injectDataAttribute: true,
			injectBodyClass: true,
			transition: true,
		}),
		store({
			persist: true,
			storageKey: 'store',
		}),
		createServicePlugin(services),
  ],
};

export default config;
