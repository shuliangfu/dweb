# 插件

DWeb 框架提供了强大的插件系统，支持各种功能扩展。

## 目录结构

```
src/plugins/
├── cache/              # 缓存插件
├── email/              # 邮件插件
├── file-upload/        # 文件上传插件
├── form-validator/     # 表单验证插件
├── i18n/               # 国际化插件
├── image-optimizer/    # 图片优化插件
├── performance/        # 性能监控插件
├── pwa/                # PWA 插件
├── rss/                # RSS 插件
├── seo/                # SEO 插件
├── sitemap/            # 网站地图插件
├── tailwind/           # Tailwind CSS 插件
├── theme/              # 主题插件
└── mod.ts              # 模块导出
```

## 使用插件

### 基本用法

```typescript
import { usePlugin } from '@dreamer/dweb/core/plugin';
import { seo } from '@dreamer/dweb/plugins';

usePlugin(seo({
  title: 'My App',
  description: 'My awesome app',
}));
```

## 内置插件

### seo - SEO 优化

```typescript
import { seo } from '@dreamer/dweb/plugins';

usePlugin(seo({
  title: 'My App',
  description: 'My awesome app',
  keywords: ['web', 'framework'],
  openGraph: {
    type: 'website',
    image: 'https://example.com/og-image.jpg',
  },
  twitter: {
    card: 'summary_large_image',
  },
}));
```

### sitemap - 网站地图

```typescript
import { sitemap } from '@dreamer/dweb/plugins';

usePlugin(sitemap({
  hostname: 'https://example.com',
  urls: [
    { url: '/', changefreq: 'daily', priority: 1.0 },
    { url: '/about', changefreq: 'monthly', priority: 0.8 },
  ],
}));
```

### pwa - 渐进式 Web 应用

```typescript
import { pwa } from '@dreamer/dweb/plugins';

usePlugin(pwa({
  manifest: {
    name: 'My App',
    shortName: 'App',
    description: 'My awesome app',
    themeColor: '#000000',
    backgroundColor: '#ffffff',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  serviceWorker: {
    enabled: true,
    path: '/sw.js',
  },
}));
```

### i18n - 国际化

```typescript
import { i18n } from '@dreamer/dweb/plugins';

usePlugin(i18n({
  defaultLanguage: 'en',
  languages: {
    en: { name: 'English', flag: '🇺🇸' },
    zh: { name: '中文', flag: '🇨🇳' },
  },
  translations: {
    en: {
      hello: 'Hello',
      world: 'World',
    },
    zh: {
      hello: '你好',
      world: '世界',
    },
  },
}));
```

### tailwind - Tailwind CSS

```typescript
import { tailwind } from '@dreamer/dweb/plugins';

usePlugin(tailwind({
  version: 'v4', // 'v3' | 'v4'
  config: {
    content: ['./routes/**/*.{tsx,ts}'],
    theme: {
      extend: {},
    },
  },
}));
```

### cache - 缓存

```typescript
import { cache, CacheManager } from '@dreamer/dweb/plugins';

usePlugin(cache({
  store: 'memory', // 'memory' | 'redis' | 'file'
  ttl: 3600, // 默认 TTL（秒）
}));

// 使用缓存管理器
const cacheManager = CacheManager.getInstance();
await cacheManager.set('key', 'value', 3600);
const value = await cacheManager.get('key');
```

### email - 邮件发送

```typescript
import { email, sendEmail } from '@dreamer/dweb/plugins';

usePlugin(email({
  smtp: {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
      user: 'user@example.com',
      pass: 'password',
    },
  },
}));

// 发送邮件
await sendEmail({
  to: 'recipient@example.com',
  subject: 'Hello',
  text: 'Hello World',
  html: '<h1>Hello World</h1>',
});
```

### file-upload - 文件上传

```typescript
import { fileUpload, handleFileUpload } from '@dreamer/dweb/plugins';

usePlugin(fileUpload({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png'],
  uploadDir: './uploads',
}));

// 处理文件上传
server.setHandler(async (req, res) => {
  if (req.method === 'POST' && req.path === '/upload') {
    const result = await handleFileUpload(req, {
      field: 'file',
      maxSize: 5 * 1024 * 1024,
    });
    res.json(result);
  }
});
```

### form-validator - 表单验证

```typescript
import { formValidator, validateForm } from '@dreamer/dweb/plugins';

usePlugin(formValidator({
  rules: {
    name: { type: 'string', required: true, min: 2, max: 50 },
    email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  },
}));

// 验证表单
const result = await validateForm(data, {
  name: { type: 'string', required: true },
  email: { type: 'string', required: true },
});
```

### image-optimizer - 图片优化

```typescript
import { imageOptimizer } from '@dreamer/dweb/plugins';

usePlugin(imageOptimizer({
  formats: ['webp', 'avif'],
  sizes: [320, 640, 1024, 1920],
  quality: 80,
}));
```

### performance - 性能监控

```typescript
import { performance } from '@dreamer/dweb/plugins';

usePlugin(performance({
  enabled: true,
  collectMetrics: true,
  reportInterval: 60000, // 1 分钟
}));
```

### rss - RSS 订阅

```typescript
import { rss } from '@dreamer/dweb/plugins';

usePlugin(rss({
  feeds: [
    {
      title: 'My Blog',
      description: 'My awesome blog',
      link: 'https://example.com',
      items: [
        {
          title: 'Post 1',
          link: 'https://example.com/post-1',
          description: 'Post 1 description',
          pubDate: new Date(),
        },
      ],
    },
  ],
}));
```

### theme - 主题切换

```typescript
import { theme } from '@dreamer/dweb/plugins';

usePlugin(theme({
  themes: {
    light: {
      colors: {
        primary: '#000000',
        background: '#ffffff',
      },
    },
    dark: {
      colors: {
        primary: '#ffffff',
        background: '#000000',
      },
    },
  },
  defaultTheme: 'light',
}));
```

## 创建自定义插件

```typescript
import type { Plugin } from '@dreamer/dweb/core/plugin';

const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  setup(app) {
    // 插件初始化
    console.log('Plugin initialized');
    
    // 添加中间件
    app.use((req, res, next) => {
      // 自定义逻辑
      next();
    });
  },
  teardown(app) {
    // 插件清理
    console.log('Plugin teardown');
  },
};

usePlugin(myPlugin);
```

## API 参考

### Plugin 接口

```typescript
interface Plugin {
  name: string;
  version?: string;
  setup: (app: AppLike) => void | Promise<void>;
  teardown?: (app: AppLike) => void | Promise<void>;
}
```

### 使用插件

```typescript
import { usePlugin } from '@dreamer/dweb/core/plugin';

usePlugin(plugin);
```

---

## 📚 相关文档

### 核心文档
- [文档总览](./README.md)
- [核心模块](./core.md)
- [配置文档](./configuration.md)
- [开发指南](./development.md)

### 功能模块
- [数据库](./database.md)
- [GraphQL](./graphql.md)
- [WebSocket](./websocket.md)
- [Session](./session.md)
- [Cookie](./cookie.md)
- [Logger](./logger.md)

### 扩展模块
- [中间件](./middleware.md)
- [插件](./plugins.md)

### 部署与运维
- [Docker 部署](./docker.md)

