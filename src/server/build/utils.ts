// ============================================================================
// 工具类
// ============================================================================

import * as path from "@std/path";

/**
 * 路径工具类
 * 提供路径标准化、解析等通用功能
 */
export class PathUtils {
  /**
   * 将路径转换为绝对路径
   * 如果已经是绝对路径，直接返回；否则相对于当前工作目录解析
   *
   * @param filePath - 文件路径（相对或绝对）
   * @returns 绝对路径
   */
  static toAbsolutePath(filePath: string): string {
    return path.isAbsolute(filePath)
      ? filePath
      : path.resolve(Deno.cwd(), filePath);
  }

  /**
   * 标准化路径（统一使用正斜杠）
   * 将 Windows 风格的反斜杠转换为正斜杠
   *
   * @param filePath - 文件路径
   * @returns 标准化后的路径
   */
  static normalizePath(filePath: string): string {
    return filePath.replace(/[\/\\]/g, "/");
  }
}

/**
 * Import Map 工具类
 * 提供读取和解析 import map 的功能
 */
export class ImportMapUtils {
  /**
   * 读取 deno.json 或 deno.jsonc 获取 import map
   *
   * @param cwd - 工作目录（可选，默认为当前工作目录）
   * @returns import map 配置对象
   */
  static async loadImportMap(cwd?: string): Promise<Record<string, string>> {
    const workDir = cwd || Deno.cwd();
    let importMap: Record<string, string> = {};
    try {
      const { readDenoJson } = await import("../utils/file.ts");
      const denoJson = await readDenoJson(workDir);
      if (denoJson && denoJson.imports) {
        importMap = denoJson.imports;
      }
    } catch {
      // deno.json 或 deno.jsonc 不存在或解析失败，使用空 import map
    }
    return importMap;
  }
}

/**
 * Loader 工具类
 * 提供文件扩展名到 esbuild loader 的映射
 */
export class LoaderUtils {
  /**
   * 根据文件扩展名获取对应的 esbuild loader
   *
   * @param ext - 文件扩展名（如 ".tsx", ".ts", ".js"）
   * @returns esbuild loader 名称
   */
  static getLoader(ext: string): "tsx" | "ts" | "js" {
    if (ext === ".tsx") {
      return "tsx";
    } else if (ext === ".ts") {
      return "ts";
    } else {
      return "js";
    }
  }

  /**
   * 根据 TypeScript 文件扩展名获取对应的 esbuild loader
   * 仅用于 TypeScript 文件（.tsx 或 .ts），不处理 .js 文件
   *
   * @param ext - TypeScript 文件扩展名（".tsx" 或 ".ts"）
   * @returns esbuild loader 名称（"tsx" 或 "ts"）
   */
  static getTypeScriptLoader(ext: ".tsx" | ".ts"): "tsx" | "ts" {
    return ext === ".tsx" ? "tsx" : "ts";
  }
}

/**
 * 文件名工具类
 * 提供文件名生成、扩展名检查等通用功能
 */
export class FileNameUtils {
  /**
   * 检查文件扩展名是否是 TypeScript 文件
   *
   * @param ext - 文件扩展名
   * @returns 如果是 TypeScript 文件（.tsx 或 .ts）则返回 true
   */
  static isTypeScriptFile(ext: string): boolean {
    return ext === ".tsx" || ext === ".ts";
  }

  /**
   * 根据 hash 值生成 hash 文件名
   *
   * @param hash - hash 值
   * @returns hash 文件名（如 "abc123def456.js"）
   */
  static generateHashFileName(hash: string): string {
    return `${hash}.js`;
  }

  /**
   * 为文件名添加目标前缀（server/ 或 client/）
   *
   * @param fileName - 文件名
   * @param target - 编译目标（"server" | "client"）
   * @returns 带前缀的文件名（如 "server/abc123.js" 或 "client/abc123.js"）
   */
  static addTargetPrefix(
    fileName: string,
    target: "server" | "client",
  ): string {
    return `${target}/${fileName}`;
  }
}

/**
 * 文件映射工具类
 * 提供文件映射表操作的通用功能
 */
export class FileMapUtils {
  /**
   * 更新文件映射表（根据 target 自动处理 server/client 前缀和 .client 后缀）
   *
   * @param fileMap - 文件映射表
   * @param originalPath - 原始文件路径
   * @param hashName - hash 文件名（不包含前缀）
   * @param target - 编译目标（"server" | "client" | "both"）
   */
  static setFileMapping(
    fileMap: Map<string, string>,
    originalPath: string,
    hashName: string,
    target: "server" | "client" | "both",
  ): void {
    if (target === "server" || target === "both") {
      fileMap.set(
        originalPath,
        FileNameUtils.addTargetPrefix(hashName, "server"),
      );
    }
    if (target === "client" || target === "both") {
      fileMap.set(
        `${originalPath}.client`,
        FileNameUtils.addTargetPrefix(hashName, "client"),
      );
    }
  }

  /**
   * 更新文件映射表（用于代码分割场景，需要明确指定 target）
   *
   * @param fileMap - 文件映射表
   * @param originalPath - 原始文件路径
   * @param hashName - hash 文件名（可能已包含前缀）
   * @param target - 编译目标（"server" | "client"）
   */
  static setFileMappingForSplitting(
    fileMap: Map<string, string>,
    originalPath: string,
    hashName: string,
    target: "server" | "client",
  ): void {
    if (target === "client") {
      fileMap.set(`${originalPath}.client`, hashName);
    } else {
      fileMap.set(originalPath, hashName);
    }
  }
}
