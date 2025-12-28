### static - 静态文件

```typescript
import { staticFiles } from "@dreamer/dweb/middleware";

server.use(staticFiles({
  dir: "assets", // 静态文件根目录（必需）
  prefix: "/assets", // URL 前缀（如果未配置，默认使用 dir 的名称）
  index: ["index.html"], // 索引文件名（字符串或数组，默认 ['index.html']）
  dotfiles: "ignore", // 点文件处理方式（'allow' | 'deny' | 'ignore'，默认 'ignore'）
  etag: true, // 是否启用 ETag（默认 true）
  lastModified: true, // 是否发送 Last-Modified（默认 true）
  maxAge: 0, // 缓存时间（秒，默认 0）
  outDir: "dist", // 构建输出目录（生产环境使用，如果未提供则自动检测）
  isProduction: false, // 是否为生产环境（如果未提供则自动检测）
  extendDirs: [ // 扩展的静态资源目录（如上传目录，这些目录不会被打包，始终从项目根目录读取）
    "uploads", // 字符串：目录路径
    { dir: "custom", prefix: "/custom" }, // 对象：目录路径和 URL 前缀
  ],
}));
```

#### 配置选项

**必需参数：**

- `dir` - 静态文件根目录

**可选参数：**

- `prefix` - URL 前缀（如果未配置，默认使用 dir 的名称）
- `index` - 索引文件名（字符串或数组，默认 ['index.html']）
- `dotfiles` - 点文件处理方式（'allow' | 'deny' | 'ignore'，默认 'ignore'）
- `etag` - 是否启用 ETag（默认 true）
- `lastModified` - 是否发送 Last-Modified（默认 true）
- `maxAge` - 缓存时间（秒，默认 0）
- `outDir` - 构建输出目录（生产环境使用，如果未提供则自动检测）
- `isProduction` - 是否为生产环境（如果未提供则自动检测）
- `extendDirs` - 扩展的静态资源目录数组（如上传目录，这些目录不会被打包，始终从项目根目录读取），可以是字符串或对象：
  - 字符串：目录路径
  - 对象：`{ dir: string, prefix?: string }` - 目录路径和 URL 前缀
