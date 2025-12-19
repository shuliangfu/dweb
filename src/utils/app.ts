/**
 * 应用加载工具
 * 用于加载 main.ts 文件并获取应用实例中的中间件和插件
 */

import type { App } from '../mod.ts';
import type { Middleware, Plugin } from '../types/index.ts';
import * as path from '@std/path';

/**
 * 查找 main.ts 文件
 * @returns main.ts 文件路径，如果找不到返回 null
 */
export async function findMainFile(): Promise<string | null> {
  const cwd = Deno.cwd();
  const possiblePaths = [
    'main.ts',
    'main.js',
    'example/main.ts',
    'example/main.js',
  ];

  for (const filePath of possiblePaths) {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
      const stat = await Deno.stat(fullPath);
      if (stat.isFile) {
        return fullPath;
      }
    } catch {
      // 文件不存在，继续查找
      continue;
    }
  }

  return null;
}

/**
 * 加载 main.ts 文件并获取应用实例
 * @returns 应用实例，如果找不到 main.ts 返回 null
 */
export async function loadMainApp(): Promise<App | null> {
  try {
    const mainPath = await findMainFile();
    if (!mainPath) {
      return null;
    }

    // 转换为绝对路径
    const absolutePath = path.isAbsolute(mainPath) 
      ? mainPath 
      : path.resolve(Deno.cwd(), mainPath);

    // 转换为 file:// URL
    const mainUrl = path.toFileUrl(absolutePath).href;

    // 导入 main.ts
    const mainModule = await import(mainUrl);
    
    // 获取默认导出（应用实例）
    const app: App = mainModule.default || mainModule.app || mainModule;
    
    // 验证是否是有效的应用实例
    if (app && typeof app.use === 'function' && typeof app.plugin === 'function') {
      return app;
    }

    return null;
  } catch (error) {
    // 加载失败时静默返回 null（main.ts 是可选的）
    console.warn('⚠️  加载 main.ts 失败:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * 从应用实例中提取中间件
 * @param app 应用实例
 * @returns 中间件数组
 */
export function getMiddlewaresFromApp(app: App): Middleware[] {
  // 从中间件管理器中获取所有中间件
  return app.middleware.getAll();
}

/**
 * 从应用实例中提取插件
 * @param app 应用实例
 * @returns 插件数组
 */
export function getPluginsFromApp(app: App): Plugin[] {
  // 从插件管理器中获取所有插件
  return app.plugins.getAll();
}

