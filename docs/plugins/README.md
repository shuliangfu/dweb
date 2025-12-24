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
├── store/              # 状态管理插件
├── tailwind/           # Tailwind CSS 插件
├── theme/              # 主题插件
└── mod.ts              # 模块导出
```

## 使用插件

### 基本用法

```typescript
import { usePlugin } from "@dreamer/dweb/core/plugin";
import { seo } from "@dreamer/dweb/plugins";

usePlugin(seo({
  title: "My App",
  description: "My awesome app",
}));
```

## 文档导航

- [seo - SEO 优化](./seo.md)
- [sitemap - 网站地图](./sitemap.md)
- [pwa - 渐进式 Web 应用](./pwa.md)
- [i18n - 国际化](./i18n.md)
- [tailwind - Tailwind CSS](./tailwind.md)
- [cache - 缓存](./cache.md)
- [email - 邮件发送](./email.md)
- [file-upload - 文件上传](./file-upload.md)
- [form-validator - 表单验证](./form-validator.md)
- [image-optimizer - 图片优化](./image-optimizer.md)
- [performance - 性能监控](./performance.md)
- [rss - RSS 订阅](./rss.md)
- [store - 状态管理](./store.md)
- [theme - 主题切换](./theme.md)

## 相关文档

- [核心模块](../core.md) - 框架核心功能
- [扩展系统](../extensions/README.md) - 扩展系统
- [中间件](../middleware/README.md) - 中间件系统
