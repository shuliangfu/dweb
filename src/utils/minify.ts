/**
 * JavaScript 代码压缩工具
 * 使用 esbuild 进行压缩，更可靠
 */

import * as esbuild from 'esbuild';

/**
 * 使用 esbuild 压缩 JavaScript 代码
 * @param code 要压缩的 JavaScript 代码
 * @returns 压缩后的代码
 */
export async function minifyJavaScript(code: string): Promise<string> {
  try {
    const result = await esbuild.transform(code, {
      loader: 'js',
      minify: true,
      legalComments: 'none', // 移除注释
      target: 'esnext',
      format: 'esm', // 确保使用 ES 模块格式
      keepNames: false, // 允许重命名
    });

    if (!result || !result.code) {
      // 如果压缩失败，返回原始代码
      return code;
    }

    // 验证压缩后的代码是否有效（基本检查）
    try {
      // 尝试解析压缩后的代码，检查是否有语法错误
      new Function(result.code);
    } catch (parseError) {
      // 如果解析失败，返回原始代码
      console.warn('[Minify] 压缩后的代码有语法错误，使用原始代码:', parseError);
      return code;
    }

    return result.code;
  } catch (error) {
    // 如果压缩失败，返回原始代码，避免破坏功能
    console.warn('[Minify] 压缩失败，使用原始代码:', error);
    return code;
  }
}
