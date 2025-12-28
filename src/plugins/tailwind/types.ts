/**
 * Tailwind CSS 插件类型定义
 */

/**
 * Autoprefixer 选项（用于 v3）
 */
export interface AutoprefixerOptions {
  // Browserslist 环境
  env?: string;
  // 是否使用 Visual Cascade（如果 CSS 未压缩）
  cascade?: boolean;
  // 是否添加前缀
  add?: boolean;
  // 是否移除过时的前缀
  remove?: boolean;
  // 是否为 @supports 参数添加前缀
  supports?: boolean;
  // 是否为 flexbox 属性添加前缀
  flexbox?: boolean | "no-2009";
  // 是否为 Grid Layout 属性添加 IE 10-11 前缀
  grid?: boolean | "autoplace" | "no-autoplace";
  // 自定义使用统计（用于 > 10% 的浏览器查询）
  stats?: {
    [browser: string]: {
      [version: string]: number;
    };
  };
  // 目标浏览器查询列表
  // 建议不使用此选项
  // 最佳实践是使用 `.browserslistrc` 配置文件或 `package.json` 中的 `browserslist` 键
  // 以便与 Babel、ESLint 和 Stylelint 共享目标浏览器配置
  overrideBrowserslist?: string | string[];
  // 在 Browserslist 配置中遇到未知浏览器版本时不报错
  ignoreUnknownVersions?: boolean;
}

/**
 * Tailwind CSS 插件选项
 */
export interface TailwindPluginOptions {
  // Tailwind CSS 版本：'v3' 或 'v4'，默认为 'v4'
  version?: "v3" | "v4";
  // 主 CSS 文件路径（如 'assets/style.css'），用于开发环境实时编译
  // 如果不指定，默认查找 'assets/style.css'
  cssPath?: string;
  // CSS 文件路径（支持 glob 模式），用于构建时处理多个文件
  // 默认为 'assets/**/*.css'
  cssFiles?: string | string[];
  // 排除的文件（支持 glob 模式）
  exclude?: string | string[];
  // 内容扫描路径（用于 Tailwind CSS 扫描项目文件）
  // 默认为 ['./routes/**/*.{tsx,ts,jsx,js}', './components/**/*.{tsx,ts,jsx,js}']
  content?: string | string[];
  // v3 特定选项：Autoprefixer 配置
  autoprefixer?: AutoprefixerOptions;
  // v4 特定选项：是否优化（生产环境默认 true）
  optimize?: boolean;
  // Tailwind CLI 可执行文件路径（可选）
  // 如果不指定，默认下载到项目根目录的 bin/ 目录
  // 用户可以指定自定义路径，例如移动到共享目录以避免重复下载
  cliPath?: string;
  // Tailwind CLI 版本（仅在自动下载时使用），默认为 "v4.0.0"
  cliVersion?: string;
}
