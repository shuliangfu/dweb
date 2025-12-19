/**
 * DWeb 框架应用配置文件
 * 用于创建应用实例并配置中间件和插件
 * 
 * 注意：此文件只用于配置，不直接启动服务
 * 服务启动通过 CLI 命令：deno task dev 或 deno task start
 */

import { createApp, cors, staticFiles } from '@dreamer/dweb';

// 创建应用实例
const app = createApp();

// 配置中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 自定义静态资源配置（带访问前缀）
// 注意：框架也会自动添加一个不带 prefix 的 staticFiles 中间件
// 这样可以通过两种方式访问：
// - /assets/images/logo.png (通过这个配置)
// - /images/logo.png (通过框架自动添加的中间件)
app.use(
  staticFiles({
    dir: 'assets',
    prefix: '/assets', // 访问前缀，例如 /assets/images/logo.png
    maxAge: 86400, // 缓存 1 天
    index: ['index.html', 'index.htm'],
    dotfiles: 'deny', // 禁止访问隐藏文件
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
