/**
 * 图片优化插件
 * 自动优化图片资源：压缩、WebP 转换、响应式图片、懒加载
 */

import type { Plugin, Request, Response, BuildConfig } from '../../types/index.ts';
import type { ImageOptimizerPluginOptions, ImageFormat } from './types.ts';
import * as path from '@std/path';
import { walk } from '@std/fs/walk';

/**
 * 支持的图片格式
 */
const IMAGE_FORMATS: ImageFormat[] = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'svg'];

/**
 * 检查文件是否为图片
 */
function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase().slice(1) as ImageFormat;
  return IMAGE_FORMATS.includes(ext);
}

/**
 * 优化 SVG
 */
function optimizeSVG(content: string): string {
  return content
    .replace(/<!--[\s\S]*?-->/g, '') // 移除注释
    .replace(/\s+/g, ' ') // 压缩空白
    .replace(/>\s+</g, '><') // 移除标签间的空白
    .trim();
}

/**
 * 生成响应式图片 srcset
 */
function generateSrcset(basePath: string, breakpoints: number[]): string {
  return breakpoints
    .map(bp => `${basePath}?w=${bp} ${bp}w`)
    .join(', ');
}

/**
 * 生成 sizes 属性
 */
function generateSizes(breakpoints: number[]): string {
  const sizes: string[] = [];
  for (let i = 0; i < breakpoints.length - 1; i++) {
    sizes.push(`(max-width: ${breakpoints[i]}px) ${breakpoints[i]}px`);
  }
  sizes.push(`${breakpoints[breakpoints.length - 1]}px`);
  return sizes.join(', ');
}

/**
 * 转换 HTML 中的图片标签
 */
function transformImageTags(html: string, options: ImageOptimizerPluginOptions): string {
  if (!options.autoTransform) {
    return html;
  }

  let result = html;

  // 转换 <img> 标签
  const imgRegex = /<img\s+([^>]*?)>/gi;
  result = result.replace(imgRegex, (match, attributes) => {
    // 检查是否已有 srcset
    if (attributes.includes('srcset=')) {
      return match;
    }

    // 提取 src
    const srcMatch = attributes.match(/src=["']([^"']+)["']/);
    if (!srcMatch) {
      return match;
    }

    const src = srcMatch[1];
    
    // 只处理相对路径的图片
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
      return match;
    }

    let newAttributes = attributes;

    // 添加懒加载
    if (options.lazyLoad?.enabled !== false) {
      const lazyAttr = options.lazyLoad?.attribute || 'loading';
      const lazyValue = options.lazyLoad?.value || 'lazy';
      if (!attributes.includes(`${lazyAttr}=`)) {
        newAttributes += ` ${lazyAttr}="${lazyValue}"`;
      }
    }

    // 添加响应式图片
    if (options.responsive?.generateSrcset !== false && options.responsive?.breakpoints) {
      const breakpoints = options.responsive.breakpoints;
      const srcset = generateSrcset(src, breakpoints);
      newAttributes += ` srcset="${srcset}"`;
      
      if (options.responsive.generateSizes !== false) {
        const sizes = generateSizes(breakpoints);
        newAttributes += ` sizes="${sizes}"`;
      }
    }

    // 添加 WebP/AVIF 支持（使用 <picture> 标签）
    if (options.webp?.enabled !== false || options.avif?.enabled !== false) {
      // 这里简化处理，实际应该生成 <picture> 标签
      // 为了不破坏现有结构，只添加注释提示
      // 实际实现中，可以生成 <picture> 标签，包含原图、WebP 和 AVIF 版本
    }

    return `<img ${newAttributes}>`;
  });

  return result;
}

/**
 * 创建图片优化插件
 */
