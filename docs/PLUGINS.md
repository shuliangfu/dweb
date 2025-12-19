# DWeb 插件推荐

本文档列出了 DWeb 框架推荐的插件，按优先级分类。

## 📋 插件分类

### 🔴 高优先级（生产必需）

#### 1. SEO 插件
**功能**：自动生成 SEO meta 标签、Open Graph、Twitter Cards
- 自动注入 meta 标签到 HTML
- 支持 Open Graph 协议
- 支持 Twitter Cards
- 支持 JSON-LD 结构化数据
- 自动生成 sitemap.xml（可选）

**使用场景**：所有需要 SEO 优化的网站

**推荐指数**：⭐⭐⭐⭐⭐

---

#### 2. Sitemap 插件
**功能**：自动生成 sitemap.xml 和 robots.txt
- 自动扫描路由生成 sitemap
- 支持动态路由配置
- 自动生成 robots.txt
- 支持多语言 sitemap

**使用场景**：所有需要搜索引擎索引的网站

**推荐指数**：⭐⭐⭐⭐⭐

---

#### 3. PWA 插件
**功能**：生成 Progressive Web App 支持
- 自动生成 manifest.json
- 生成 Service Worker
- 离线支持
- 安装提示
- 缓存策略

**使用场景**：需要 PWA 功能的 Web 应用

**推荐指数**：⭐⭐⭐⭐

---

#### 4. 图片优化插件
**功能**：自动优化图片资源
- 自动压缩图片
- 生成 WebP 格式
- 生成响应式图片（srcset）
- 懒加载支持
- 占位符生成

**使用场景**：包含大量图片的网站

**推荐指数**：⭐⭐⭐⭐

---

### 🟡 中优先级（重要功能）

#### 5. i18n（国际化）插件
**功能**：多语言支持
- 自动检测语言
- 路由级语言切换
- 翻译文件管理
- 日期/数字格式化
- RTL 支持

**使用场景**：需要多语言支持的网站

**推荐指数**：⭐⭐⭐⭐

---

#### 6. RSS 插件
**功能**：自动生成 RSS Feed
- 自动扫描内容生成 RSS
- 支持多种 RSS 格式
- 自动更新
- 支持分类和标签

**使用场景**：博客、新闻网站

**推荐指数**：⭐⭐⭐

---

#### 7. 字体优化插件
**功能**：优化字体加载
- 自动生成字体子集
- 字体预加载
- 字体显示策略（font-display）
- 自动生成 @font-face

**使用场景**：使用自定义字体的网站

**推荐指数**：⭐⭐⭐

---

#### 8. Bundle Analyzer 插件
**功能**：分析构建产物大小
- 生成构建报告
- 可视化依赖关系
- 识别大文件
- 优化建议

**使用场景**：需要优化构建大小的项目

**推荐指数**：⭐⭐⭐

---

#### 9. 环境变量验证插件
**功能**：验证必需的环境变量
- 启动时验证环境变量
- 类型检查
- 默认值支持
- 友好的错误提示

**使用场景**：所有项目（防止配置错误）

**推荐指数**：⭐⭐⭐

---

### 🟢 低优先级（开发工具）

#### 10. TypeScript 增强插件
**功能**：增强 TypeScript 支持
- 类型检查增强
- 类型生成
- 路径别名支持

**使用场景**：使用 TypeScript 的项目

**推荐指数**：⭐⭐

---

#### 11. 代码检查插件
**功能**：集成代码检查工具
- Deno Lint 集成
- 自动修复
- 代码质量报告

**使用场景**：需要代码质量保证的项目

**推荐指数**：⭐⭐

---

#### 12. API 文档生成插件
**功能**：自动生成 API 文档
- 从代码生成文档
- 支持 OpenAPI/Swagger
- 交互式 API 文档

**使用场景**：提供 API 的项目

**推荐指数**：⭐⭐

---

## 🚀 已实现插件

