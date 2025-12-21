/**
 * Tailwind CSS 插件
 * 支持 Tailwind CSS v3 和 v4
 * 参考 Fresh 框架的实现方式
 */

import type { Plugin, AppLike, Request, Response } from '../../types/index.ts';
import type { TailwindPluginOptions } from './types.ts';
import { findTailwindConfigFile, findCSSFiles } from './utils.ts';
import { processCSSV3 } from './v3.ts';
import { processCSSV4 } from './v4.ts';
import * as path from '@std/path';
import { isPathSafe } from '../../utils/security.ts';

/**
 * 处理 CSS 文件
 * @param cssContent CSS 内容
 * @param filePath CSS 文件路径
 * @param version Tailwind 版本
 * @param isProduction 是否为生产环境
 * @param options 插件选项
 * @returns 处理后的 CSS 内容和 source map
 */
/**
 * 处理 CSS 文件（根据版本调用对应的处理方法）
 * @param cssContent CSS 内容
 * @param filePath CSS 文件路径
 * @param version Tailwind 版本
 * @param isProduction 是否为生产环境
 * @param options 插件选项
 * @returns 处理后的 CSS 内容和 source map
 */
async function processCSS(
  cssContent: string,
  filePath: string,
  version: 'v3' | 'v4',
  isProduction: boolean,
  options: TailwindPluginOptions
): Promise<{ content: string; map?: string }> {
  // 查找 Tailwind 配置文件
  const configPath = await findTailwindConfigFile(Deno.cwd());

  // 根据版本调用对应的处理方法
  if (version === 'v3') {
    return await processCSSV3(cssContent, filePath, configPath, isProduction, options);
  } else {
    return await processCSSV4(cssContent, filePath, configPath, isProduction, options);
  }
}

/**
 * 创建 Tailwind CSS 插件
 * @param options 插件选项
 * @returns 插件对象
 */