export function imageOptimizer(options: ImageOptimizerPluginOptions = {}): Plugin {
  const imageDirs = Array.isArray(options.imageDir) 
    ? options.imageDir 
    : (options.imageDir ? [options.imageDir] : ['assets']);
  
  const outputDir = options.outputDir || 'assets';
  const compression = options.compression || {};
  const webp = options.webp || {};

  return {
    name: 'image-optimizer',
    config: options as Record<string, unknown>,

    /**
     * 请求处理钩子 - 转换 HTML 中的图片标签
     */
    onRequest(_req: Request, res: Response) {
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== 'string') {
        return;
      }

      const contentType = res.headers.get('Content-Type') || '';
      if (!contentType.includes('text/html')) {
        return;
      }

      if (options.autoTransform !== false) {
        try {
          const html = res.body as string;
          const transformed = transformImageTags(html, options);
          res.body = transformed;
        } catch (error) {
          console.error('[Image Optimizer Plugin] 转换图片标签时出错:', error);
        }
      }
    },

    /**
     * 构建时钩子 - 优化图片文件
     */
    async onBuild(buildConfig: BuildConfig) {
      const outDir = buildConfig.outDir || 'dist';
      const finalOutputDir = path.join(outDir, outputDir);

      console.log('🖼️  [Image Optimizer Plugin] 开始优化图片...');

      try {
        let processedCount = 0;
        let optimizedCount = 0;
        let webpCount = 0;

        // 遍历所有图片目录
        for (const imageDir of imageDirs) {
          try {
            for await (const entry of walk(imageDir)) {
              if (!entry.isFile || !isImageFile(entry.path)) {
                continue;
              }

              // 检查排除规则
              if (options.exclude) {
                const shouldExclude = options.exclude.some(pattern => {
                  if (pattern.includes('*')) {
                    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                    return regex.test(entry.path);
                  }
                  return entry.path.includes(pattern);
                });
                if (shouldExclude) {
                  continue;
                }
              }

              // 检查包含规则
              if (options.include) {
                const shouldInclude = options.include.some(pattern => {
                  if (pattern.includes('*')) {
                    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                    return regex.test(entry.path);
                  }
                  return entry.path.includes(pattern);
                });
                if (!shouldInclude) {
                  continue;
                }
              }

              const ext = path.extname(entry.path).toLowerCase();
              const relativePath = path.relative(imageDir, entry.path);
              const outputPath = path.join(finalOutputDir, relativePath);
              const outputDirPath = path.dirname(outputPath);
              await Deno.mkdir(outputDirPath, { recursive: true });

              // 读取原始文件
              const fileContent = await Deno.readFile(entry.path);

              // 处理 SVG
              if (ext === '.svg' && compression.optimizeSvg !== false) {
                const svgContent = new TextDecoder().decode(fileContent);
                const optimized = optimizeSVG(svgContent);
                await Deno.writeTextFile(outputPath, optimized);
                optimizedCount++;
                processedCount++;
                continue;
              }

              // 处理其他图片格式
              // 注意：Deno 环境下图片压缩需要外部工具（如 sharp、imagemin）
              // 这里提供基础框架，实际压缩可以通过配置外部工具实现
              
              if (compression.enabled !== false) {
                // 检查文件大小
                const maxSize = compression.maxFileSize || 50 * 1024; // 默认 50KB
                if (fileContent.length > maxSize) {
                  console.warn(`💡 [Image Optimizer] 图片 ${entry.path} 较大 (${(fileContent.length / 1024).toFixed(2)}KB)，建议使用外部工具压缩（如 sharp、imagemin）`);
                }
              }

              // 复制原文件
              await Deno.writeFile(outputPath, fileContent);
              processedCount++;

              // 生成 WebP 版本
              if (webp.enabled !== false && (ext === '.jpg' || ext === '.jpeg' || ext === '.png')) {
                // 注意：WebP 转换需要外部工具
                // 这里只记录需要转换的文件，实际转换可以通过配置外部工具实现
                const webpPath = outputPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
                console.log(`💡 [Image Optimizer] 建议生成 WebP: ${webpPath}`);
                // 实际实现中，可以调用外部工具生成 WebP
                webpCount++;
              }

              // 生成 AVIF 版本
              const avif = options.avif || {};
              if (avif.enabled !== false && (ext === '.jpg' || ext === '.jpeg' || ext === '.png')) {
                // 注意：AVIF 转换需要外部工具
                // 这里只记录需要转换的文件，实际转换可以通过配置外部工具实现
                const avifPath = outputPath.replace(/\.(jpg|jpeg|png)$/i, '.avif');
                console.log(`💡 [Image Optimizer] 建议生成 AVIF: ${avifPath}`);
                // 实际实现中，可以调用外部工具生成 AVIF
                webpCount++;
              }
            }
          } catch (error) {
            // 目录不存在时忽略
            if ((error as Error).message?.includes('No such file')) {
              continue;
            }
            console.warn(`[Image Optimizer Plugin] 处理目录 ${imageDir} 时出错:`, error);
          }
        }

        console.log(`✅ [Image Optimizer Plugin] 图片处理完成: ${processedCount} 个文件, ${optimizedCount} 个已优化, ${webpCount} 个建议生成 WebP`);
      } catch (error) {
        console.error('❌ [Image Optimizer Plugin] 优化图片时出错:', error);
      }
    },
  };
}

// 导出类型
export type { ImageOptimizerPluginOptions, ImageFormat, ImageSize, ResponsiveImageConfig, WebPConfig, CompressionConfig, PlaceholderConfig, LazyLoadConfig } from './types.ts';

