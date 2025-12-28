/**
 * Tailwind CSS v3 实现
 */

import type { TailwindPluginOptions } from "./types.ts";
import * as path from "@std/path";

// 导入 Tailwind CSS v3 相关包
// 使用完整的 npm: URL，不依赖 deno.json 的 imports 配置
import tailwindcss from "npm:tailwindcss@^3.4.0";
import postcss from "npm:postcss@^8.4.35";
import autoprefixer from "npm:autoprefixer@^10.4.17";
import cssnano from "npm:cssnano@^6.0.3";

/**
 * 初始化 Tailwind CSS v3 PostCSS 处理器
 * @param configPath 配置文件路径
 * @param options 插件选项
 * @param isProduction 是否为生产环境
 * @returns PostCSS 处理器实例
 */
export async function initTailwindV3(
  configPath: string | null,
  options: TailwindPluginOptions,
  isProduction: boolean,
): Promise<ReturnType<typeof postcss>> {
  let tailwindConfig: Record<string, unknown> = {};

  // 如果找到配置文件，加载它
  if (configPath) {
    const url = path.toFileUrl(configPath).href;
    const configModule = await import(url);
    tailwindConfig = configModule.default || {};
  }

  // 确保 content 是数组
  // 如果没有配置文件或配置文件中没有 content，使用默认的 content 路径
  if (!Array.isArray(tailwindConfig.content)) {
    tailwindConfig.content = (tailwindConfig.content as string[]) || [];
  }

  // 如果 content 为空，使用默认的扫描路径
  const contentArray = tailwindConfig.content as string[];
  if (contentArray.length === 0) {
    tailwindConfig.content = [
      "./routes/**/*.{tsx,ts,jsx,js}",
      "./components/**/*.{tsx,ts,jsx,js}",
    ];
  }

  // 调整 content 路径（相对于配置文件目录）
  if (configPath) {
    const configDir = path.dirname(configPath);
    const cwd = Deno.cwd();
    const relative = path.relative(cwd, configDir);

    if (!relative.startsWith("..")) {
      tailwindConfig.content = contentArray.map((pattern: string) => {
        if (typeof pattern === "string") {
          return path.join(relative, pattern);
        }
        return pattern;
      });
    }
  }

  // 创建 PostCSS 插件数组
  const autoprefixerOptions = options.autoprefixer || {};
  const plugins = [
    tailwindcss(tailwindConfig as Parameters<typeof tailwindcss>[0]),
    autoprefixer(autoprefixerOptions),
  ];

  // 生产环境添加 cssnano 压缩
  if (isProduction) {
    plugins.push(cssnano());
  }

  return postcss(plugins);
}

/**
 * 处理 CSS 文件（v3 版本）
 * @param cssContent CSS 内容
 * @param filePath CSS 文件路径
 * @param configPath 配置文件路径
 * @param isProduction 是否为生产环境
 * @param options 插件选项
 * @returns 处理后的 CSS 内容和 source map
 */
export async function processCSSV3(
  cssContent: string,
  filePath: string,
  configPath: string | null,
  isProduction: boolean,
  options: TailwindPluginOptions,
): Promise<{ content: string; map?: string }> {
  // 初始化 PostCSS 处理器
  const processor = await initTailwindV3(
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
  // v3: tailwindcss 插件会处理 @tailwind 指令
  try {
    const result = await processor.process(cssContent, processOptions);

    return {
      content: result.css,
    };
  } catch (error) {
    console.error("[Tailwind Plugin v3] PostCSS 处理失败:", error);
    // 如果处理失败，返回原始内容
    return {
      content: cssContent,
    };
  }
}
