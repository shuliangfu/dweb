### tailwind - Tailwind CSS

DWeb 框架全面支持 Tailwind CSS，并率先支持 v4 版本（默认）。

#### 特性与优化

*   **智能回退机制**：
    优先尝试使用 Tailwind CLI（支持 v3 和 v4）进行编译，如果失败则自动回退到 PostCSS 处理，确保在各种环境下的兼容性。

*   **自动化运维**：
    能够自动检测并下载所需的 Tailwind CLI 二进制文件，实现开箱即用，无需用户手动安装依赖。

*   **环境自适应优化**：
    *   **开发环境**：使用内存缓存 (`Map`) 存储编译结果，带 TTL 控制，实现毫秒级热更新。
    *   **生产环境**：在构建阶段编译 CSS 并输出文件，运行时自动注入 `<link>` 标签，实现最佳性能。

#### 配置示例
import { tailwind } from "@dreamer/dweb/plugins";

usePlugin(tailwind({
  version: "v4", // Tailwind CSS 版本：'v3' | 'v4'（默认为 'v4'）
  cssPath: "assets/style.css", // 主 CSS 文件路径（如 'assets/style.css'），用于开发环境实时编译。如果不指定，默认查找 'assets/style.css'
  cssFiles: "assets/**/*.css", // CSS 文件路径（支持 glob 模式），用于构建时处理多个文件。默认为 'assets/**/*.css'
  exclude: ["**/*.test.tsx"], // 排除的文件（支持 glob 模式）
  // ...
}));
```

#### v4 vs v3

- **v4 (默认)**: 下一代 Tailwind CSS，基于 Rust (Lightning CSS) 的高性能引擎，无需配置 postcss，支持 CSS 变量配置。
- **v3**: 传统的 Tailwind CSS，依赖 PostCSS，生态成熟。

#### 配置选项

**可选参数：**

- `version` - Tailwind CSS 版本：'v3' | 'v4'（默认为 'v4'）
- `cssPath` - 主 CSS 文件路径（如 'assets/style.css'），用于开发环境实时编译。如果不指定，默认查找 'assets/style.css'
- `cssFiles` - CSS 文件路径（支持 glob 模式），用于构建时处理多个文件。默认为 'assets/**/*.css'
- `exclude` - 排除的文件（支持 glob 模式）
- `content` - 内容扫描路径（用于 Tailwind CSS 扫描项目文件）。默认为 ['./routes/**/*.{tsx,ts,jsx,js}', './components/**/*.{tsx,ts,jsx,js}']
- `autoprefixer` - v3 特定选项：Autoprefixer 配置对象，包含 env, cascade, add, remove, flexbox, grid, overrideBrowserslist 等
- `optimize` - v4 特定选项：是否优化（生产环境默认 true）
