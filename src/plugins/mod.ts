/**
 * 插件导出
 */

export { tailwind } from './tailwind/index.ts';
export { seo } from './seo/index.ts';
export { sitemap } from './sitemap/index.ts';
export { pwa } from './pwa/index.ts';
export { imageOptimizer } from './image-optimizer/index.ts';
export { i18n, getI18n, getCurrentLanguage, isI18nInitialized } from './i18n/index.ts';
export { rss } from './rss/index.ts';
export { theme } from './theme/index.ts';
export { formValidator, validateForm, validateValue } from './form-validator/index.ts';
export { fileUpload, handleFileUpload } from './file-upload/index.ts';
export { performance } from './performance/index.ts';
export { cache, CacheManager } from './cache/index.ts';
export { email, sendEmail, renderTemplate } from './email/index.ts';

// 导出类型
export type { TailwindPluginOptions, AutoprefixerOptions } from './tailwind/types.ts';
export type {
  SEOPluginOptions,
  OpenGraphConfig,
  TwitterCardConfig,
  JSONLDConfig,
} from './seo/types.ts';
export type { SitemapPluginOptions, SitemapUrl } from './sitemap/types.ts';
export type {
  PWAPluginOptions,
  PWAManifestConfig,
  ServiceWorkerConfig,
  ManifestIcon,
  ManifestShortcut,
  ManifestRelatedApplication,
} from './pwa/types.ts';
export type {
  ImageOptimizerPluginOptions,
  ImageFormat,
  ImageSize,
  ResponsiveImageConfig,
  WebPConfig,
  CompressionConfig,
  PlaceholderConfig,
  LazyLoadConfig,
} from './image-optimizer/types.ts';
export type {
  I18nPluginOptions,
  LanguageConfig,
  TranslationData,
  DateFormatOptions,
  NumberFormatOptions,
} from './i18n/types.ts';
export type { RSSPluginOptions, RSSItem, RSSFeedConfig } from './rss/types.ts';
export type { ThemePluginOptions, ThemeConfig, ThemeMode } from './theme/types.ts';
export type {
  FormValidatorPluginOptions,
  ValidationRuleConfig,
  ValidationResult,
  FormValidationConfig,
  FieldValidation,
} from './form-validator/types.ts';
export type {
  FileUploadPluginOptions,
  FileUploadConfig,
  UploadResult,
  UploadedFile,
} from './file-upload/types.ts';
export type {
  PerformancePluginOptions,
  PerformanceConfig,
  PerformanceMetrics,
  WebVitals,
} from './performance/types.ts';
export type { CachePluginOptions, CacheConfig, CacheStore, CacheOptions } from './cache/types.ts';
export type {
  EmailPluginOptions,
  EmailOptions,
  EmailResult,
  EmailTemplate,
  EmailAttachment,
  SMTPConfig,
} from './email/types.ts';
