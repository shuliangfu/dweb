/**
 * i18n 插件类型定义
 */

/**
 * 语言配置
 */
export interface LanguageConfig {
  /** 语言代码（如 'en', 'zh-CN'） */
  code: string;
  /** 语言名称 */
  name?: string;
  /** 语言文件路径 */
  file?: string;
  /** 是否为默认语言 */
  default?: boolean;
  /** 是否为 RTL 语言 */
  rtl?: boolean;
}

/**
 * 翻译数据
 */
export type TranslationData = Record<string, string | Record<string, unknown>>;

/**
 * 日期格式化选项
 */
export interface DateFormatOptions {
  /** 日期格式 */
  format?: "short" | "medium" | "long" | "full" | string;
  /** 时区 */
  timeZone?: string;
}

/**
 * 数字格式化选项
 */
export interface NumberFormatOptions {
  /** 样式 */
  style?: "decimal" | "currency" | "percent";
  /** 货币代码 */
  currency?: string;
  /** 最小小数位数 */
  minimumFractionDigits?: number;
  /** 最大小数位数 */
  maximumFractionDigits?: number;
}

/**
 * i18n 插件选项
 */
export interface I18nPluginOptions {
  /** 支持的语言列表 */
  languages: LanguageConfig[];
  /** 翻译文件目录 */
  translationsDir?: string;
  /** 默认语言代码 */
  defaultLanguage?: string;
  /** 语言检测方式 */
  detection?: {
    /** 是否从 URL 路径检测（如 /en/page） */
    fromPath?: boolean;
    /** 是否从查询参数检测（如 ?lang=en） */
    fromQuery?: boolean;
    /** 是否从 Cookie 检测 */
    fromCookie?: boolean;
    /** Cookie 名称 */
    cookieName?: string;
    /** 是否从 Accept-Language 头检测 */
    fromHeader?: boolean;
  };
  /** 路由前缀（如 /:lang/） */
  routePrefix?: string;
  /** 是否在 HTML 中注入语言属性 */
  injectLangAttribute?: boolean;
  /** 日期格式化选项 */
  dateFormat?: DateFormatOptions;
  /** 数字格式化选项 */
  numberFormat?: NumberFormatOptions;
}
