/**
 * Tailwind CSS v4 实现
 * 参考 Fresh 框架的实现：https://github.com/denoland/fresh/blob/main/packages/plugin-tailwindcss/src/mod.ts
 */

import type { TailwindPluginOptions } from "./types.ts";
import * as path from "@std/path";

// 导入 Tailwind CSS v4 相关包
// @tailwindcss/postcss 插件在解析 @import "tailwindcss" 时，内部会尝试解析 tailwindcss 模块
// 在 Deno 环境中，需要预先导入 tailwindcss 包，让插件的模块解析器能够找到它
// 注意：虽然我们不直接使用 tailwindcss，但需要导入它以便 @tailwindcss/postcss 插件能够解析
// 使用完整的 npm: URL，不依赖 deno.json 的 imports 配置
import twPostcss from "@tailwindcss/postcss";
import postcss from "postcss";

/**
 * 初始化 Tailwind CSS v4 PostCSS 处理器
 * @param _configPath 配置文件路径（v4 不需要配置文件，会自动扫描项目文件）
 * @param options 插件选项
 * @param isProduction 是否为生产环境
 * @returns PostCSS 处理器实例
 */
export function initTailwindV4(
  _configPath: string | null,
  options: TailwindPluginOptions,
  isProduction: boolean,
): ReturnType<typeof postcss> {
  // v4 使用 @tailwindcss/postcss 插件（内置优化）
  const optimize = options.optimize !== false && isProduction;

  // 获取项目根目录（当前工作目录）的绝对路径
  // @tailwindcss/postcss 插件的 base 参数用于指定扫描类候选的基础目录
  // 它会在该目录下自动扫描常见的文件路径（如 routes/, components/ 等）
  // 注意：base 参数应该是绝对路径
  const projectRoot = path.resolve(Deno.cwd());

  // 按照 Fresh 的方式创建 PostCSS 实例
  // Fresh 代码：const instance = postcss(twPostcss({ optimize: ... }))
  // @tailwindcss/postcss 插件支持的参数：
  // - base: 扫描类候选的基础目录（默认为当前工作目录），应该是绝对路径
  //   * 插件会在 base 目录下自动扫描 routes/, components/, app/, src/ 等常见目录
  //   * 但是 common/ 目录不在默认扫描范围内，需要在 CSS 文件中使用 @source 指令指定
  // - optimize: 优化和压缩输出 CSS
  // - transformAssetUrls: 启用或禁用资源 URL 重写（默认为 true）
  const instance = postcss(
    twPostcss({
      base: projectRoot, // 指定项目根目录作为扫描基础目录（绝对路径）
      optimize: optimize,
      // transformAssetUrls: true, // 默认启用，可以省略
    }),
  );

  return instance;
}

/**
 * 处理 CSS 文件（v4 版本）
 * @param cssContent CSS 内容
 * @param filePath CSS 文件路径
 * @param configPath 配置文件路径（v4 不需要配置文件）
 * @param isProduction 是否为生产环境
 * @param options 插件选项
 * @returns 处理后的 CSS 内容和 source map
 */
export async function processCSSV4(
  cssContent: string,
  filePath: string,
  configPath: string | null,
  isProduction: boolean,
  options: TailwindPluginOptions,
): Promise<{ content: string; map?: string }> {
  // 初始化 PostCSS 处理器
  const processor: ReturnType<typeof postcss> = initTailwindV4(
    configPath || "",
    options,
    isProduction,
  );

  // 处理 CSS 文件路径
  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(Deno.cwd(), filePath);

  // PostCSS 处理选项
  const processOptions = {
    from: absoluteFilePath, // 使用实际的 CSS 文件路径
    to: undefined, // 不生成输出文件，只处理内容
    // 禁用 source map（去掉 sourceMappingURL）
    map: false,
  };

  // 处理 CSS
  // v4: @tailwindcss/postcss 插件会处理 @import "tailwindcss"
  try {
    const result = await processor.process(cssContent, processOptions);

    return {
      content: result.css,
    };
  } catch (error) {
    console.error("[Tailwind Plugin v4] PostCSS 处理失败:", error);
    // 如果处理失败，返回原始内容
    return {
      content: cssContent,
    };
  }
}
