# DWeb 插件文档

本文档列出了 DWeb 框架的所有已实现插件和使用方法。

## 🚀 已实现插件

### ✅ Tailwind CSS 插件

支持 Tailwind CSS v3 和 v4，自动编译和优化。

**功能**：
- 支持 Tailwind CSS v3 和 v4
- 开发环境实时编译
- 生产环境优化
- 自动扫描项目文件

**使用示例**：
```typescript
import { tailwind } from "@dreamer/dweb";

export default {
  plugins: [
    tailwind({ 
      version: "v4",
      cssPath: "assets/style.css",
    }),
  ],
};
```

**配置选项**：
- `version`: 'v3' | 'v4' - Tailwind 版本
- `cssPath`: 主 CSS 文件路径
- `cssFiles`: CSS 文件路径（支持 glob）
- `content`: 内容扫描路径
- `optimize`: 是否优化（生产环境）

---

### ✅ SEO 插件

自动生成 SEO meta 标签、Open Graph、Twitter Cards、JSON-LD。

**功能**：
- 自动生成 SEO meta 标签
- 支持 Open Graph 协议
- 支持 Twitter Cards
- 支持 JSON-LD 结构化数据（自动压缩）
- 自动注入到 HTML
- 自动移除重复的 SEO 标签

**使用示例**：
```typescript
import { seo } from "@dreamer/dweb";

export default {
  plugins: [
    seo({
      defaultTitle: "My Website",
      titleTemplate: "%s | My Website",
      defaultDescription: "这是一个很棒的网站",
      siteUrl: "https://example.com",
      defaultImage: "https://example.com/og-image.jpg",
      openGraph: {
        siteName: "My Website",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        site: "@mysite",
      },
      jsonLd: {
        enabled: true,
        type: "WebSite",
      },
    }),
  ],
};
```

---

### ✅ Sitemap 插件

自动生成 sitemap.xml 和 robots.txt。

**功能**：
- 自动生成 sitemap.xml
- 自动生成 robots.txt
- 自动扫描路由文件
- 支持自定义 URL
- 支持排除规则

**使用示例**：
```typescript
import { sitemap } from "@dreamer/dweb";

export default {
  plugins: [
    sitemap({
      siteUrl: "https://example.com",
      exclude: ["/admin/**", "/api/**"],
      defaultChangefreq: "weekly",
      defaultPriority: 0.5,
      generateRobots: true,
    }),
  ],
};
```

---

### ✅ PWA 插件

生成 Progressive Web App 支持。

**功能**：
- 自动生成 manifest.json
- 自动生成 Service Worker
- 离线支持
- 多种缓存策略
- 自动注入 PWA 链接

**使用示例**：
```typescript
import { pwa } from "@dreamer/dweb";

export default {
  plugins: [
    pwa({
      manifest: {
        name: "My App",
        short_name: "App",
        description: "我的 PWA 应用",
        theme_color: "#000000",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      serviceWorker: {
        cacheStrategy: "network-first",
        precache: ["/", "/about"],
      },
    }),
  ],
};
```

---

### ✅ 图片优化插件

自动优化图片资源。

**功能**：
- 自动压缩图片（SVG 优化）
- 支持 WebP 格式转换（框架，需外部工具）
- **支持 AVIF 格式转换**（框架，需外部工具）
- 生成响应式图片（srcset）
- 支持懒加载
- 自动转换 HTML 中的图片标签

**使用示例**：
```typescript
import { imageOptimizer } from "@dreamer/dweb";

export default {
  plugins: [
    imageOptimizer({
      imageDir: "assets",
      compression: {
        enabled: true,
        quality: 80,
        optimizeSvg: true,
      },
      webp: {
        enabled: true,
        quality: 80,
      },
      avif: {
        enabled: true,
        quality: 80,
      },
      responsive: {
        breakpoints: [640, 768, 1024, 1280],
        generateSrcset: true,
      },
      lazyLoad: {
        enabled: true,
      },
    }),
  ],
};
```

---

### ✅ i18n（国际化）插件

多语言支持。

**功能**：
- 自动检测语言（URL、查询参数、Cookie、Accept-Language）
- 路由级语言切换
- 翻译文件管理
- 支持 RTL 语言
- 自动注入语言属性到 HTML
- 全局 `$t()` 和 `t()` 函数支持

**使用示例**：
```typescript
import { i18n } from "@dreamer/dweb";

export default {
  plugins: [
    i18n({
      languages: [
        { code: "zh-CN", name: "简体中文", default: true },
        { code: "en", name: "English" },
      ],
      translationsDir: "locales",
      detection: {
        fromPath: true,
        fromQuery: true,
        fromCookie: true,
        fromHeader: true,
      },
    }),
  ],
};
```

