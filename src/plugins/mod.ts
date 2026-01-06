/**
 * 插件模块
 * 统一导出所有内置插件，提供框架功能扩展
 *
 * 此模块导出以下插件：
 *
 * **核心插件**
 * - `seo` - SEO 优化插件（元标签、结构化数据）
 * - `sitemap` - 网站地图生成插件
 * - `pwa` - 渐进式 Web 应用插件（Service Worker、Manifest）
 * - `store` - 状态管理插件（客户端状态管理）
 * - `tailwind` - Tailwind CSS 插件（样式框架支持）
 *
 * **功能插件**
 * - `i18n` - 国际化插件（多语言支持）
 * - `theme` - 主题切换插件（明暗主题）
 * - `cache` - 缓存管理插件
 * - `email` - 邮件发送插件
 * - `performance` - 性能监控插件
 * - `imageOptimizer` - 图片优化插件
 *
 * **工具插件**
 * - `rss` - RSS 订阅插件
 * - `formValidator` - 表单验证插件
 * - `fileUpload` - 文件上传插件
 *
 * @example
 * ```typescript
 * import { seo, store, i18n } from "@dreamer/dweb/plugins";
 * import { Application } from "@dreamer/dweb";
 *
 * const app = new Application();
 * await app.initialize();
 *
 * // 注册插件
 * app.plugin(seo({ title: "My App" }));
 * app.plugin(store({ persist: true }));
 * app.plugin(i18n({ defaultLanguage: "zh-CN" }));
 *
 * await app.start();
 * ```
 *
 * @module
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
