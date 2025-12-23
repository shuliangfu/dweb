/**
 * 路径处理工具函数
 * 用于文件路径转换、解析、规范化等
 */

/**
 * 将文件路径转换为 HTTP URL（用于浏览器动态导入）
 * @param filePath 文件路径（file:// 或绝对路径）
 * @returns HTTP URL
 */
export function filePathToHttpUrl(filePath: string): string {
  // 清理输入路径，移除空格
  filePath = cleanUrl(filePath);
  
  // 如果是 file:// 协议，转换为 /__modules/ 路径
  if (filePath.startsWith("file://")) {
    // 提取文件路径（去掉 file:// 前缀）
    const path = filePath.replace(/^file:\/\//, "");
    // 获取相对于工作目录的路径
    const cwd = Deno.cwd();
    let relativePath = path;
    if (path.startsWith(cwd)) {
      relativePath = path.substring(cwd.length + 1);
    }
    // 转换为 URL 编码的路径
    return `/__modules/${encodeURIComponent(relativePath)}`;
  }
  // 如果已经是 HTTP URL，直接返回（但需要清理空格）
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return cleanUrl(filePath);
  }
  // 如果路径以 ./ 开头，说明是相对路径（生产环境构建后的文件）
  // 转换为 /__modules/ 路径，但保持文件名不变
  if (filePath.startsWith('./')) {
    const fileName = filePath.substring(2); // 移除 ./ 前缀
    return `/__modules/${encodeURIComponent(cleanUrl(fileName))}`;
  }
  // 否则作为相对路径处理
  return `/__modules/${encodeURIComponent(cleanUrl(filePath))}`;
}

/**
 * 将文件路径转换为绝对路径
 * 在 JSR 包上下文中，直接使用绝对路径，避免被错误解析为 jsr: 协议
 * @param filePath 文件路径
 * @returns 绝对路径（带 file:// 前缀）
 */
export function resolveFilePath(filePath: string): string {
  if (filePath.startsWith("file://")) {
    return filePath;
  }
  // 如果已经是绝对路径（以 / 开头），直接添加 file:// 前缀
  // 这样可以避免在 JSR 包上下文中被错误解析
  if (filePath.startsWith("/")) {
    return `file://${filePath}`;
  }
  // 对于相对路径，需要拼接当前工作目录
  // 但通常 routeInfo.filePath 已经是绝对路径，所以这种情况应该很少
  return `file://${Deno.cwd()}/${filePath}`;
}

/**
 * 解析相对路径为绝对路径
 * @param baseDir 基础目录
 * @param relativePath 相对路径
 * @returns 绝对路径
 */
export function resolveRelativePath(baseDir: string, relativePath: string): string {
  const parts = baseDir.split('/').filter(p => p);
  const importParts = relativePath.split('/').filter(p => p);
  
  for (const part of importParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }
  
  let absolutePath = '/' + parts.join('/');
  
  // 如果没有扩展名，尝试添加 .tsx
  if (!absolutePath.match(/\.(tsx?|jsx?)$/)) {
    // 检查是否存在对应的 .tsx 文件
    try {
      Deno.statSync(absolutePath + '.tsx');
      absolutePath += '.tsx';
    } catch (_e) {
      // 如果 .tsx 不存在，检查 .ts
      try {
        Deno.statSync(absolutePath + '.ts');
        absolutePath += '.ts';
      } catch (_e2) {
        // 如果都不存在，保持原样
      }
    }
  }
  
  return absolutePath;
}

/**
 * 将组件文件路径转换为模块请求路径
 * @param pathname 路径名
 * @returns 规范化后的路径
 */
export function normalizeModulePath(pathname: string): string {
  if (
    (pathname.endsWith(".tsx") || pathname.endsWith(".ts")) &&
    !pathname.startsWith("/__modules/")
  ) {
    const cleanPath = pathname.startsWith("/")
      ? pathname.substring(1)
      : pathname;
    return `/__modules/${cleanPath}`;
  }
  return pathname;
}

/**
 * 计算文件的相对路径
 * @param filePath 文件路径
 * @param basePath 基础路径，默认为当前工作目录
 * @returns 相对路径
 */
export function getRelativePath(filePath: string, basePath: string = Deno.cwd()): string {
  return filePath.startsWith(basePath) ? filePath.slice(basePath.length + 1) : filePath;
}

/**
 * 清理 URL，移除空格
 * @param url URL 字符串
 * @returns 清理后的 URL
 */
export function cleanUrl(url: string): string {
  return url.trim().replace(/\s+/g, '');
}

