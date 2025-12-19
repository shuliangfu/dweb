/**
 * PWA 插件类型定义
 */

/**
 * Manifest 图标配置
 */
export interface ManifestIcon {
  /** 图标路径 */
  src: string;
  /** 图标尺寸 */
  sizes: string;
  /** 图标类型 */
  type?: string;
  /** 图标用途 */
  purpose?: 'any' | 'maskable' | 'monochrome';
}

/**
 * Manifest 快捷方式配置
 */
export interface ManifestShortcut {
  /** 快捷方式名称 */
  name: string;
  /** 快捷方式简短名称 */
  short_name?: string;
  /** 快捷方式描述 */
  description?: string;
  /** 快捷方式 URL */
  url: string;
  /** 快捷方式图标 */
  icons?: ManifestIcon[];
}

/**
 * Manifest 相关应用配置
 */
export interface ManifestRelatedApplication {
  /** 平台 */
  platform: 'web' | 'play' | 'itunes' | 'windows';
  /** 应用 ID */
  id?: string;
  /** 应用 URL */
  url?: string;
}

/**
 * PWA Manifest 配置
 */
export interface PWAManifestConfig {
  /** 应用名称 */
  name: string;
  /** 应用简短名称 */
  short_name?: string;
  /** 应用描述 */
  description?: string;
  /** 应用主题色 */
  theme_color?: string;
  /** 应用背景色 */
  background_color?: string;
  /** 显示模式 */
  display?: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';
  /** 起始 URL */
  start_url?: string;
  /** 作用域 */
  scope?: string;
  /** 方向 */
  orientation?: 'any' | 'natural' | 'landscape' | 'portrait' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary';
  /** 图标列表 */
  icons?: ManifestIcon[];
  /** 快捷方式 */
  shortcuts?: ManifestShortcut[];
  /** 相关应用 */
  related_applications?: ManifestRelatedApplication[];
  /** 是否首选相关应用 */
  prefer_related_applications?: boolean;
  /** 语言 */
  lang?: string;
  /** 目录 */
  dir?: 'ltr' | 'rtl' | 'auto';
}

/**
 * Service Worker 配置
 */
export interface ServiceWorkerConfig {
  /** Service Worker 文件路径 */
  swPath?: string;
  /** Service Worker 作用域 */
  scope?: string;
  /** 缓存策略 */
  cacheStrategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';
  /** 要缓存的资源 */
  precache?: string[];
  /** 运行时缓存规则 */
  runtimeCache?: Array<{
    urlPattern: string | RegExp;
    handler: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';
    options?: {
      cacheName?: string;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
      };
    };
  }>;
  /** 离线页面路径 */
  offlinePage?: string;
}

/**
 * PWA 插件选项
 */
export interface PWAPluginOptions {
  /** Manifest 配置 */
  manifest: PWAManifestConfig;
  /** Service Worker 配置 */
  serviceWorker?: ServiceWorkerConfig | false;
  /** manifest.json 输出路径（相对于输出目录） */
  manifestOutputPath?: string;
  /** Service Worker 输出路径（相对于输出目录） */
  swOutputPath?: string;
  /** 是否在 HTML 中自动注入 manifest 和 Service Worker 链接 */
  injectLinks?: boolean;
}

