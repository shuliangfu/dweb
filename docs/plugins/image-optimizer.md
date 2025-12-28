### image-optimizer - 图片优化

```typescript
import { imageOptimizer } from "@dreamer/dweb/plugins";

usePlugin(imageOptimizer({
  imageDir: "assets/images", // 图片目录（相对于项目根目录），可以是字符串或数组
  outputDir: "dist/images", // 输出目录（相对于构建输出目录）
  compression: { // 压缩配置
    enabled: true,
    quality: 80, // 压缩质量（0-100，仅用于有损格式）
    optimizeSvg: true, // 是否优化 SVG
    maxFileSize: 1024 * 1024, // 最大文件大小（字节），超过此大小才压缩
  },
  webp: { // WebP 配置
    enabled: true,
    quality: 80, // WebP 质量（0-100）
    keepOriginal: false, // 是否同时保留原格式
  },
  avif: { // AVIF 配置
    enabled: true,
    quality: 80, // AVIF 质量（0-100）
    keepOriginal: false, // 是否同时保留原格式
  },
  responsive: { // 响应式图片配置
    breakpoints: [320, 640, 1024, 1920], // 断点配置数组（宽度）
    defaultSize: { width: 1920, height: 1080, suffix: "-lg" }, // 默认尺寸对象
    generateSrcset: true, // 是否生成 srcset
    generateSizes: true, // 是否生成 sizes 属性
  },
  placeholder: { // 占位符配置
    enabled: true,
    type: "blur", // 占位符类型（'blur' | 'color' | 'lqip'）
    size: { width: 20, height: 20 }, // 占位符尺寸对象
  },
  lazyLoad: { // 懒加载配置
    enabled: true,
    attribute: "loading", // 懒加载属性名（默认 'loading'）
    value: "lazy", // 懒加载值（默认 'lazy'）
  },
  exclude: ["**/*.svg"], // 排除的文件数组（支持 glob 模式）
  include: ["**/*.{jpg,jpeg,png}"], // 包含的文件数组（支持 glob 模式）
  autoTransform: true, // 是否在 HTML 中自动转换图片标签（默认 true）
}));
```

#### 配置选项

**可选参数：**

- `imageDir` - 图片目录（相对于项目根目录），可以是字符串或数组
- `outputDir` - 输出目录（相对于构建输出目录）
- `compression` - 压缩配置对象（enabled, quality, optimizeSvg, maxFileSize）
- `webp` - WebP 配置对象（enabled, quality, keepOriginal）
- `avif` - AVIF 配置对象（enabled, quality, keepOriginal）
- `responsive` - 响应式图片配置对象（breakpoints, defaultSize, generateSrcset, generateSizes）
- `placeholder` - 占位符配置对象（enabled, type, size）
- `lazyLoad` - 懒加载配置对象（enabled, attribute, value）
- `exclude` - 排除的文件数组（支持 glob 模式）
- `include` - 包含的文件数组（支持 glob 模式）
- `autoTransform` - 是否在 HTML 中自动转换图片标签（默认 true）
