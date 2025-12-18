/**
 * 文件处理工具函数
 * 用于文件查找、检查等
 */

/**
 * 查找配置文件
 * @returns 配置文件路径，如果找不到返回 null
 */
export async function findConfigFile(): Promise<string | null> {
  const cwd = Deno.cwd();
  const possiblePaths = [
    'dweb.config.ts',
    'dweb.config.js',
    'example/dweb.config.ts',
    'example/dweb.config.js',
  ];

  for (const path of possiblePaths) {
    try {
      const fullPath = path.startsWith('/') ? path : `${cwd}/${path}`;
      const stat = await Deno.stat(fullPath);
      if (stat.isFile) {
        return path;
      }
    } catch {
      // 文件不存在，继续查找
      continue;
    }
  }

  return null;
}

/**
 * 检查文件是否应该被忽略（用于 HMR）
 * @param filePath 文件路径
 * @param ignoredPatterns 忽略模式数组
 * @returns 是否应该忽略
 */
export function shouldIgnoreFile(
  filePath: string,
  ignoredPatterns: Array<(name: string) => boolean>
): boolean {
  const name = filePath.split('/').pop() || '';
  return ignoredPatterns.some((pattern) => pattern(name) || pattern(filePath));
}

