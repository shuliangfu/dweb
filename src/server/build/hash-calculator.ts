import { logger } from "../utils/logger.ts";

/**
 * Hash 计算器
 * 负责文件内容和源文件的 hash 计算
 */
export class HashCalculator {
  /**
   * 计算文件内容的 hash 值
   *
   * @param content - 文件内容（字符串或 Uint8Array）
   * @returns hash 字符串（前 15 个字符）
   */
  async calculateHash(content: string | Uint8Array): Promise<string> {
    let data: Uint8Array;

    if (typeof content === "string") {
      data = new TextEncoder().encode(content);
    } else {
      data = content instanceof Uint8Array ? content : new Uint8Array(content);
    }

    const buffer = new ArrayBuffer(data.length);
    const view = new Uint8Array(buffer);
    view.set(data);

    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
      "",
    );

    return hashHex.substring(0, 15);
  }

  /**
   * 计算源文件的 hash（用于缓存检查）
   * 基于文件内容和修改时间
   *
   * @param filePath - 文件路径
   * @returns hash 字符串（前 10 个字符）
   */
  async calculateSourceHash(filePath: string): Promise<string> {
    try {
      const fileContent = await Deno.readFile(filePath);
      const fileStat = await Deno.stat(filePath);
      const combinedData = new TextEncoder().encode(
        `${fileContent.length}-${fileStat.mtime?.getTime() || 0}`,
      );
      const buffer = new ArrayBuffer(combinedData.length);
      const view = new Uint8Array(buffer);
      view.set(combinedData);
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0"))
        .join(
          "",
        );
      return hashHex.substring(0, 10);
    } catch (error) {
      logger.warn(`计算源文件 hash 失败`, { path: filePath, error });
      return "";
    }
  }
}
