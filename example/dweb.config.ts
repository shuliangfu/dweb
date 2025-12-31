/**
 * DWeb 框架示例配置文件
 * 单应用模式
 */

import { type AppConfig, cors, seo, tailwind } from "@dreamer/dweb";

const config: AppConfig = {
  name: "example",
  
  // 渲染适配器配置
  render: {
    // 渲染引擎，可选值：'preact' | 'react' | 'vue3'
    // 默认为 'preact'
    engine: "preact",
    // 渲染模式，可选值：'ssr' | 'csr' | 'hybrid'
    // - ssr: 服务端渲染（默认）
    // - csr: 客户端渲染
    // - hybrid: 混合渲染（服务端渲染 + 客户端 hydration）
    // 注意：这个配置是全局的，可以在页面组件中通过导出 renderMode 来覆盖
    mode: "ssr",
	},
	
	prefetch: {
    enabled: false,
    loading: false,
    routes: ["*", "!/docs/*"],
    mode: "batch",
  },


  // 开发配置
  dev: {
    // open: true,
    hmrPort: 24678,
    reloadDelay: 300,
  },

  // 构建配置
  build: {
		outDir: ".dist",
		split: true,
  },

  // 服务器配置
  server: {
    port: 3000,
    host: "127.0.0.1", // 本地开发环境
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

  // // 队列配置
  // queue: {
  //   // 队列适配器类型：'memory' | 'redis'
  //   // - memory: 内存队列（使用内存存储，进程重启后数据丢失）
  //   // - redis: Redis 队列（使用 Redis 存储，支持持久化和分布式）
  //   // adapter: "memory", // 或 "redis"
  //   // Redis 配置（仅在 adapter 为 "redis" 时使用）
  //   // redis: {
  //   //   host: "127.0.0.1",
  //   //   port: 6379,
  //   //   password: "your_password", // 可选
  //   //   db: 0, // 可选，默认为 0
  //   // },
  //   // 队列列表配置
  //   // queues: {
  //   //   // 默认队列
  //   //   default: {
  //   //     concurrency: 1, // 最大并发数
  //   //     retry: 3, // 重试次数
  //   //     retryInterval: 1000, // 重试间隔（毫秒）
  //   //     priority: "normal", // 队列优先级：'low' | 'normal' | 'high' | 'urgent'
  //   //     // storage: "memory", // 存储类型（如果不指定，使用全局 adapter）
  //   //     // keyPrefix: "queue:", // Redis Key 前缀（仅在 storage 为 redis 时使用）
  //   //   },
  //   //   // 高优先级队列
  //   //   high: {
  //   //     concurrency: 5,
  //   //     retry: 5,
  //   //     retryInterval: 500,
  //   //     priority: "high",
  //   //   },
  //   //   // 低优先级队列
  //   //   low: {
  //   //     concurrency: 1,
  //   //     retry: 1,
  //   //     retryInterval: 2000,
  //   //     priority: "low",
  //   //   },
  //   // },
  // },

  // // 数据库配置
  // database: {
  //   type: "mongodb",
  //   connection: {
  //     host: "127.0.0.1",
  //     port: 27017,
  //     database: "dweb_example",
  //     // username: "your_username", // 如果需要认证，取消注释并填写
  //     // password: "your_password", // 如果需要认证，取消注释并填写
  //     // authSource: "admin", // 认证数据库，默认为 admin
  //   },
  //   // MongoDB 连接池配置
  //   mongoOptions: {
  //     maxPoolSize: 10, // 最大连接池大小
  //     minPoolSize: 1, // 最小连接池大小
  //     timeoutMS: 5000, // 服务器选择超时时间（毫秒）
  //     maxRetries: 3, // 最大重试次数
  //     retryDelay: 1000, // 重试延迟（毫秒）
  //   },
	// },
	
  // 插件配置
  plugins: [
    // Tailwind CSS v4 插件（默认使用 v4）
    tailwind({
      version: "v4",
      cssPath: "assets/tailwind-v4.css", // 指定主 CSS 文件路径
      optimize: true, // 生产环境优化
		}),
		// tailwind({
    //   version: "v3",
		// 	cssPath: "assets/tailwind-v3.css", // 指定主 CSS 文件路径
    // }),
    seo({
      title: "DWeb - 现代化的全栈 Web 框架",
      description: "基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web 框架",
      keywords: "DWeb, Deno, Preact, Tailwind CSS, Web 框架",
      author: "DWeb",
    }),
  ],
  middleware: [
    // 注意：Deno.serve 有内置的自动压缩功能，支持 Brotli 和 Gzip
    // 无需手动配置压缩中间件，Deno.serve 会自动根据客户端的 Accept-Encoding 头进行压缩
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  ],
};

export default config;