**详细文档**：请参考 [i18n 使用指南](./I18N_USAGE.md)

---

### ✅ RSS 插件

自动生成 RSS Feed。

**功能**：
- 自动生成 RSS Feed
- 支持 RSS 2.0 标准
- 支持分类 Feed
- 支持自定义条目

**使用示例**：
```typescript
import { rss } from "@dreamer/dweb";

export default {
  plugins: [
    rss({
      feed: {
        title: "My Blog",
        description: "我的博客",
        siteUrl: "https://example.com",
        language: "zh-CN",
      },
      items: [
        {
          title: "文章标题",
          link: "https://example.com/post/1",
          description: "文章描述",
          pubDate: new Date(),
        },
      ],
    }),
  ],
};
```

---

### ✅ 主题切换插件

深色/浅色主题支持。

**功能**：
- 支持深色/浅色/自动主题切换
- 自动检测系统主题
- 主题持久化存储（localStorage）
- 支持主题切换动画
- 全局函数：`setTheme()`, `getTheme()`, `toggleTheme()`

**使用示例**：
```typescript
import { theme } from "@dreamer/dweb";

export default {
  plugins: [
    theme({
      config: {
        defaultTheme: "auto",
        storageKey: "theme",
        injectDataAttribute: true,
        injectBodyClass: true,
        transition: true,
      },
    }),
  ],
};
```

**在页面中使用**：
```tsx
// 切换主题
<button onClick={() => toggleTheme()}>切换主题</button>

// 获取当前主题
const currentTheme = getTheme();
```

---

### ✅ 表单验证插件

客户端和服务端表单验证。

**功能**：
- 客户端和服务端验证
- 支持多种验证规则（required, email, url, number, min, max, minLength, maxLength, pattern, custom）
- 自定义验证函数
- 错误消息配置

**使用示例**：
```typescript
import { formValidator, validateForm } from "@dreamer/dweb";

export default {
  plugins: [
    formValidator(),
  ],
};

// 在 API 路由中使用
import { validateForm } from "@dreamer/dweb";

export async function POST(req: Request) {
  const data = await req.json();
  const result = validateForm(data, [
    {
      name: "email",
      rules: [
        { type: "required", message: "邮箱是必需的" },
        { type: "email", message: "请输入有效的邮箱地址" },
      ],
    },
    {
      name: "password",
      rules: [
        { type: "required" },
        { type: "minLength", value: 8, message: "密码至少 8 个字符" },
      ],
    },
  ]);
  
  if (!result.valid) {
    return Response.json({ errors: result.errors }, { status: 400 });
  }
  
  // 处理表单数据
}
```

---

### ✅ 文件上传插件

处理文件上传。

**功能**：
- 多文件上传支持
- 文件类型和大小验证
- 文件命名策略（original, timestamp, uuid, hash）
- 自动创建子目录（按日期）
- **图片居中裁切**（顶边对齐）
- **图片压缩**（WebP/AVIF 格式转换）

**使用示例**：
```typescript
import { fileUpload, handleFileUpload } from "@dreamer/dweb";

export default {
  plugins: [
    fileUpload({
      config: {
        uploadDir: "uploads",
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ["image/jpeg", "image/png"],
        allowMultiple: true,
        namingStrategy: "timestamp",
        createSubdirs: true,
        // 图片裁切配置
        imageCrop: {
          enabled: true,
          width: 800,
          height: 600,
          mode: "center", // 居中裁切
        },
        // 图片压缩配置
        imageCompress: {
          enabled: true,
          format: "webp", // 或 "avif"
          quality: 80,
          keepOriginal: false, // 是否保留原图
        },
      },
    }),
  ],
};

// 在 API 路由中使用
import { handleFileUpload } from "@dreamer/dweb";

export async function POST(req: Request) {
  const result = await handleFileUpload(req, {
    uploadDir: "uploads",
    maxFileSize: 5 * 1024 * 1024,
    allowedTypes: ["image/*"],
    // 图片处理配置
    imageCrop: {
      enabled: true,
      width: 1200,
      height: 800,
    },
    imageCompress: {
      enabled: true,
      format: "avif",
      quality: 85,
    },
  });
  
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  
  return Response.json({ files: result.files });
}
```

**安装图片处理库（Sharp）**：

图片裁切和压缩功能使用 Sharp 库。Sharp 已添加到 `deno.json` 的依赖中，安装方法：

```bash
# 方法 1：使用 deno install（推荐）
deno install

# 方法 2：使用 deno cache
deno cache --reload src/plugins/file-upload/index.ts

# 如果遇到构建脚本警告，运行：
deno approve-scripts
```

