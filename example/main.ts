/**
 * DWeb 框架应用配置文件
 * 用于创建应用实例并配置中间件和插件
 *
 * 注意：此文件只用于配置，不直接启动服务
 * 服务启动通过 CLI 命令：deno task dev 或 deno task start
 */

import { AppConfig, cors, i18n, store, theme } from "@dreamer/dweb";
import { services } from "./services/mod.ts";
import { createServicePlugin } from "./plugins/register-services.ts";
import { shikiPlugin } from "./plugins/shiki.ts";

const config: AppConfig = {
  middleware: [
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
    // 可以在这里添加更多中间件
    // (req, res, next) => {
    //   console.log('request', req.url);
    //   next();
    // }
  ],
  plugins: [
    i18n({
      languages: [
        { code: "en-US", name: "English" },
        { code: "zh-CN", name: "中文" },
      ],
      defaultLanguage: "en-US",
      // defaultLanguage: 'zh-CN',
      translationsDir: "locales",
      detection: { fromCookie: true },
    }),
    theme({
      defaultTheme: "light", // 'light' | 'dark' | 'auto'
      storageKey: "theme",
      injectDataAttribute: true,
      injectBodyClass: true,
      transition: true,
    }),
    store({
      persist: true,
      storageKey: "store",
      // 不需要手动配置 initialState，会自动从已注册的 stores 中收集
      // store 插件会自动导入 stores/index.ts（如果存在）
    }),
    // 注册自定义服务
    createServicePlugin(services),
    // 初始化 Shiki
    shikiPlugin(),
    // 可以在这里注册更多插件
  ],
};

export default config;
