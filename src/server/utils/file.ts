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
    "dweb.config.ts",
    "dweb.config.js",
    "example/dweb.config.ts",
    "example/dweb.config.js",
  ];

  for (const path of possiblePaths) {
    try {
      const fullPath = path.startsWith("/") ? path : `${cwd}/${path}`;
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
  ignoredPatterns: Array<(name: string) => boolean>,
): boolean {
  const name = filePath.split("/").pop() || "";
  return ignoredPatterns.some((pattern) => pattern(name) || pattern(filePath));
}

/**
 * 读取 deno.json 或 deno.jsonc 文件
 * 优先尝试 deno.json，如果不存在则尝试 deno.jsonc
 * @param basePath 基础路径（目录路径，不包含文件名）
 * @returns 解析后的 JSON 对象，如果文件不存在返回 null
 */
export async function readDenoJson(
  basePath?: string,
): Promise<Record<string, any> | null> {
  const base = basePath || Deno.cwd();
  const baseDir = base.endsWith("/") ? base.slice(0, -1) : base;

  // 优先尝试 deno.json
  const denoJsonPath = `${baseDir}/deno.json`;
  try {
    const content = await Deno.readTextFile(denoJsonPath);
    // JSON.parse 可以解析 JSONC 格式（带注释的 JSON）
    return JSON.parse(content);
  } catch {
    // deno.json 不存在，尝试 deno.jsonc
    try {
      const denoJsoncPath = `${baseDir}/deno.jsonc`;
      const content = await Deno.readTextFile(denoJsoncPath);
      // JSON.parse 可以解析 JSONC 格式（带注释的 JSON）
      return JSON.parse(content);
    } catch {
      // 两个文件都不存在
      return null;
    }
  }
}

/**
 * 同步读取 deno.json 或 deno.jsonc 文件
 * 优先尝试 deno.json，如果不存在则尝试 deno.jsonc
 * @param basePath 基础路径（目录路径，不包含文件名）
 * @returns 解析后的 JSON 对象，如果文件不存在返回 null
 */
export function readDenoJsonSync(
  basePath?: string,
): Record<string, any> | null {
  const base = basePath || Deno.cwd();
  const baseDir = base.endsWith("/") ? base.slice(0, -1) : base;

  // 优先尝试 deno.json
  const denoJsonPath = `${baseDir}/deno.json`;
  try {
    const content = Deno.readTextFileSync(denoJsonPath);
    // JSON.parse 可以解析 JSONC 格式（带注释的 JSON）
    return JSON.parse(content);
  } catch {
    // deno.json 不存在，尝试 deno.jsonc
    try {
      const denoJsoncPath = `${baseDir}/deno.jsonc`;
      const content = Deno.readTextFileSync(denoJsoncPath);
      // JSON.parse 可以解析 JSONC 格式（带注释的 JSON）
      return JSON.parse(content);
    } catch {
      // 两个文件都不存在
      return null;
    }
  }
}
