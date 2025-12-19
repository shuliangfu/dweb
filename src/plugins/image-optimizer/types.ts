/**
 * 图片优化插件类型定义
 */

/**
 * 图片格式
 */
export type ImageFormat = 'jpeg' | 'jpg' | 'png' | 'webp' | 'avif' | 'gif' | 'svg';

/**
 * 图片尺寸配置
 */
export interface ImageSize {
  /** 宽度 */
  width: number;
  /** 高度 */
  height?: number;
  /** 后缀（用于生成文件名） */
  suffix?: string;
}

/**
 * 响应式图片配置
 */
export interface ResponsiveImageConfig {
  /** 断点配置（宽度） */
  breakpoints?: number[];
  /** 默认尺寸 */
  defaultSize?: ImageSize;
  /** 是否生成 srcset */
  generateSrcset?: boolean;
  /** 是否生成 sizes 属性 */
  generateSizes?: boolean;
}

/**
 * WebP 配置
 */
export interface WebPConfig {
  /** 是否生成 WebP 格式 */
  enabled?: boolean;
  /** WebP 质量（0-100） */
  quality?: number;
  /** 是否同时保留原格式 */
  keepOriginal?: boolean;
}

/**
 * AVIF 配置
 */
export interface AVIFConfig {
  /** 是否生成 AVIF 格式 */
  enabled?: boolean;
  /** AVIF 质量（0-100） */
  quality?: number;
  /** 是否同时保留原格式 */
  keepOriginal?: boolean;
}

/**
 * 图片压缩配置
 */
export interface CompressionConfig {
  /** 是否启用压缩 */
  enabled?: boolean;
  /** 压缩质量（0-100，仅用于有损格式） */
  quality?: number;
  /** 是否优化 SVG */
  optimizeSvg?: boolean;
  /** 最大文件大小（字节），超过此大小才压缩 */
  maxFileSize?: number;
}

/**
 * 占位符配置
 */
export interface PlaceholderConfig {
  /** 是否生成占位符 */
  enabled?: boolean;
  /** 占位符类型 */
  type?: 'blur' | 'color' | 'lqip'; // blur: 模糊图, color: 主色, lqip: 低质量图片占位符
  /** 占位符尺寸 */
  size?: ImageSize;
}

/**
 * 懒加载配置
 */
export interface LazyLoadConfig {
  /** 是否启用懒加载 */
  enabled?: boolean;
  /** 懒加载属性名（默认 'loading'） */
  attribute?: string;
  /** 懒加载值（默认 'lazy'） */
  value?: string;
}

/**
 * 图片优化插件选项
 */
export interface ImageOptimizerPluginOptions {
  /** 图片目录（相对于项目根目录） */
  imageDir?: string | string[];
  /** 输出目录（相对于构建输出目录） */
  outputDir?: string;
  /** 压缩配置 */
  compression?: CompressionConfig;
  /** WebP 配置 */
  webp?: WebPConfig;
  /** AVIF 配置 */
  avif?: AVIFConfig;
  /** 响应式图片配置 */
  responsive?: ResponsiveImageConfig;
  /** 占位符配置 */
  placeholder?: PlaceholderConfig;
  /** 懒加载配置 */
  lazyLoad?: LazyLoadConfig;
  /** 排除的文件（支持 glob 模式） */
  exclude?: string[];
  /** 包含的文件（支持 glob 模式） */
  include?: string[];
  /** 是否在 HTML 中自动转换图片标签 */
  autoTransform?: boolean;
}

