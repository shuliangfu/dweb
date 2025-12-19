/**
 * Sitemap 插件类型定义
 */

/**
 * Sitemap URL 配置
 */
export interface SitemapUrl {
  /** URL 路径 */
  loc: string;
  /** 最后修改时间 */
  lastmod?: string | Date;
  /** 更新频率 */
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /** 优先级（0.0 - 1.0） */
  priority?: number;
}

/**
 * Sitemap 插件选项
 */
export interface SitemapPluginOptions {
  /** 网站基础 URL */
  siteUrl: string;
  /** 要包含的路由路径（支持 glob 模式） */
  routes?: string[];
  /** 要排除的路由路径（支持 glob 模式） */
  exclude?: string[];
  /** 默认更新频率 */
  defaultChangefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /** 默认优先级 */
  defaultPriority?: number;
  /** 自定义 URL 列表 */
  urls?: SitemapUrl[];
  /** 是否生成 robots.txt */
  generateRobots?: boolean;
  /** robots.txt 内容 */
  robotsContent?: string;
  /** sitemap.xml 输出路径（相对于输出目录） */
  outputPath?: string;
  /** robots.txt 输出路径（相对于输出目录） */
  robotsOutputPath?: string;
}

