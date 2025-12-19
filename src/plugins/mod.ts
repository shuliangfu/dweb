/**
 * 插件导出
 */

export { tailwind } from './tailwind/index.ts';
export { seo } from './seo/index.ts';
export { sitemap } from './sitemap/index.ts';
export { pwa } from './pwa/index.ts';
export { imageOptimizer } from './image-optimizer/index.ts';
export { i18n } from './i18n/index.ts';

// 导出类型
export type { TailwindPluginOptions, AutoprefixerOptions } from './tailwind/types.ts';
export type { SEOPluginOptions, OpenGraphConfig, TwitterCardConfig, JSONLDConfig } from './seo/types.ts';
export type { SitemapPluginOptions, SitemapUrl } from './sitemap/types.ts';
export type { PWAPluginOptions, PWAManifestConfig, ServiceWorkerConfig, ManifestIcon, ManifestShortcut, ManifestRelatedApplication } from './pwa/types.ts';
export type { ImageOptimizerPluginOptions, ImageFormat, ImageSize, ResponsiveImageConfig, WebPConfig, CompressionConfig, PlaceholderConfig, LazyLoadConfig } from './image-optimizer/types.ts';
export type { I18nPluginOptions, LanguageConfig, TranslationData, DateFormatOptions, NumberFormatOptions } from './i18n/types.ts';

