/**
 * DWeb 框架应用配置文件
 * 用于创建应用实例并配置中间件和插件
 * 
 * 注意：此文件只用于配置，不直接启动服务
 * 服务启动通过 CLI 命令：deno task dev 或 deno task start
 */

import { createApp, cors, i18n } from '@dreamer/dweb';

// 创建应用实例
const app = createApp();

// 配置中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.plugin(
  i18n({
    languages: [
      { code: 'en-US', name: 'English' },
      { code: 'zh-CN', name: '中文' },
    ],
    defaultLanguage: 'en-US',
    translationsDir: 'common/locales',
    detection: { fromCookie: true },
  })
);

// app.use((req, res, next) => {
//   console.log('request', req.url);
//   next();
// });

// 可以添加更多中间件
// app.use(customMiddleware);

// 可以注册插件
// app.plugin(customPlugin);

// 导出应用实例
export default app;
