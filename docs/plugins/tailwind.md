### tailwind - Tailwind CSS

```typescript
import { tailwind } from "@dreamer/dweb/plugins";

usePlugin(tailwind({
  version: "v4", // Tailwind CSS 版本：'v3' | 'v4'（默认为 'v4'）
  cssPath: "assets/style.css", // 主 CSS 文件路径（如 'assets/style.css'），用于开发环境实时编译。如果不指定，默认查找 'assets/style.css'
  cssFiles: "assets/**/*.css", // CSS 文件路径（支持 glob 模式），用于构建时处理多个文件。默认为 'assets/**/*.css'
  exclude: ["**/*.test.tsx"], // 排除的文件（支持 glob 模式）
  content: ["./routes/**/*.{tsx,ts}", "./components/**/*.{tsx,ts}"], // 内容扫描路径（用于 Tailwind CSS 扫描项目文件）。默认为 ['./routes/**/*.{tsx,ts,jsx,js}', './components/**/*.{tsx,ts,jsx,js}']
  autoprefixer: { // v3 特定选项：Autoprefixer 配置
    env: "production",
    cascade: true,
    add: true,
    remove: true,
    flexbox: true,
    grid: "autoplace",
  },
  optimize: true, // v4 特定选项：是否优化（生产环境默认 true）
}));
```

#### 配置选项

**可选参数：**

- `version` - Tailwind CSS 版本：'v3' | 'v4'（默认为 'v4'）
- `cssPath` - 主 CSS 文件路径（如 'assets/style.css'），用于开发环境实时编译。如果不指定，默认查找 'assets/style.css'
- `cssFiles` - CSS 文件路径（支持 glob 模式），用于构建时处理多个文件。默认为 'assets/**/*.css'
- `exclude` - 排除的文件（支持 glob 模式）
- `content` - 内容扫描路径（用于 Tailwind CSS 扫描项目文件）。默认为 ['./routes/**/*.{tsx,ts,jsx,js}', './components/**/*.{tsx,ts,jsx,js}']
- `autoprefixer` - v3 特定选项：Autoprefixer 配置对象，包含 env, cascade, add, remove, flexbox, grid, overrideBrowserslist 等
- `optimize` - v4 特定选项：是否优化（生产环境默认 true）
