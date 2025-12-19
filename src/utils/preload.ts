/**
 * 预加载和预取工具函数
 * 用于生成资源预加载和预取的 HTML 链接标签
 */

import type { RouteInfo } from '../core/router.ts';
import { filePathToHttpUrl } from './path.ts';

/**
 * 预加载选项
 */
export interface PreloadOptions {
  /** 是否启用预加载（默认 true） */
  enabled?: boolean;
  /** 是否预加载关键资源（CSS、字体等），默认 true */
  critical?: boolean;
  /** 是否预取下一个可能访问的路由，默认 false */
  prefetchRoutes?: boolean;
  /** 预取的路由数量限制，默认 3 */
  prefetchLimit?: number;
}

/**
 * 生成预加载链接（preload）
 * 用于当前页面即将需要的资源
 * @param resources 资源列表（URL 和类型）
 * @returns HTML link 标签字符串
 */
export function generatePreloadLinks(resources: Array<{ url: string; as: string; type?: string }>): string {
  return resources.map(({ url, as, type }) => {
    const typeAttr = type ? ` type="${type}"` : '';
    return `<link rel="preload" href="${url}" as="${as}"${typeAttr}>`;
  }).join('\n');
}

/**
 * 生成预取链接（prefetch）
 * 用于可能在未来需要的资源
 * @param resources 资源列表（URL）
 * @returns HTML link 标签字符串
 */
export function generatePrefetchLinks(resources: string[]): string {
  return resources.map(url => `<link rel="prefetch" href="${url}">`).join('\n');
}

/**
 * 为路由生成预加载和预取链接
 * @param routeInfo 当前路由信息
 * @param router 路由管理器（用于获取其他路由）
 * @param options 预加载选项
 * @returns HTML link 标签字符串
 */
export function generateRoutePreloadLinks(
  routeInfo: RouteInfo,
  router: { getAllRoutes: () => RouteInfo[] }, // Router 接口
  options: PreloadOptions = {}
): string {
  const {
    enabled = true,
    critical = true,
    prefetchRoutes = false,
    prefetchLimit = 3,
  } = options;

  if (!enabled) {
    return '';
  }

  const links: string[] = [];

  // 1. 预加载关键资源（CSS、字体等）
  if (critical) {
    // 预加载 Preact 模块（如果使用 CSR/Hybrid 模式）
    // 注意：Preact 已经在脚本中预加载，这里可以添加其他关键资源
    // 例如：关键 CSS、关键字体等
  }

  // 2. 预取下一个可能访问的路由
  if (prefetchRoutes) {
    try {
      const allRoutes = router.getAllRoutes();
      const currentPath = routeInfo.path;
      
      // 获取与当前路由相关的路由（例如：同一父路由下的其他路由）
      const relatedRoutes = allRoutes
        .filter((route: RouteInfo) => {
          // 排除当前路由
          if (route.path === currentPath) {
            return false;
          }
          
          // 优先预取同一层级的路由
          const currentDepth = currentPath.split('/').filter(Boolean).length;
          const routeDepth = route.path.split('/').filter(Boolean).length;
          
          // 预取同一层级或下一层级的路由
          return routeDepth === currentDepth || routeDepth === currentDepth + 1;
        })
        .slice(0, prefetchLimit);

      // 为每个路由生成预取链接
      for (const route of relatedRoutes) {
        const routeUrl = filePathToHttpUrl(route.filePath);
        links.push(`<link rel="prefetch" href="${routeUrl}">`);
      }
    } catch (error) {
      // 如果获取路由失败，静默处理
      console.warn('预取路由失败:', error);
    }
  }

  return links.join('\n');
}

/**
 * 从 HTML 中提取链接，生成预取链接
 * 用于预取页面中的 <a> 标签指向的资源
 * @param html HTML 内容
 * @param baseUrl 基础 URL（用于解析相对路径）
 * @param limit 预取链接数量限制，默认 5
 * @returns HTML link 标签字符串
 */
export function extractAndPrefetchLinks(html: string, baseUrl: string, limit: number = 5): string {
  try {
    // 简单的正则表达式提取 <a> 标签的 href
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    const links: string[] = [];
    const seen = new Set<string>();

    let match;
    while ((match = linkRegex.exec(html)) !== null && links.length < limit) {
      const href = match[1];
      
      // 跳过锚点、外部链接、特殊协议
      if (href.startsWith('#') || 
          href.startsWith('javascript:') || 
          href.startsWith('mailto:') ||
          href.startsWith('tel:')) {
        continue;
      }

      // 解析 URL
      try {
        const url = new URL(href, baseUrl);
        
        // 只预取同源的链接
        if (url.origin === new URL(baseUrl).origin && !seen.has(url.href)) {
          seen.add(url.href);
          links.push(`<link rel="prefetch" href="${url.href}">`);
        }
      } catch {
        // URL 解析失败，跳过
      }
    }

    return links.join('\n');
  } catch {
    return '';
  }
}

