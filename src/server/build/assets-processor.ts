import { logger } from "../utils/logger.ts";
import * as path from "@std/path";
import { ensureDir } from "@std/fs/ensure-dir";
import { walk } from "@std/fs/walk";

/**
 * 静态资源处理器
 * 负责静态资源的压缩、复制等处理
 */
export class AssetProcessor {
  /**
   * 压缩静态资源（图片、字体等）
   *
   * @param inputPath - 输入文件路径
   * @param outputPath - 输出文件路径
   * @param ext - 文件扩展名
   * @param quality - 压缩质量（0-100，仅用于图片）
   * @returns 是否成功压缩（如果返回 false，应该直接复制原文件）
   */
  async compressAsset(
    inputPath: string,
    outputPath: string,
    ext: string,
    quality: number,
  ): Promise<boolean> {
    try {
      const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
      if (imageExts.includes(ext.toLowerCase())) {
        return await this.compressImage(
          inputPath,
          outputPath,
          ext.toLowerCase(),
          quality,
        );
      }

      const fontExts = [".woff", ".woff2", ".ttf", ".otf", ".eot"];
      if (fontExts.includes(ext.toLowerCase())) {
        return false;
      }

      return false;
    } catch (error) {
      logger.warn(`压缩资源失败`, { path: inputPath, error });
      return false;
    }
  }

  /**
   * 压缩图片
   */
  private async compressImage(
    inputPath: string,
    outputPath: string,
    ext: string,
    _quality: number,
  ): Promise<boolean> {
    try {
      const imageData = await Deno.readFile(inputPath);

      if (ext === ".svg") {
        const svgContent = new TextDecoder().decode(imageData);
        const optimized = svgContent
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/\s+/g, " ")
          .replace(/>\s+</g, "><")
          .trim();

        await Deno.writeTextFile(outputPath, optimized);
        return true;
      }

      if (imageData.length < 50 * 1024) {
        return false;
      }

      logger.warn(`图片较大，建议使用外部工具压缩`, {
        path: inputPath,
        size: `${(imageData.length / 1024).toFixed(2)}KB`,
      });
      return false;
    } catch (error) {
      logger.warn(`图片压缩失败`, { path: inputPath, error });
      return false;
    }
  }

  /**
   * 处理静态资源目录
   * 复制或压缩静态资源文件到输出目录
   *
   * @param staticDir - 静态资源目录
   * @param staticOutDir - 输出目录
   * @param compressAssets - 是否启用压缩
   * @param imageQuality - 图片压缩质量
   * @returns 处理统计信息
   */
  async processStaticAssets(
    staticDir: string,
    staticOutDir: string,
    compressAssets: boolean,
    imageQuality: number,
  ): Promise<{ copied: number; compressed: number }> {
    try {
      await ensureDir(staticOutDir);

      let copiedCount = 0;
      let compressedCount = 0;

      for await (const entry of walk(staticDir)) {
        if (entry.isFile) {
          const ext = path.extname(entry.path).toLowerCase();
          const relativePath = path.relative(staticDir, entry.path);
          const outputPath = path.join(staticOutDir, relativePath);
          const outputDir = path.dirname(outputPath);
          await ensureDir(outputDir);

          if (compressAssets) {
            const compressed = await this.compressAsset(
              entry.path,
              outputPath,
              ext,
              imageQuality,
            );
            if (compressed) {
              compressedCount++;
            } else {
              await Deno.copyFile(entry.path, outputPath);
              copiedCount++;
            }
          } else {
            await Deno.copyFile(entry.path, outputPath);
            copiedCount++;
          }
        }
      }

      return { copied: copiedCount, compressed: compressedCount };
    } catch (error) {
      logger.warn(`处理静态资源失败`, { staticDir, error });
      return { copied: 0, compressed: 0 };
    }
  }

  /**
   * 清空目录
   *
   * @param dirPath - 目录路径
   */
  async clearDirectory(dirPath: string): Promise<void> {
    try {
      // 检查目录是否存在
      let stat;
      try {
        stat = await Deno.stat(dirPath);
      } catch {
        // 目录不存在，直接返回
        return;
      }

      if (!stat.isDirectory) {
        // 不是目录，直接返回
        return;
      }

      // 删除目录中的所有内容
      try {
        for await (const entry of walk(dirPath, { includeDirs: false })) {
          if (entry.isFile) {
            try {
              await Deno.remove(entry.path);
            } catch {
              // 忽略单个文件删除错误
            }
          }
        }

        // 删除所有子目录
        for await (const entry of walk(dirPath, { includeFiles: false })) {
          if (entry.isDirectory && entry.path !== dirPath) {
            try {
              await Deno.remove(entry.path, { recursive: true });
            } catch {
              // 忽略删除错误
            }
          }
        }

        logger.info(`已清空目录`, { path: dirPath });
      } catch (_error) {
        // 如果 walk 失败（可能是目录结构有问题），尝试直接删除整个目录后重建
        try {
          await Deno.remove(dirPath, { recursive: true });
          await ensureDir(dirPath);
          logger.info(`已清空并重建目录`, { path: dirPath });
        } catch (removeError) {
          logger.warn(`清空目录失败`, { path: dirPath, error: removeError });
        }
      }
    } catch (error) {
      logger.warn(`清空目录失败`, { path: dirPath, error });
    }
  }
}
