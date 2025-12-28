### pwa - 渐进式 Web 应用

```typescript
import { pwa } from "@dreamer/dweb/plugins";

usePlugin(pwa({
  manifest: { // PWA Manifest 配置（必需）
    name: "My App", // 应用名称（必需）
    short_name: "App", // 应用简短名称
    description: "My awesome app", // 应用描述
    theme_color: "#000000", // 应用主题色
    background_color: "#ffffff", // 应用背景色
    display: "standalone", // 显示模式（'fullscreen' | 'standalone' | 'minimal-ui' | 'browser'）
    start_url: "/", // 起始 URL
    scope: "/", // 作用域
    orientation: "portrait", // 方向（'any' | 'natural' | 'landscape' | 'portrait' 等）
    icons: [ // 图标列表数组
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcuts: [ // 快捷方式数组
      { name: "Home", url: "/", icons: [] },
    ],
    related_applications: [], // 相关应用数组
    prefer_related_applications: false, // 是否首选相关应用
    lang: "zh-CN", // 语言
    dir: "ltr", // 目录（'ltr' | 'rtl' | 'auto'）
  },
  serviceWorker: { // Service Worker 配置对象或 false（禁用）
    swPath: "/sw.js", // Service Worker 文件路径
    scope: "/", // Service Worker 作用域
    cacheStrategy: "network-first", // 缓存策略（'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only'）
    precache: ["/", "/about"], // 要缓存的资源数组
    runtimeCache: [ // 运行时缓存规则数组
      {
        urlPattern: /^https:\/\/api\.example\.com\//,
        handler: "network-first",
        options: {
          cacheName: "api-cache",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 3600,
          },
        },
      },
    ],
    offlinePage: "/offline.html", // 离线页面路径
  },
  manifestOutputPath: "manifest.json", // manifest.json 输出路径（相对于输出目录）
  swOutputPath: "sw.js", // Service Worker 输出路径（相对于输出目录）
  injectLinks: true, // 是否在 HTML 中自动注入 manifest 和 Service Worker 链接（默认 true）
}));
```

#### 配置选项

**必需参数：**

- `manifest` - PWA Manifest 配置对象，包含 name, short_name, description, theme_color, background_color, display, start_url, scope, orientation, icons, shortcuts, related_applications, prefer_related_applications, lang, dir 等

**可选参数：**

- `serviceWorker` - Service Worker 配置对象或 false（禁用），包含 swPath, scope, cacheStrategy, precache, runtimeCache, offlinePage
- `manifestOutputPath` - manifest.json 输出路径（相对于输出目录）
- `swOutputPath` - Service Worker 输出路径（相对于输出目录）
- `injectLinks` - 是否在 HTML 中自动注入 manifest 和 Service Worker 链接（默认 true）
