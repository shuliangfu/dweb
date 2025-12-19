/**
 * Tailwind CSS 插件
 * 支持 Tailwind CSS v3 和 v4
 * 参考 Fresh 框架的实现方式
 */

import type { Plugin } from '../../types/index.ts';
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
    config: options,

    /**
     * 初始化钩子
     */
    async onInit(app: any) {
      // 在开发环境中，设置 CSS 文件处理中间件
      if (app.server && !app.isProduction) {
				// TODO: 在开发环境中，设置 CSS 文件处理中间件
      }
    },

    /**
     * 请求处理钩子（开发环境实时编译）
     */
    async onRequest(req: any, res: any) {
      const url = new URL(req.url);
      // 只处理 CSS 文件请求
      if (!url.pathname.endsWith('.css')) {
        return;
      }

      // 安全检查：防止路径遍历攻击
      if (!url.pathname.startsWith('/') || url.pathname.includes('..')) {
        return;
      }

      try {
        // 获取文件路径（去掉开头的 /）
        const filePath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

        // 如果配置了 cssPath，使用配置的路径作为实际文件路径
        // 但需要检查请求路径是否匹配（考虑 staticDir 和 prefix 的情况）
        let targetPath: string;
        if (options.cssPath) {
          // 配置了 cssPath，使用配置的路径作为实际文件路径
          targetPath = options.cssPath.startsWith('/') ? options.cssPath.slice(1) : options.cssPath;

          // 检查请求路径是否匹配配置的路径
          // 支持两种匹配方式：
          // 1. 完全匹配：请求 /assets/style.css，配置 assets/style.css
          // 2. 文件名匹配：请求 /style.css，配置 assets/style.css（去掉路径前缀后比较文件名）
          const normalizedCssPath = targetPath;
          const normalizedRequestPath = filePath;

          // 先尝试完全匹配
          if (normalizedCssPath === normalizedRequestPath) {
            // 完全匹配，使用配置的路径
          } else {
            // 不完全匹配，尝试文件名匹配
            // 例如：请求 /style.css，配置 assets/style.css，应该匹配
            const cssFileName = normalizedCssPath.split('/').pop() || '';
            const requestFileName = normalizedRequestPath.split('/').pop() || '';

            // 如果文件名不匹配，跳过处理
            if (cssFileName !== requestFileName) {
              return;
            }
            // 文件名匹配，使用配置的路径（而不是请求路径）
          }
        } else {
          // 没有配置 cssPath，直接使用请求路径
          targetPath = filePath;
        }

        // 安全检查：确保文件路径在当前工作目录内（防止路径遍历攻击）
        const cwd = Deno.cwd();
        if (!isPathSafe(targetPath, cwd)) {
          // 路径不安全，跳过处理
          return;
        }

        // 检查文件是否存在
        let fileContent: string;
        let fileStat: Deno.FileInfo;

        try {
          fileContent = await Deno.readTextFile(targetPath);
          fileStat = await Deno.stat(targetPath);
        } catch {
          // 文件不存在，跳过处理
          return;
        }

        // 检查缓存
        // 注意：在开发环境中，即使 CSS 文件本身没有变化，
        // 如果 TSX 文件中的 Tailwind class 变化了，也需要重新编译
        // 因此，我们使用较短的时间戳比较，或者直接清除缓存
        const cacheKey = targetPath;
        const cached = cssCache.get(cacheKey);
        const fileModified = fileStat.mtime?.getTime() || 0;
        
        // 在开发环境中，为了支持 Tailwind class 的实时更新，
        // 我们降低缓存的有效性：如果缓存时间超过 1 秒，就重新编译
        // 这样可以确保 TSX 文件变化后，CSS 会重新编译
        const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
        const shouldUseCache = cached && 
                               cached.timestamp >= fileModified && 
                               cacheAge < 1000; // 缓存有效期 1 秒

        if (shouldUseCache) {
          // 使用缓存
          res.status = 200;
          res.setHeader('Content-Type', 'text/css');
          res.text(cached.content);
          return;
        }

        // 处理 CSS
        const processed = await processCSS(
          fileContent,
          targetPath,
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

        // 返回处理后的 CSS
        res.status = 200;
        res.setHeader('Content-Type', 'text/css');
        res.text(processed.content);
      } catch (error) {
        console.error('[Tailwind Plugin] 处理 CSS 文件时出错:', error);
        // 出错时不拦截，让其他中间件处理
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
