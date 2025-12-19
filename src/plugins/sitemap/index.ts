/**
 * Sitemap 插件
 * 自动生成 sitemap.xml 和 robots.txt
 */

import type { Plugin, AppLike, BuildConfig } from '../../types/index.ts';
import type { SitemapPluginOptions, SitemapUrl } from './types.ts';
import * as path from '@std/path';

/**
 * 生成 sitemap.xml 内容
 */
function generateSitemap(urls: SitemapUrl[], siteUrl: string): string {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  
  for (const url of urls) {
    const loc = url.loc.startsWith('http') ? url.loc : `${siteUrl}${url.loc.startsWith('/') ? url.loc : '/' + url.loc}`;
    const lastmod = url.lastmod 
      ? (typeof url.lastmod === 'string' ? url.lastmod : url.lastmod.toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0];
    const changefreq = url.changefreq || 'weekly';
    const priority = url.priority !== undefined ? url.priority : 0.5;
    
    xml.push('  <url>');
    xml.push(`    <loc>${escapeXml(loc)}</loc>`);
    xml.push(`    <lastmod>${lastmod}</lastmod>`);
    xml.push(`    <changefreq>${changefreq}</changefreq>`);
    xml.push(`    <priority>${priority}</priority>`);
    xml.push('  </url>');
  }
  
  xml.push('</urlset>');
  return xml.join('\n');
}

/**
 * 生成 robots.txt 内容
 */
function generateRobots(siteUrl: string, customContent?: string): string {
  if (customContent) {
    return customContent;
  }
  
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ];
  
  return lines.join('\n');
}

/**
 * XML 转义
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 扫描路由文件
 */
async function scanRoutes(
  routesDir: string,
  exclude: string[] = []
): Promise<string[]> {
  const routes: string[] = [];
  
  try {
    // 递归扫描路由目录
    for await (const entry of Deno.readDir(routesDir)) {
      if (entry.isDirectory) {
        const subRoutes = await scanRoutes(path.join(routesDir, entry.name), exclude);
        routes.push(...subRoutes);
      } else if (entry.isFile && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
        // 跳过特殊文件
        if (entry.name.startsWith('_') || entry.name.startsWith('[')) {
          continue;
        }
        
        // 构建路由路径
        const relativePath = path.relative(routesDir, path.join(routesDir, entry.name));
        let routePath = '/' + relativePath
          .replace(/\\/g, '/')
          .replace(/\.tsx?$/, '')
          .replace(/\/index$/, '')
          .replace(/^index$/, '');
        
        // 处理动态路由（简单处理，实际应该更复杂）
        routePath = routePath.replace(/\[([^\]]+)\]/g, ''); // 移除动态参数
        
        // 检查是否在排除列表中
        const shouldExclude = exclude.some(pattern => {
          if (pattern.includes('*')) {
            // 简单的 glob 匹配
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return regex.test(routePath);
          }
          return routePath === pattern;
        });
        
        if (!shouldExclude && routePath) {
          routes.push(routePath);
        }
      }
    }
  } catch (error) {
    // 目录不存在或无法读取
    console.warn(`[Sitemap Plugin] 无法扫描路由目录 ${routesDir}:`, error);
  }
  
  return routes;
}

/**
 * 创建 Sitemap 插件
 */
export function sitemap(options: SitemapPluginOptions): Plugin {
  if (!options.siteUrl) {
    throw new Error('Sitemap 插件需要 siteUrl 配置');
  }
  
  return {
    name: 'sitemap',
    config: options as Record<string, unknown>,
    
    /**
     * 构建时钩子 - 生成 sitemap.xml 和 robots.txt
     */
    async onBuild(buildConfig: BuildConfig) {
      const outDir = buildConfig.outDir || 'dist';
      const outputPath = options.outputPath || 'sitemap.xml';
      const robotsOutputPath = options.robotsOutputPath || 'robots.txt';
      
      console.log('🗺️  [Sitemap Plugin] 开始生成 sitemap.xml...');
      
      try {
        const urls: SitemapUrl[] = [];
        
        // 添加自定义 URL
        if (options.urls) {
          urls.push(...options.urls);
        }
        
        // 扫描路由文件
        const routesDir = 'routes'; // 可以从配置中获取
        const exclude = options.exclude || [];
        const routes = await scanRoutes(routesDir, exclude);
        
        // 添加扫描到的路由
        for (const route of routes) {
          // 检查是否在排除列表中
          const shouldExclude = exclude.some(pattern => {
            if (pattern.includes('*')) {
              const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
              return regex.test(route);
            }
            return route === pattern;
          });
          
          if (!shouldExclude) {
            urls.push({
              loc: route,
              changefreq: options.defaultChangefreq || 'weekly',
              priority: options.defaultPriority || 0.5,
            });
          }
        }
        
        // 去重
        const uniqueUrls = Array.from(
          new Map(urls.map(url => [url.loc, url])).values()
        );
        
        // 生成 sitemap.xml
        const sitemapContent = generateSitemap(uniqueUrls, options.siteUrl);
        const sitemapPath = path.join(outDir, outputPath);
        await Deno.mkdir(path.dirname(sitemapPath), { recursive: true });
        await Deno.writeTextFile(sitemapPath, sitemapContent);
        console.log(`✅ [Sitemap Plugin] 生成 sitemap.xml: ${sitemapPath} (${uniqueUrls.length} 个 URL)`);
        
        // 生成 robots.txt
        if (options.generateRobots !== false) {
          const robotsContent = generateRobots(options.siteUrl, options.robotsContent);
          const robotsPath = path.join(outDir, robotsOutputPath);
          await Deno.writeTextFile(robotsPath, robotsContent);
          console.log(`✅ [Sitemap Plugin] 生成 robots.txt: ${robotsPath}`);
        }
      } catch (error) {
        console.error('❌ [Sitemap Plugin] 生成 sitemap 时出错:', error);
      }
    },
  };
}

// 导出类型
export type { SitemapPluginOptions, SitemapUrl } from './types.ts';