export function tailwind(options: TailwindPluginOptions = {}): Plugin {
  const version = options.version || 'v4';

  // CSS 文件缓存（开发环境）
  const cssCache = new Map<string, { content: string; map?: string; timestamp: number }>();

  return {
    name: 'tailwind',
    config: options as Record<string, unknown>,

    /**
     * 初始化钩子
     */
    async onInit(_app: AppLike) {
      // 不再需要在这里处理，改为在 onResponse 中处理
    },

    /**
     * 响应处理钩子（开发环境实时编译并注入 CSS）
     * 当 TS/TSX 路由返回 HTML 响应时，编译 CSS 并注入到 <head> 中
     */
    async onResponse(_req: Request, res: Response) {
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== 'string') {
        return;
      }

      const contentType = res.headers.get('Content-Type') || '';
      if (!contentType.includes('text/html')) {
        return;
      }

      // 如果没有配置 cssPath，跳过处理
      if (!options.cssPath) {
        return;
      }

      try {
        // 获取 CSS 文件路径
        const cssPath = options.cssPath.startsWith('/')
          ? options.cssPath.slice(1)
          : options.cssPath;

        // 安全检查：确保文件路径在当前工作目录内（防止路径遍历攻击）
        const cwd = Deno.cwd();
        if (!isPathSafe(cssPath, cwd)) {
          // 路径不安全，跳过处理
          return;
        }

        // 检查文件是否存在
        let fileContent: string;
        let fileStat: Deno.FileInfo;

        try {
          fileContent = await Deno.readTextFile(cssPath);
          fileStat = await Deno.stat(cssPath);
        } catch {
          // 文件不存在，跳过处理
          return;
        }

        // 检查缓存
        // 在开发环境中，为了支持 Tailwind class 的实时更新，
        // 我们降低缓存的有效性：如果缓存时间超过 1 秒，就重新编译
        const cacheKey = cssPath;
        const cached = cssCache.get(cacheKey);
        const fileModified = fileStat.mtime?.getTime() || 0;
        
        const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
        const shouldUseCache = cached && 
                               cached.timestamp >= fileModified && 
                               cacheAge < 1000; // 缓存有效期 1 秒

        let compiledCSS: string;
        if (shouldUseCache) {
          // 使用缓存
          compiledCSS = cached.content;
        } else {
          // 处理 CSS
          const processed = await processCSS(
            fileContent,
            cssPath,
            version,
            false, // 开发环境
            options
          );

          // 更新缓存
          cssCache.set(cacheKey, {
            content: processed.content,
            map: processed.map,
            timestamp: Date.now(),
          });

          compiledCSS = processed.content;
        }

        // 将编译后的 CSS 注入到 HTML 的 <head> 中的 <style> 标签
        const html = res.body as string;
        
        // 查找 </head> 标签，如果存在则在其前面注入 <style> 标签
        if (html.includes('</head>')) {
          const styleTag = `<style>${compiledCSS}</style>`;
          res.body = html.replace('</head>', `${styleTag}\n</head>`);
        } else if (html.includes('<head>')) {
          // 如果没有 </head>，但有 <head>，则在 <head> 后面注入
          const styleTag = `<style>${compiledCSS}</style>`;
          res.body = html.replace('<head>', `<head>\n${styleTag}`);
        } else {
          // 如果没有 <head>，则在 <html> 后面添加 <head> 和 <style>
          const styleTag = `<head><style>${compiledCSS}</style></head>`;
          if (html.includes('<html>')) {
            res.body = html.replace('<html>', `<html>\n${styleTag}`);
          } else {
            // 如果连 <html> 都没有，在开头添加
            res.body = `${styleTag}\n${html}`;
          }
        }
      } catch (error) {
        console.error('[Tailwind Plugin] 处理 CSS 时出错:', error);
        // 出错时不修改响应，让原始响应返回
      }
    },

    /**
     * 构建时钩子（生产环境编译）
     */
    async onBuild(buildConfig: any) {
      const isProduction = true;
      const outDir = buildConfig.outDir || 'dist';
      // staticDir 从构建配置中获取，如果没有则默认为 'assets'
      // 注意：buildConfig 可能包含 staticDir（向后兼容）或从 config.static?.dir 获取
      const staticDir = buildConfig.staticDir || 'assets';

      console.log(`🎨 [Tailwind ${version}] 开始编译 CSS 文件...`);

      try {
        // 查找所有 CSS 文件
        const cssFiles: string[] = [];

        // 如果配置了 cssPath，优先处理该文件
        if (options.cssPath) {
          const cssPath = options.cssPath.startsWith('/')
            ? options.cssPath.slice(1)
            : options.cssPath;
          try {
            const stat = await Deno.stat(cssPath);
            if (stat.isFile) {
              cssFiles.push(cssPath);
            }
          } catch {
            // 文件不存在，继续查找其他文件
          }
        }

        // 如果配置了 cssFiles，使用配置的文件列表
        if (options.cssFiles) {
          const files = Array.isArray(options.cssFiles) ? options.cssFiles : [options.cssFiles];
          for (const file of files) {
            // 这里简化处理，实际应该支持 glob 模式匹配
            if (file.endsWith('.css')) {
              const filePath = file.startsWith('/') ? file.slice(1) : file;
              try {
                const stat = await Deno.stat(filePath);
                if (stat.isFile) {
                  cssFiles.push(filePath);
                }
              } catch {
                // 文件不存在，跳过
              }
            }
          }
        } else if (!options.cssPath) {
          // 默认处理：遍历静态资源目录（如果没有配置 cssPath 和 cssFiles）
          try {
            for await (const entry of Deno.readDir(staticDir)) {
              if (entry.isFile && entry.name.endsWith('.css')) {
                cssFiles.push(path.join(staticDir, entry.name));
              } else if (entry.isDirectory) {
                // 递归查找子目录
                await findCSSFiles(path.join(staticDir, entry.name), cssFiles);
              }
            }
          } catch {
            // 静态资源目录不存在，跳过
          }
        }

        // 处理每个 CSS 文件
        for (const cssFile of cssFiles) {
          try {
            const cssContent = await Deno.readTextFile(cssFile);

            // 处理 CSS
            const processed = await processCSS(cssContent, cssFile, version, isProduction, options);

            // 计算输出路径
            const relativePath = path.relative(staticDir, cssFile);
            const outPath = path.join(outDir, staticDir, relativePath);

            // 确保输出目录存在
            await Deno.mkdir(path.dirname(outPath), { recursive: true });

            // 写入处理后的 CSS
            await Deno.writeTextFile(outPath, processed.content);

            // 如果有 source map，也写入
            if (processed.map) {
              await Deno.writeTextFile(`${outPath}.map`, processed.map);
            }

            console.log(`✅ [Tailwind ${version}] 编译完成: ${cssFile} -> ${outPath}`);
          } catch (error) {
            console.error(`❌ [Tailwind ${version}] 编译失败: ${cssFile}`, error);
          }
        }

        console.log(`✅ [Tailwind ${version}] CSS 编译完成，共处理 ${cssFiles.length} 个文件`);
      } catch (error) {
        console.error(`❌ [Tailwind ${version}] 构建时出错:`, error);
      }
    },
  };
}

// 导出类型
export type { TailwindPluginOptions, AutoprefixerOptions } from './types.ts';