**注意事项**：
- Sharp 会自动下载预编译的二进制文件，通常**不需要**安装系统级别的图片库
- 如果遇到安装问题，可能需要安装系统依赖：
  - **macOS**: `brew install vips` 或确保已安装 Xcode Command Line Tools
  - **Linux**: `sudo apt-get install libvips-dev` 或 `sudo yum install vips-devel`
  - **Windows**: 通常不需要额外安装，Sharp 会自动处理

如果 Sharp 未安装，插件会跳过图片处理并给出警告，但不会影响其他功能。

---

### ✅ 性能监控插件

收集 Web Vitals 和性能指标。

**功能**：
- Web Vitals 指标收集（LCP, FID, CLS, FCP, TTFB）
- 页面加载时间监控
- API 响应时间监控
- 性能数据上报
- 采样率控制

**使用示例**：
```typescript
import { performance } from "@dreamer/dweb";

export default {
  plugins: [
    performance({
      config: {
        endpoint: "/api/performance",
        collectWebVitals: true,
        collectResourceTiming: true,
        collectApiTiming: true,
        logToConsole: true,
        sampleRate: 1.0,
      },
      onMetrics: async (metrics) => {
        // 自定义指标处理
        console.log("性能指标:", metrics);
      },
    }),
  ],
};
```

---

### ✅ 缓存插件

提供内存、Redis 和文件缓存支持。

**功能**：
- 内存缓存支持
- 文件缓存支持
- Redis 缓存支持（框架，需要 Redis 客户端库）
- 缓存过期管理（TTL）
- `getOrSet` 便捷方法

**使用示例**：
```typescript
import { cache, CacheManager } from "@dreamer/dweb";

export default {
  plugins: [
    // 内存缓存
    cache({
      config: {
        store: "memory",
        defaultTTL: 3600,
        maxSize: 100 * 1024 * 1024,
      },
    }),
    
    // 文件缓存
    cache({
      config: {
        store: "file",
        cacheDir: ".cache",
        defaultTTL: 3600,
      },
    }),
    
    // Redis 缓存（需要 Redis 客户端库）
    cache({
      config: {
        store: "redis",
        redis: {
          host: "localhost",
          port: 6379,
        },
        defaultTTL: 3600,
      },
    }),
  ],
};

// 在代码中使用
// 通过 app.cache 访问缓存管理器
const value = await app.cache.get("key");
await app.cache.set("key", "value", { ttl: 3600 });
const result = await app.cache.getOrSet("key", async () => {
  // 如果缓存不存在，执行此函数获取值
  return await fetchData();
});
```

---

### ✅ 邮件发送插件

SMTP 邮件发送支持。

**功能**：
- SMTP 邮件发送（框架，需要 SMTP 客户端库）
- 邮件模板支持
- 附件支持
- 模板变量替换

**使用示例**：
```typescript
import { email, sendEmail } from "@dreamer/dweb";

export default {
  plugins: [
    email({
      smtp: {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        user: "user@example.com",
        password: "password",
        from: "noreply@example.com",
        fromName: "My App",
      },
      templates: [
        {
          name: "welcome",
          html: "<h1>欢迎，{{name}}！</h1>",
          text: "欢迎，{{name}}！",
        },
      ],
    }),
  ],
};

// 在代码中使用
// 通过 app.sendEmail 发送邮件
await app.sendEmail({
  to: "user@example.com",
  subject: "欢迎",
  html: "<h1>欢迎使用我们的服务</h1>",
});

// 使用模板发送
await app.sendEmailTemplate("welcome", { name: "张三" }, {
  to: "user@example.com",
  subject: "欢迎",
});
```

---

## 📦 插件开发指南

如果你想开发自定义插件，请参考 [开发指南](./DEVELOPMENT.md#插件开发)。

### 插件生命周期钩子

- `onInit`: 应用初始化时调用
- `onRequest`: 每个请求处理前调用
- `onResponse`: 每个请求处理后调用
- `onError`: 发生错误时调用
- `onBuild`: 构建时调用
- `onStart`: 服务器启动时调用

### 插件示例

```typescript
import type { Plugin } from "@dreamer/dweb";

export function myPlugin(options: MyPluginOptions = {}): Plugin {
  return {
    name: "my-plugin",
    config: options,
    
    async onInit(app) {
      // 初始化逻辑
    },
    
    async onRequest(req, res) {
      // 请求处理逻辑
    },
    
    async onBuild(config) {
      // 构建时逻辑
    },
  };
}
```

---

## 🔮 未来计划

以下插件正在规划中：

- [ ] 字体优化插件
- [ ] Bundle Analyzer 插件
- [ ] 错误追踪插件（Sentry 集成）
- [ ] 压缩优化插件（Brotli/Gzip）
- [ ] 安全扫描插件
- [ ] 代码分割优化插件

---

**最后更新**: 2024-12-20
