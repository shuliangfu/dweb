/**
 * RSS 插件类型定义
 */

/**
 * RSS 条目
 */
export interface RSSItem {
  /** 标题 */
  title: string;
  /** 链接 */
  link: string;
  /** 描述 */
  description?: string;
  /** 发布日期 */
  pubDate?: Date | string;
  /** 作者 */
  author?: string;
  /** 分类 */
  category?: string | string[];
  /** 标签 */
  tags?: string[];
  /** 内容（HTML） */
  content?: string;
  /** 图片 URL */
  image?: string;
  /** GUID（唯一标识符） */
  guid?: string;
  /** 是否允许评论 */
  comments?: boolean;
  /** 评论链接 */
  commentsUrl?: string;
}

/**
 * RSS Feed 配置
 */
export interface RSSFeedConfig {
  /** Feed 标题 */
  title: string;
  /** Feed 描述 */
  description: string;
  /** 网站 URL */
  siteUrl: string;
  /** Feed URL */
  feedUrl?: string;
  /** 语言代码 */
  language?: string;
  /** 版权信息 */
  copyright?: string;
  /** 管理邮箱 */
  managingEditor?: string;
  /** Web Master 邮箱 */
  webMaster?: string;
  /** 最后构建日期 */
  lastBuildDate?: Date;
  /** 更新频率 */
  ttl?: number; // 分钟
  /** 图片 URL（Feed 图标） */
  image?: {
    url: string;
    title?: string;
    link?: string;
    width?: number;
    height?: number;
  };
}

/**
 * RSS 插件选项
 */
export interface RSSPluginOptions {
  /** Feed 配置 */
  feed: RSSFeedConfig;
  /** RSS 条目列表 */
  items?: RSSItem[];
  /** 自动扫描路由生成条目 */
  autoScan?: boolean;
  /** 路由目录 */
  routesDir?: string;
  /** 输出路径（相对于构建输出目录） */
  outputPath?: string;
  /** 输出文件名 */
  filename?: string;
  /** 是否生成多个 Feed（按分类） */
  generateByCategory?: boolean;
  /** 分类配置 */
  categories?: Array<{
    name: string;
    filter: (item: RSSItem) => boolean;
  }>;
}

