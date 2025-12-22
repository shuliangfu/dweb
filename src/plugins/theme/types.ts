/**
 * 主题切换插件类型定义
 */

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * 主题配置
 */
export interface ThemeConfig {
  /** 默认主题 */
  defaultTheme?: ThemeMode;
  /** 主题存储键名（localStorage） */
  storageKey?: string;
  /** 是否在 HTML 上添加 data-theme 属性 */
  injectDataAttribute?: boolean;
  /** 是否添加类名到 body */
  injectBodyClass?: boolean;
  /** 主题切换动画 */
  transition?: boolean;
  /** 自定义主题列表 */
  themes?: string[];
}

/**
 * 主题切换插件选项
 */
export interface ThemePluginOptions extends ThemeConfig {
  /** 是否在服务端注入主题脚本 */
  injectScript?: boolean;
}