### ✅ Tailwind CSS 插件
- 支持 Tailwind CSS v3 和 v4
- 开发环境实时编译
- 生产环境优化
- 自动扫描项目文件

**使用示例**：
```typescript
import { tailwind } from "@dreamer/dweb";

export default {
  plugins: [
    tailwind({ version: "v4" }),
  ],
};
```

---

### ✅ SEO 插件
- 自动生成 SEO meta 标签
- 支持 Open Graph 协议
- 支持 Twitter Cards
- 支持 JSON-LD 结构化数据
- 自动注入到 HTML

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
- 自动生成 sitemap.xml
- 自动生成 robots.txt
- 自动扫描路由文件
- 支持自定义 URL

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
- 自动生成 manifest.json
- 自动生成 Service Worker
- 离线支持
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
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      serviceWorker: {
        cacheStrategy: "network-first",
        precache: ["/", "/about", "/contact"],
      },
    }),
  ],
};
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

- [x] SEO 插件 ✅
- [x] Sitemap 插件 ✅
- [x] PWA 插件 ✅
- [x] 图片优化插件 ✅
- [x] i18n 插件 ✅
- [x] RSS 插件 ✅
- [ ] 字体优化插件
- [ ] Bundle Analyzer 插件
- [ ] 错误追踪插件（Sentry 集成）
- [ ] 性能监控插件
- [ ] 缓存插件（Redis/Memory）
- [ ] 压缩优化插件（Brotli/Gzip）
- [ ] 安全扫描插件
- [ ] 代码分割优化插件

---

## 💡 其他推荐插件

### 1. 错误追踪插件（Sentry 集成）
**功能**：集成 Sentry 错误追踪
- 自动捕获和上报错误
- 性能监控
- 用户反馈
- 发布跟踪

**推荐指数**：⭐⭐⭐⭐⭐（生产环境强烈推荐）

---

### 2. 性能监控插件
**功能**：性能指标收集和监控
- Web Vitals 指标收集
- 页面加载时间监控
- API 响应时间监控
- 自定义性能指标

**推荐指数**：⭐⭐⭐⭐

---

### 3. 缓存插件
**功能**：智能缓存管理
- Redis 缓存支持
- 内存缓存支持
- 缓存策略配置
- 缓存失效管理

**推荐指数**：⭐⭐⭐⭐

---

### 4. 压缩优化插件
**功能**：响应压缩优化
- Brotli 压缩
- Gzip 压缩
- 智能压缩策略
- 压缩级别配置

**推荐指数**：⭐⭐⭐（框架已有压缩中间件，此插件可增强）

---

### 5. 安全扫描插件
**功能**：安全漏洞扫描
- 依赖漏洞扫描
- 代码安全扫描
- 安全头部检查
- 安全报告生成

**推荐指数**：⭐⭐⭐

---

### 6. 代码分割优化插件
**功能**：智能代码分割
- 路由级代码分割
- 组件级代码分割
- 动态导入优化
- 预加载策略

**推荐指数**：⭐⭐⭐（框架已有基础支持，此插件可增强）

---

### 7. 主题切换插件
**功能**：深色/浅色主题支持
- 自动主题检测
- 主题持久化
- 主题切换动画
- 多主题支持

**推荐指数**：⭐⭐⭐

---

### 8. 表单验证插件
**功能**：表单验证和提交
- 客户端验证
- 服务端验证
- 验证规则配置
- 错误提示

**推荐指数**：⭐⭐⭐

---

### 9. 文件上传插件
**功能**：文件上传处理
- 多文件上传
- 文件类型验证
- 文件大小限制
- 上传进度显示

**推荐指数**：⭐⭐⭐

---

### 10. 邮件发送插件
**功能**：邮件发送服务
- SMTP 支持
- 模板邮件
- 批量发送
- 发送队列

**推荐指数**：⭐⭐⭐

---

**最后更新**: 2024-12-20

