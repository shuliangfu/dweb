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
  if (filePath.startsWith("./")) {
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
export function resolveRelativePath(
  baseDir: string,
  relativePath: string,
): string {
  const parts = baseDir.split("/").filter((p) => p);
  const importParts = relativePath.split("/").filter((p) => p);

  for (const part of importParts) {
    if (part === "..") {
      parts.pop();
    } else if (part !== ".") {
      parts.push(part);
    }
  }

  let absolutePath = "/" + parts.join("/");

  // 如果没有扩展名，尝试添加 .tsx
  if (!absolutePath.match(/\.(tsx?|jsx?)$/)) {
    // 检查是否存在对应的 .tsx 文件
    try {
      Deno.statSync(absolutePath + ".tsx");
      absolutePath += ".tsx";
    } catch (_e) {
      // 如果 .tsx 不存在，检查 .ts
      try {
        Deno.statSync(absolutePath + ".ts");
        absolutePath += ".ts";
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
export function getRelativePath(
  filePath: string,
  basePath: string = Deno.cwd(),
): string {
  return filePath.startsWith(basePath)
    ? filePath.slice(basePath.length + 1)
    : filePath;
}

/**
 * 清理 URL，移除空格
 * @param url URL 字符串
 * @returns 清理后的 URL
 */
export function cleanUrl(url: string): string {
  return url.trim().replace(/\s+/g, "");
}

/**
 * 解析导入映射中的路径别名
 * 将路径别名（如 @components/）替换为实际路径
 *
 * @param importPath 导入路径（可能包含路径别名）
 * @param importMap 导入映射对象（从 deno.json 读取）
 * @param baseDir 基础目录（用于解析相对路径）
 * @returns 解析后的实际路径
 *
 * @example
 * ```ts
 * const importMap = { "@components/": "./components/" };
 * resolveImportAlias("@components/Navbar.tsx", importMap, "/path/to/project");
 * // 返回: "/path/to/project/components/Navbar.tsx"
 * ```
 */
/**
 * 查找项目根目录（包含 deno.json 或 deno.jsonc 的目录）
 * @param startDir 起始目录
 * @returns 项目根目录路径
 */
export function findProjectRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== "/" && currentDir !== "") {
    try {
      // 优先尝试 deno.json
      const denoJsonPath = `${currentDir}/deno.json`;
      Deno.statSync(denoJsonPath);
      return currentDir;
    } catch {
      try {
        // deno.json 不存在，尝试 deno.jsonc
        const denoJsoncPath = `${currentDir}/deno.jsonc`;
        Deno.statSync(denoJsoncPath);
        return currentDir;
      } catch {
        // 继续向上查找
        const parts = currentDir.split("/").filter((p) => p);
        if (parts.length === 0) break;
        parts.pop();
        currentDir = "/" + parts.join("/");
      }
    }
  }
  return startDir; // 如果找不到，返回起始目录
}

export function resolveImportAlias(
  importPath: string,
  importMap: Record<string, string>,
  baseDir: string,
): string {
  // 查找匹配的路径别名（以 / 结尾的别名，如 @components/）
  // 按长度从长到短排序，确保更具体的别名优先匹配
  const sortedAliases = Object.entries(importMap).sort((a, b) =>
    b[0].length - a[0].length
  );

  // 找到项目根目录（importMap 中的路径是相对于项目根目录的）
  const projectRoot = findProjectRoot(baseDir);

  for (const [alias, aliasValue] of sortedAliases) {
    // 检查是否匹配路径别名
    if (alias.endsWith("/") && importPath.startsWith(alias)) {
      // 提取子路径（如 "@components/Navbar.tsx" -> "Navbar.tsx"）
      const subPath = importPath.substring(alias.length);

      // 拼接实际路径
      const resolvedPath = aliasValue.endsWith("/")
        ? `${aliasValue}${subPath}`
        : `${aliasValue}/${subPath}`;

      // 如果已经是绝对路径，直接返回
      if (resolvedPath.startsWith("/")) {
        return resolvedPath;
      }

      // 相对路径，需要基于项目根目录解析
      const normalizedRoot = projectRoot.replace(/\/$/, "") || "/";
      const normalizedPath = resolvedPath.replace(/^\.\//, ""); // 移除开头的 ./

      // 处理 .. 路径
      const rootParts = normalizedRoot === "/"
        ? []
        : normalizedRoot.split("/").filter((p) => p);
      const pathParts = normalizedPath.split("/").filter((p) => p);

      for (const part of pathParts) {
        if (part === "..") {
          if (rootParts.length > 0) {
            rootParts.pop();
          }
        } else if (part !== ".") {
          rootParts.push(part);
        }
      }

      return "/" + rootParts.join("/");
    }

    // 检查精确匹配（不带 / 的别名，如 @dreamer/dweb）
    if (!alias.endsWith("/") && importPath === alias) {
      // 精确匹配，直接返回映射值
      if (aliasValue.startsWith("/")) {
        return aliasValue;
      }

      // 相对路径，基于项目根目录解析
      const normalizedRoot = projectRoot.replace(/\/$/, "") || "/";
      const normalizedPath = aliasValue;

      // 处理 ../ 开头的路径
      if (normalizedPath.startsWith("../")) {
        const rootParts = normalizedRoot === "/"
          ? []
          : normalizedRoot.split("/").filter((p) => p);
        const pathParts = normalizedPath.split("/").filter((p) => p);

        for (const part of pathParts) {
          if (part === "..") {
            if (rootParts.length > 0) {
              rootParts.pop();
            }
          } else if (part !== ".") {
            rootParts.push(part);
          }
        }

        return "/" + rootParts.join("/");
      }

      // 普通相对路径（./ 开头或不带 ./）
      const rootParts = normalizedRoot === "/"
        ? []
        : normalizedRoot.split("/").filter((p) => p);
      const pathParts = normalizedPath.replace(/^\.\//, "").split("/").filter(
        (p) => p,
      );
      rootParts.push(...pathParts);

      return "/" + rootParts.join("/");
    }
  }

  // 如果没有匹配的别名，返回原路径
  return importPath;
}

/**
 * 替换文件内容中的路径别名
 * 将文件内容中的路径别名（如 @components/）替换为相对路径
 *
 * @param content 文件内容
 * @param importMap 导入映射对象（从 deno.json 读取）
 * @param fileDir 文件所在目录（用于计算相对路径）
 * @returns 替换后的文件内容
 */
export function replaceImportAliasesInContent(
  content: string,
  importMap: Record<string, string>,
  fileDir: string,
): string {
  // 预处理：移除针对路径别名的 type-only 导入，避免将类型导入转成运行时依赖
  // 例如：import type { PageProps } from "@dreamer/dweb";
  // 保留普通的相对路径 type 导入（不匹配 @ 开头）
  // 注意：使用更精确的正则表达式，避免匹配到多行内容
  // 匹配 import type 语句，但不匹配包含其他 import 语句的内容
  // 使用负向前瞻确保不会匹配到下一个 import 语句
  content = content.replace(
    /import\s+type\s+(?:(?!import\s)[\s\S])*?\s+from\s+['"]@[^'"]+['"];?\n?/g,
    "",
  );

  // 匹配 import 语句中的路径别名
  // 支持: import ... from "@components/..." 或 import("@components/...")
  const importRegex = /(?:from\s+['"]|import\s*\(\s*['"])(@[^'"]+)(['"])/g;

  return content.replace(importRegex, (match, importPath, _quote) => {
    // 先尝试直接使用 importMap 查找（优先处理路径别名）
    for (const [alias, aliasValue] of Object.entries(importMap)) {
      if (alias.endsWith("/") && importPath.startsWith(alias)) {
        // 找到匹配的路径别名，直接处理
        const subPath = importPath.substring(alias.length);
        const resolved = aliasValue.endsWith("/")
          ? `${aliasValue}${subPath}`
          : `${aliasValue}/${subPath}`;

        // 基于项目根目录解析为绝对路径
        const projectRoot = findProjectRoot(fileDir);
        const normalizedRoot = projectRoot.replace(/\/$/, "") || "/";
        const normalizedPath = resolved.replace(/^\.\//, "");

        // 处理路径
        const rootParts = normalizedRoot === "/"
          ? []
          : normalizedRoot.split("/").filter((p) => p);
        const pathParts = normalizedPath.split("/").filter((p) => p);

        for (const part of pathParts) {
          if (part === "..") {
            if (rootParts.length > 0) {
              rootParts.pop();
            }
          } else if (part !== ".") {
            rootParts.push(part);
          }
        }

        const absolutePath = "/" + rootParts.join("/");

        // 转换为相对路径（相对于文件所在目录）
        const fileParts = fileDir.split("/").filter((p) => p);
        const resolvedParts = absolutePath.split("/").filter((p) => p);
        let commonLength = 0;
        while (
          commonLength < fileParts.length &&
          commonLength < resolvedParts.length &&
          fileParts[commonLength] === resolvedParts[commonLength]
        ) {
          commonLength++;
        }
        const upLevels = fileParts.length - commonLength;
        const downParts = resolvedParts.slice(commonLength);
        const upPath = upLevels > 0 ? "../".repeat(upLevels) : "./";
        const relativePath = upPath + downParts.join("/");

        return match.replace(importPath, relativePath);
      }
    }

    // 如果没有匹配到路径别名，使用 resolveImportAlias 解析
    const resolvedPath = resolveImportAlias(importPath, importMap, fileDir);

    // 如果解析后的路径仍然包含 @，说明没有匹配到别名
    // 这可能是 importMap 为空或者别名配置不正确
    if (resolvedPath.startsWith("@")) {
      // 如果还是找不到，返回原始匹配（esbuild 插件会处理）
      return match;
    }

    // 将绝对路径转换为相对路径（相对于文件所在目录）
    let relativePath: string;
    if (resolvedPath.startsWith("/")) {
      // 绝对路径，需要转换为相对路径
      // 简单的相对路径计算
      const fileParts = fileDir.split("/").filter((p) => p);
      const resolvedParts = resolvedPath.split("/").filter((p) => p);

      // 找到共同的前缀
      let commonLength = 0;
      while (
        commonLength < fileParts.length &&
        commonLength < resolvedParts.length &&
        fileParts[commonLength] === resolvedParts[commonLength]
      ) {
        commonLength++;
      }

      // 计算需要向上几级
      const upLevels = fileParts.length - commonLength;
      const downParts = resolvedParts.slice(commonLength);

      // 构建相对路径
      const upPath = upLevels > 0 ? "../".repeat(upLevels) : "./";
      relativePath = upPath + downParts.join("/");
    } else {
      relativePath = resolvedPath;
    }

    // 标准化路径分隔符（统一使用 /）
    relativePath = relativePath.replace(/\\/g, "/");

    // 确保相对路径以 ./ 开头（如果还没有）
    if (!relativePath.startsWith(".") && !relativePath.startsWith("/")) {
      relativePath = `./${relativePath}`;
    }

    return match.replace(importPath, relativePath);
  });
}
