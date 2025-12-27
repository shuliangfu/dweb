/**
 * Tailwind CSS 插件工具函数
 */

import * as path from "@std/path";

/**
 * Tailwind CSS 配置文件扩展名
 */
const CONFIG_EXTENSIONS = ["ts", "js", "mjs"];

/**
 * 查找 Tailwind CSS 配置文件
 * @param directory 起始目录
 * @returns 配置文件路径
 */
export async function findTailwindConfigFile(
  directory: string,
): Promise<string | null> {
  let dir = directory;

  while (true) {
    for (const ext of CONFIG_EXTENSIONS) {
      const filePath = path.join(dir, `tailwind.config.${ext}`);
      try {
        const stat = await Deno.stat(filePath);
        if (stat.isFile) {
          return filePath;
        }
      } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
          throw err;
        }
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      // 已到达根目录，未找到配置文件
      return null;
    }
    dir = parent;
  }
}

/**
 * 递归查找 CSS 文件
 * @param dir 目录路径
 * @param files 文件列表（输出）
 */
export async function findCSSFiles(
  dir: string,
  files: string[],
): Promise<void> {
  try {
    for await (const entry of Deno.readDir(dir)) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile && entry.name.endsWith(".css")) {
        files.push(fullPath);
      } else if (entry.isDirectory) {
        await findCSSFiles(fullPath, files);
      }
    }
  } catch {
    // 忽略错误
  }
}
