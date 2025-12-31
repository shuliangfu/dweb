/**
 * 插件导出
 */

export { seo } from "./seo/index.ts";
export { sitemap } from "./sitemap/index.ts";
export { pwa } from "./pwa/index.ts";
export { imageOptimizer } from "./image-optimizer/index.ts";
export {
  getCurrentLanguage,
  getI18n,
  i18n,
  isI18nInitialized,
} from "./i18n/index.ts";
export {
  getI18n as getI18nClient,
  getTranslations,
  setCurrentLanguage,
  translate,
} from "./i18n/client.ts";
export { rss } from "./rss/index.ts";
export { theme } from "./theme/index.ts";
export {
  getActualTheme,
  getTheme,
  getThemeManager,
  getThemeStore,
  getThemeValue,
  setTheme,
  subscribeTheme,
  switchTheme,
  toggleTheme,
} from "./theme/client.ts";
export {
  formValidator,
  validateForm,
  validateValue,
} from "./form-validator/index.ts";
export { fileUpload, handleFileUpload } from "./file-upload/index.ts";
export { performance } from "./performance/index.ts";
export { cache, CacheManager } from "./cache/index.ts";
export { email, renderTemplate, sendEmail } from "./email/index.ts";
export { store } from "./store/index.ts";

export type {
  JSONLDConfig,
  OpenGraphConfig,
  SEOPluginOptions,
  TwitterCardConfig,
} from "./seo/types.ts";
export type { SitemapPluginOptions, SitemapUrl } from "./sitemap/types.ts";
export type {
  ManifestIcon,
  ManifestRelatedApplication,
  ManifestShortcut,
  PWAManifestConfig,
  PWAPluginOptions,
  ServiceWorkerConfig,
} from "./pwa/types.ts";
export type {
  CompressionConfig,
  ImageFormat,
  ImageOptimizerPluginOptions,
  ImageSize,
  LazyLoadConfig,
  PlaceholderConfig,
  ResponsiveImageConfig,
  WebPConfig,
} from "./image-optimizer/types.ts";
export type {
  DateFormatOptions,
  I18nPluginOptions,
  LanguageConfig,
  NumberFormatOptions,
  TranslationData,
} from "./i18n/types.ts";
export type { RSSFeedConfig, RSSItem, RSSPluginOptions } from "./rss/types.ts";
export type {
  ThemeConfig,
  ThemeMode,
  ThemePluginOptions,
} from "./theme/types.ts";
export {
  getStore,
  getStoreState,
  resetStore,
  setStoreState,
  subscribeStore,
} from "./store/client.ts";
export type {
  FieldValidation,
  FormValidationConfig,
  FormValidatorPluginOptions,
  ValidationResult,
  ValidationRuleConfig,
} from "./form-validator/types.ts";
export type {
  FileUploadConfig,
  FileUploadPluginOptions,
  UploadedFile,
  UploadResult,
} from "./file-upload/types.ts";
export type {
  PerformanceConfig,
  PerformanceMetrics,
  PerformancePluginOptions,
  WebVitals,
} from "./performance/types.ts";
export type {
  CacheConfig,
  CacheOptions,
  CachePluginOptions,
  CacheStore,
} from "./cache/types.ts";
export type {
  EmailAttachment,
  EmailOptions,
  EmailPluginOptions,
  EmailResult,
  EmailTemplate,
  SMTPConfig,
} from "./email/types.ts";
export type { Store, StorePluginOptions } from "./store/types.ts";
