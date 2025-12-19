/**
 * SEO 插件
 * 自动生成 SEO meta 标签、Open Graph、Twitter Cards、JSON-LD
 */

import type { Plugin, AppLike, Request, Response, BuildConfig } from '../../types/index.ts';
import type { SEOPluginOptions, OpenGraphConfig, TwitterCardConfig, JSONLDConfig } from './types.ts';

/**
 * 生成 meta 标签 HTML
 */
function generateMetaTags(options: SEOPluginOptions, pageData?: {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  image?: string;
  url?: string;
  lang?: string;
  robots?: boolean | {
    index?: boolean;
    follow?: boolean;
    noarchive?: boolean;
    nosnippet?: boolean;
    noimageindex?: boolean;
  };
}): string {
  const tags: string[] = [];
  
  // 基础 meta 标签
  const title = pageData?.title || options.defaultTitle || '';
  const finalTitle = options.titleTemplate 
    ? options.titleTemplate.replace('%s', title)
    : title;
  
  if (finalTitle) {
    tags.push(`<title>${escapeHtml(finalTitle)}</title>`);
    tags.push(`<meta property="og:title" content="${escapeHtml(finalTitle)}" />`);
    tags.push(`<meta name="twitter:title" content="${escapeHtml(finalTitle)}" />`);
  }
  
  const description = pageData?.description || options.defaultDescription || '';
  if (description) {
    tags.push(`<meta name="description" content="${escapeHtml(description)}" />`);
    tags.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
    tags.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  }
  
  const keywords = pageData?.keywords || options.defaultKeywords || [];
  if (keywords.length > 0) {
    tags.push(`<meta name="keywords" content="${escapeHtml(keywords.join(', '))}" />`);
  }
  
  const author = pageData?.author || options.defaultAuthor || '';
  if (author) {
    tags.push(`<meta name="author" content="${escapeHtml(author)}" />`);
  }
  
  const lang = pageData?.lang || options.defaultLang || 'en';
  // 注意：lang 属性应该在 <html> 标签上，这里只生成 meta 标签
  // 实际的 lang 属性注入应该在 HTML 处理时完成
  
  // Canonical URL
  if (options.canonical !== false) {
    const canonicalUrl = pageData?.url || options.siteUrl || '';
    if (canonicalUrl) {
      tags.push(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
    }
  }
  
  // Robots meta
  if (options.robots !== false) {
    if (typeof options.robots === 'object') {
      const robots = options.robots;
      const directives: string[] = [];
      if (robots.index !== false) directives.push('index');
      else directives.push('noindex');
      if (robots.follow !== false) directives.push('follow');
      else directives.push('nofollow');
      if (robots.noarchive) directives.push('noarchive');
      if (robots.nosnippet) directives.push('nosnippet');
      if (robots.noimageindex) directives.push('noimageindex');
      tags.push(`<meta name="robots" content="${directives.join(', ')}" />`);
    } else if (pageData && pageData.robots !== false) {
      if (typeof pageData.robots === 'object') {
        const robots = pageData.robots;
        const directives: string[] = [];
        if (robots.index !== false) directives.push('index');
        else directives.push('noindex');
        if (robots.follow !== false) directives.push('follow');
        else directives.push('nofollow');
        if (robots.noarchive) directives.push('noarchive');
        if (robots.nosnippet) directives.push('nosnippet');
        if (robots.noimageindex) directives.push('noimageindex');
        tags.push(`<meta name="robots" content="${directives.join(', ')}" />`);
      } else {
        tags.push(`<meta name="robots" content="index, follow" />`);
      }
    }
  }
  
  // Open Graph
  if (options.openGraph !== false) {
    const og = options.openGraph || {};
    const image = pageData?.image || og.image || options.defaultImage || '';
    const url = pageData?.url || options.siteUrl || '';
    
    if (url) {
      tags.push(`<meta property="og:url" content="${escapeHtml(url)}" />`);
    }
    
    if (og.type) {
      tags.push(`<meta property="og:type" content="${escapeHtml(og.type)}" />`);
    }
    
    if (og.siteName) {
      tags.push(`<meta property="og:site_name" content="${escapeHtml(og.siteName)}" />`);
    }
    
    if (image) {
      tags.push(`<meta property="og:image" content="${escapeHtml(image)}" />`);
      if (og.imageWidth) {
        tags.push(`<meta property="og:image:width" content="${og.imageWidth}" />`);
      }
      if (og.imageHeight) {
        tags.push(`<meta property="og:image:height" content="${og.imageHeight}" />`);
      }
      if (og.imageType) {
        tags.push(`<meta property="og:image:type" content="${escapeHtml(og.imageType)}" />`);
      }
    }
    
    if (og.locale) {
      tags.push(`<meta property="og:locale" content="${escapeHtml(og.locale)}" />`);
    }
    
    if (og.localeAlternate && og.localeAlternate.length > 0) {
      for (const locale of og.localeAlternate) {
        tags.push(`<meta property="og:locale:alternate" content="${escapeHtml(locale)}" />`);
      }
    }
  }
  
  // Twitter Cards
  if (options.twitter !== false) {
    const twitter = options.twitter || {};
    const image = pageData?.image || twitter.image || options.defaultImage || '';
    
    const cardType = twitter.card || 'summary';
    tags.push(`<meta name="twitter:card" content="${escapeHtml(cardType)}" />`);
    
    if (twitter.site) {
      tags.push(`<meta name="twitter:site" content="${escapeHtml(twitter.site)}" />`);
    }
    
    if (twitter.creator) {
      tags.push(`<meta name="twitter:creator" content="${escapeHtml(twitter.creator)}" />`);
    }
    
    if (image) {
      tags.push(`<meta name="twitter:image" content="${escapeHtml(image)}" />`);
      if (twitter.imageAlt) {
        tags.push(`<meta name="twitter:image:alt" content="${escapeHtml(twitter.imageAlt)}" />`);
      }
    }
  }
  
  // 自定义 meta 标签
  if (options.customMeta) {
    for (const meta of options.customMeta) {
      if (meta.name) {
        tags.push(`<meta name="${escapeHtml(meta.name)}" content="${escapeHtml(meta.content)}" />`);
      } else if (meta.property) {
        tags.push(`<meta property="${escapeHtml(meta.property)}" content="${escapeHtml(meta.content)}" />`);
      }
    }
  }
  
  return tags.join('\n    ');
}

/**
 * 生成 JSON-LD 结构化数据
 */
function generateJSONLD(options: SEOPluginOptions, pageData?: {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
}): string {
  if (options.jsonLd === false) {
    return '';
  }
  
  const jsonLd = options.jsonLd || {};
  if (jsonLd.enabled === false) {
    return '';
  }
  
  const type = jsonLd.type || 'WebSite';
  const name = pageData?.title || jsonLd.name || options.defaultTitle || '';
  const description = pageData?.description || jsonLd.description || options.defaultDescription || '';
  const url = pageData?.url || jsonLd.url || options.siteUrl || '';
  const logo = jsonLd.logo || options.defaultImage || '';
  
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
  };
  
  if (name) {
    data.name = name;
  }
  
  if (description) {
    data.description = description;
  }
  
  if (url) {
    data.url = url;
  }
  
  if (logo) {
    data.logo = logo;
  }
  
  if (jsonLd.contactPoint) {
    data.contactPoint = {
      '@type': 'ContactPoint',
      ...jsonLd.contactPoint,
    };
  }
  
  if (jsonLd.sameAs && jsonLd.sameAs.length > 0) {
    data.sameAs = jsonLd.sameAs;
  }
  
  // 压缩 JSON 内容（移除空格和换行）
  const compressedJson = JSON.stringify(data);
  return `<script type="application/ld+json">${compressedJson}</script>`;
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * 移除已存在的 SEO 标签，避免重复
 */
function removeExistingSEOTags(html: string): string {
  let result = html;
  
  // 移除已存在的 title 标签
  result = result.replace(/<title>.*?<\/title>/gi, '');
  
  // 移除已存在的 meta 标签（通过 name 或 property 属性匹配）
  const metaPatterns = [
    /<meta\s+name=["']description["'].*?>/gi,
    /<meta\s+name=["']keywords["'].*?>/gi,
    /<meta\s+name=["']author["'].*?>/gi,
    /<meta\s+name=["']robots["'].*?>/gi,
    /<meta\s+property=["']og:title["'].*?>/gi,
    /<meta\s+property=["']og:description["'].*?>/gi,
    /<meta\s+property=["']og:image["'].*?>/gi,
    /<meta\s+property=["']og:url["'].*?>/gi,
    /<meta\s+property=["']og:type["'].*?>/gi,
    /<meta\s+property=["']og:site_name["'].*?>/gi,
    /<meta\s+name=["']twitter:title["'].*?>/gi,
    /<meta\s+name=["']twitter:description["'].*?>/gi,
    /<meta\s+name=["']twitter:image["'].*?>/gi,
    /<meta\s+name=["']twitter:card["'].*?>/gi,
    /<meta\s+name=["']twitter:site["'].*?>/gi,
    /<meta\s+name=["']twitter:creator["'].*?>/gi,
    /<link\s+rel=["']canonical["'].*?>/gi,
  ];
  
  for (const pattern of metaPatterns) {
    result = result.replace(pattern, '');
  }
  
  // 移除已存在的 JSON-LD 脚本
  result = result.replace(/<script\s+type=["']application\/ld\+json["'].*?<\/script>/gis, '');
  
  return result;
}

/**
 * 注入 SEO 标签到 HTML
 */
function injectSEOTags(html: string, metaTags: string, jsonLd: string): string {
  // 先移除已存在的 SEO 标签，避免重复
  let result = removeExistingSEOTags(html);
  
  // 查找第一个 meta 标签或 viewport meta 标签的位置，在其后插入
  // 如果没有找到，则查找 </head> 标签
  if (metaTags) {
    // 尝试在第一个 meta 标签后插入（通常在 viewport 之后）
    const viewportPattern = /(<meta\s+name=["']viewport["'][^>]*>)/i;
    const firstMetaPattern = /(<meta[^>]*>)/i;
    const charsetPattern = /(<meta\s+charset=["'][^"']*["']>)/i;
    
    if (viewportPattern.test(result)) {
      // 在 viewport meta 标签后插入
      result = result.replace(viewportPattern, `$1\n    ${metaTags}`);
    } else if (charsetPattern.test(result)) {
      // 在 charset meta 标签后插入
      result = result.replace(charsetPattern, `$1\n    ${metaTags}`);
    } else if (firstMetaPattern.test(result)) {
      // 在第一个 meta 标签后插入
      result = result.replace(firstMetaPattern, `$1\n    ${metaTags}`);
    } else if (result.includes('</head>')) {
      // 如果没有找到 meta 标签，在 </head> 之前插入
      result = result.replace('</head>', `    ${metaTags}\n</head>`);
    } else if (result.includes('<head>')) {
      // 如果只有 <head> 标签，在其后插入
      result = result.replace('<head>', `<head>\n    ${metaTags}`);
    } else {
      // 如果没有 head 标签，在 </html> 之前添加
      result = result.replace('</html>', `<head>\n    ${metaTags}\n</head>\n</html>`);
    }
  }
  
  // 注入 JSON-LD 到 </head> 之前
  if (jsonLd) {
    if (result.includes('</head>')) {
      result = result.replace('</head>', `    ${jsonLd}\n</head>`);
    }
  }
  
  return result;
}

/**
 * 创建 SEO 插件
 */
export function seo(options: SEOPluginOptions = {}): Plugin {
  // 处理简写属性：将 title、description、keywords、author 映射到 defaultTitle、defaultDescription 等
  const normalizedOptions: SEOPluginOptions = {
    ...options,
    defaultTitle: options.defaultTitle ?? options.title,
    defaultDescription: options.defaultDescription ?? options.description,
    defaultKeywords: options.defaultKeywords ?? (
      options.keywords
        ? Array.isArray(options.keywords)
          ? options.keywords
          : [options.keywords]
        : undefined
    ),
    defaultAuthor: options.defaultAuthor ?? options.author,
  };
  
  return {
    name: 'seo',
    config: normalizedOptions as Record<string, unknown>,
    
    /**
     * 响应处理钩子 - 注入 SEO 标签
     * 在路由处理完成后执行，此时 pageMetadata 已经被提取
     */
    onResponse(req: Request, res: Response) {
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== 'string') {
        return;
      }
      
      const contentType = res.headers.get('Content-Type') || '';
      if (!contentType.includes('text/html')) {
        return;
      }
      
      try {
        const url = new URL(req.url);
        
        // 从请求中获取页面元数据（metadata）
        // RouteHandler 会将页面组件导出的 metadata 存储到 req.pageMetadata
        const pageMetadata = (req as any).pageMetadata as {
          title?: string;
          description?: string;
          keywords?: string | string[];
          author?: string;
          image?: string;
          url?: string;
          lang?: string;
          robots?: boolean | {
            index?: boolean;
            follow?: boolean;
            noarchive?: boolean;
            nosnippet?: boolean;
            noimageindex?: boolean;
          };
        } | undefined;
        
        // 处理 keywords：如果是字符串，转换为数组
        const keywords = pageMetadata?.keywords
          ? Array.isArray(pageMetadata.keywords)
            ? pageMetadata.keywords
            : [pageMetadata.keywords]
          : undefined;
        
        const pageData = {
          title: pageMetadata?.title,
          description: pageMetadata?.description,
          keywords: keywords,
          author: pageMetadata?.author,
          url: pageMetadata?.url || url.href,
          image: pageMetadata?.image || normalizedOptions.defaultImage,
          lang: pageMetadata?.lang,
          robots: pageMetadata?.robots,
        };
        
        // 生成 meta 标签
        const metaTags = generateMetaTags(normalizedOptions, pageData);
        
        // 生成 JSON-LD
        const jsonLd = generateJSONLD(normalizedOptions, pageData);
        
        // 注入到 HTML
        const html = res.body as string;
        const newHtml = injectSEOTags(html, metaTags, jsonLd);
        
        // 更新响应体
        res.body = newHtml;
      } catch (error) {
        console.error('[SEO Plugin] 处理 SEO 标签时出错:', error);
      }
    },
    
    /**
     * 构建时钩子 - 可以生成静态 SEO 文件
     */
    async onBuild(buildConfig: BuildConfig) {
      // 构建时可以生成 robots.txt、sitemap.xml 等
      // 这里暂时不实现，可以单独创建 sitemap 插件
    },
  };
}

// 导出类型
export type { SEOPluginOptions, OpenGraphConfig, TwitterCardConfig, JSONLDConfig } from './types.ts';

