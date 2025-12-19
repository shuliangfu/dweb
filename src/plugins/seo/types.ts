/**
 * SEO 插件类型定义
 */

/**
 * Open Graph 配置
 */
export interface OpenGraphConfig {
  /** 网站名称 */
  siteName?: string;
  /** 网站类型 */
  type?: 'website' | 'article' | 'book' | 'profile' | 'music' | 'video';
  /** 图片 URL */
  image?: string;
  /** 图片宽度 */
  imageWidth?: number;
  /** 图片高度 */
  imageHeight?: number;
  /** 图片类型 */
  imageType?: string;
  /** 音频 URL */
  audio?: string;
  /** 视频 URL */
  video?: string;
  /** 视频宽度 */
  videoWidth?: number;
  /** 视频高度 */
  videoHeight?: number;
  /** 视频类型 */
  videoType?: string;
  /** 地区 */
  locale?: string;
  /** 备用地区 */
  localeAlternate?: string[];
}

/**
 * Twitter Cards 配置
 */
export interface TwitterCardConfig {
  /** 卡片类型 */
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  /** 站点 Twitter 用户名 */
  site?: string;
  /** 创建者 Twitter 用户名 */
  creator?: string;
  /** 图片 URL */
  image?: string;
  /** 图片描述 */
  imageAlt?: string;
  /** 应用名称（iOS） */
  appNameIphone?: string;
  /** 应用 ID（iOS） */
  appIdIphone?: string;
  /** 应用 URL（iOS） */
  appUrlIphone?: string;
  /** 应用名称（iPad） */
  appNameIpad?: string;
  /** 应用 ID（iPad） */
  appIdIpad?: string;
  /** 应用 URL（iPad） */
  appUrlIpad?: string;
  /** 应用名称（Android） */
  appNameGoogleplay?: string;
  /** 应用包名（Android） */
  appIdGoogleplay?: string;
  /** 应用 URL（Android） */
  appUrlGoogleplay?: string;
}

/**
 * JSON-LD 结构化数据配置
 */
export interface JSONLDConfig {
  /** 是否启用 JSON-LD */
  enabled?: boolean;
  /** 网站类型 */
  type?: 'WebSite' | 'Organization' | 'Person' | 'Article' | 'BlogPosting' | 'Product';
  /** 网站名称 */
  name?: string;
  /** 网站描述 */
  description?: string;
  /** 网站 URL */
  url?: string;
  /** Logo URL */
  logo?: string;
  /** 联系信息 */
  contactPoint?: {
    telephone?: string;
    contactType?: string;
    email?: string;
  };
  /** 社交媒体链接 */
  sameAs?: string[];
}

/**
 * SEO 插件选项
 */
export interface SEOPluginOptions {
  /** 默认标题（可以使用 title 作为简写） */
  defaultTitle?: string;
  /** 标题（defaultTitle 的简写） */
  title?: string;
  /** 标题模板（例如：`%s | My Site`） */
  titleTemplate?: string;
  /** 默认描述（可以使用 description 作为简写） */
  defaultDescription?: string;
  /** 描述（defaultDescription 的简写） */
  description?: string;
  /** 默认关键词（可以使用 keywords 作为简写，支持字符串或数组） */
  defaultKeywords?: string[];
  /** 关键词（defaultKeywords 的简写，支持字符串或数组） */
  keywords?: string | string[];
  /** 默认作者（可以使用 author 作为简写） */
  defaultAuthor?: string;
  /** 作者（defaultAuthor 的简写） */
  author?: string;
  /** 默认语言 */
  defaultLang?: string;
  /** 网站 URL */
  siteUrl?: string;
  /** 默认图片 */
  defaultImage?: string;
  /** Open Graph 配置 */
  openGraph?: OpenGraphConfig | false;
  /** Twitter Cards 配置 */
  twitter?: TwitterCardConfig | false;
  /** JSON-LD 配置 */
  jsonLd?: JSONLDConfig | false;
  /** 是否自动生成 canonical URL */
  canonical?: boolean;
  /** 是否自动生成 robots meta 标签 */
  robots?: boolean | {
    index?: boolean;
    follow?: boolean;
    noarchive?: boolean;
    nosnippet?: boolean;
    noimageindex?: boolean;
  };
  /** 自定义 meta 标签 */
  customMeta?: Array<{
    name?: string;
    property?: string;
    content: string;
  }>;
}

