/**
 * 文件上传 API 路由
 * 用于处理文件上传请求
 * 访问方式：POST /api/upload/upload-image
 */

import type { ApiContext } from "@dreamer/dweb";
import { handleFileUpload } from "@dreamer/dweb/plugins";
import * as path from "@std/path";

/**
 * 存储待删除的文件路径和定时器
 * key: 文件路径, value: 定时器 ID
 */
const deletionTimers = new Map<string, number>();

/**
 * 设置文件自动删除定时器
 * @param filePath 文件路径
 */
function scheduleFileDeletion(filePath: string): void {
  // 如果文件已经存在定时器，先清除旧的
  const existingTimer = deletionTimers.get(filePath);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // 设置新的定时器，1分钟后删除
  const timerId = setTimeout(async () => {
    try {
      // 检查文件是否存在
      try {
        const fileInfo = await Deno.stat(filePath);
        if (fileInfo.isFile) {
          // 删除文件
          await Deno.remove(filePath);
          console.log(`✅ [自动删除] 文件已删除: ${filePath}`);

          // 尝试删除空目录
          const dirPath = path.dirname(filePath);
          try {
            const dirInfo = await Deno.stat(dirPath);
            if (dirInfo.isDirectory) {
              // 检查目录是否为空
              const entries = [];
              for await (const entry of Deno.readDir(dirPath)) {
                entries.push(entry);
              }
              if (entries.length === 0) {
                await Deno.remove(dirPath);
                console.log(`✅ [自动删除] 空目录已删除: ${dirPath}`);
              }
            }
          } catch {
            // 目录删除失败，忽略
          }
        }
      } catch {
        // 文件不存在，忽略
        console.log(`ℹ️  [自动删除] 文件不存在，跳过: ${filePath}`);
      }

      // 从 Map 中移除定时器
      deletionTimers.delete(filePath);
    } catch (error) {
      console.error(`❌ [自动删除] 删除文件失败: ${filePath}`, error);
    }
  }, 120 * 1000); // 2分钟 = 120 * 1000 毫秒

  // 存储定时器 ID
  deletionTimers.set(filePath, timerId);
  console.log(`⏰ [自动删除] 已设置定时器，2分钟后删除: ${filePath}`);
}

/**
 * 上传图片
 * 访问方式：POST /api/upload/upload-image
 */
export async function uploadImage({ req, res }: ApiContext) {
  try {
    const result = await handleFileUpload(req, {
      uploadDir: "./uploads",
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      allowMultiple: true,
      namingStrategy: "uuid",
      createSubdirs: true,
      // 子目录策略（支持模板格式或预设值）
      // 模板格式示例：
      //   'YYYY/mm/dd' - 2026/01/02（默认，适合上传较多的项目）
      //   'YYYY/mm' - 2026/01（适合上传较少的项目）
      //   'YYYY' - 2026（适合上传很少的项目）
      //   'YY/m/d' - 26/1/2（使用2位年份和1-2位月日）
      //   'YYYY-MM-DD' - 2026-01-02（使用横线分隔符）
      // 预设值（向后兼容）：
      //   'year-month-day' - 等同于 'YYYY/mm/dd'
      //   'year-month' - 等同于 'YYYY/mm'
      //   'year' - 等同于 'YYYY'
      subdirStrategy: "YYYY",
    });

    if (result.success && result.files) {
      // 为每个上传的文件设置自动删除定时器
      result.files.forEach((file) => {
        // 构建完整的文件路径
        const filePath = path.isAbsolute(file.path)
          ? file.path
          : path.resolve(Deno.cwd(), file.path);

        // 设置定时删除
        scheduleFileDeletion(filePath);
      });

      return res.json({
        success: true,
        message: "上传成功，文件将在 1 分钟后自动删除",
        data: result.files,
        warning: "注意：上传的文件会在 1 分钟后自动删除，请及时保存",
      });
    } else {
      return res.json({
        success: false,
        message: result.error || "上传失败",
        errors: result.errors,
      }, { status: 400 });
    }
  } catch (error) {
    return res.json({
      success: false,
      message: error instanceof Error ? error.message : "上传失败",
    }, { status: 500 });
  }
}
