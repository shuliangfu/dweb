import { HashCalculator } from "./hash-calculator.ts";
import { FileNameUtils } from "./utils.ts";
import * as path from "@std/path";

/**
 * 构建缓存管理器
 * 负责检查和管理构建缓存
 */
export class CacheManager {
  private hashCalculator: HashCalculator;

  constructor(hashCalculator: HashCalculator) {
    this.hashCalculator = hashCalculator;
  }

  /**
   * 检查文件是否需要重新编译（基于缓存）
   *
   * @param filePath - 源文件路径
   * @param outDir - 输出目录
   * @param sourceHash - 源文件 hash
   * @returns 如果缓存有效返回缓存的文件名，否则返回 null
   */
  async checkBuildCache(
    _filePath: string,
    outDir: string,
    sourceHash: string,
  ): Promise<string | null> {
    try {
      const hashName = FileNameUtils.generateHashFileName(sourceHash);
      const outputPath = path.join(outDir, hashName);

      try {
        await Deno.stat(outputPath);
        return hashName;
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * 获取源文件的 hash（用于缓存检查）
   *
   * @param filePath - 文件路径
   * @returns hash 字符串
   */
  async getSourceHash(filePath: string): Promise<string> {
    return await this.hashCalculator.calculateSourceHash(filePath);
  }
}
