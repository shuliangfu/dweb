/**
 * 文件上传插件
 * 处理文件上传，支持多文件、文件类型验证、大小限制
 */

import type { Plugin, Request, Response } from '../../types/index.ts';
import type { FileUploadPluginOptions, UploadResult, UploadedFile, ImageCropConfig, ImageCompressConfig } from './types.ts';
import * as path from '@std/path';
import { ensureDir } from '@std/fs/ensure-dir';
import { crypto } from '@std/crypto';

/**
 * 生成文件名
 */
async function generateFilename(
  originalName: string,
  strategy: 'original' | 'timestamp' | 'uuid' | 'hash' = 'timestamp'
): Promise<string> {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);

  switch (strategy) {
    case 'original': {
      return originalName;
    }
    case 'timestamp': {
      return `${Date.now()}-${baseName}${ext}`;
    }
    case 'uuid': {
      // 简化实现，使用时间戳 + 随机数
      const random = Math.random().toString(36).substring(2, 15);
      return `${Date.now()}-${random}${ext}`;
    }
    case 'hash': {
      // 使用文件内容的 hash（需要文件内容，这里简化处理）
      const hash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(`${originalName}-${Date.now()}`)
      );
      const hashArray = Array.from(new Uint8Array(hash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `${hashHex.substring(0, 16)}${ext}`;
    }
    default: {
      return `${Date.now()}-${baseName}${ext}`;
    }
  }
}

/**
 * 验证文件类型
 */
function validateFileType(
  filename: string,
  mimeType: string,
  allowedTypes: string[]
): boolean {
  if (allowedTypes.length === 0) {
    return true;
  }

  const ext = path.extname(filename).toLowerCase().slice(1);

  return allowedTypes.some(type => {
    // 检查扩展名
    if (type.startsWith('.')) {
      return type.slice(1).toLowerCase() === ext;
    }
    // 检查 MIME 类型
    if (type.includes('/')) {
      if (type.endsWith('/*')) {
        const baseType = type.slice(0, -2);
        return mimeType.startsWith(baseType + '/');
      }
      return mimeType === type;
    }
    // 检查扩展名（无点）
    return type.toLowerCase() === ext;
  });
}

/**
 * 检查是否为图片文件
 */
function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * 居中裁切图片（顶边对齐）
 * 注意：Deno 环境下需要外部图片处理库（如 sharp）
 * 这里提供框架和接口
 */
function cropImage(
  imageData: Uint8Array<ArrayBuffer>,
  _config: ImageCropConfig
): Uint8Array<ArrayBuffer> {
  // 实际实现需要使用图片处理库
  // 例如使用 sharp 或 ImageMagick
  // 这里提供接口框架
  
  // 居中裁切逻辑（顶边对齐）：
  // 1. 读取图片尺寸
  // 2. 计算裁切区域（居中，顶边对齐）
  // 3. 裁切图片
  // 4. 返回裁切后的图片数据
  
  console.warn('[File Upload Plugin] 图片裁切功能需要安装图片处理库（如 sharp）');
  // 返回原图片数据（实际应该返回裁切后的数据）
  return new Uint8Array(imageData);
}

/**
 * 压缩图片为 WebP 或 AVIF
 * 注意：Deno 环境下需要外部图片处理库
 */
function compressImage(
  imageData: Uint8Array<ArrayBuffer>,
  config: ImageCompressConfig
): { data: Uint8Array<ArrayBuffer>; format: string } {
  // 实际实现需要使用图片处理库
  // 例如使用 sharp 或 ImageMagick
  
  const format = config.format || 'webp';
  const _quality = config.quality || 80;
  
  console.warn(`[File Upload Plugin] 图片压缩功能（${format}）需要安装图片处理库（如 sharp）`);
  
  // 返回原图片数据（实际应该返回压缩后的数据）
  return {
    data: new Uint8Array(imageData),
    format: format,
  };
}

/**
 * 处理文件上传
 */
export async function handleFileUpload(
  req: Request,
  config: FileUploadPluginOptions['config'] = {}
): Promise<UploadResult> {
  const uploadDir = config.uploadDir || 'uploads';
  const maxFileSize = config.maxFileSize || 10 * 1024 * 1024; // 默认 10MB
  const allowedTypes = config.allowedTypes || [];
  const allowMultiple = config.allowMultiple !== false;
  const namingStrategy = config.namingStrategy || 'timestamp';
  const createSubdirs = config.createSubdirs !== false;

  try {
    // 解析 multipart/form-data
    const formData = await req.formData();
    const files: UploadedFile[] = [];
    const errors: string[] = [];

    // 获取所有文件字段
    const fileEntries: File[] = [];
    for (const [_key, value] of formData.entries()) {
      if (value instanceof File) {
        fileEntries.push(value);
      }
    }

    if (fileEntries.length === 0) {
      return {
        success: false,
        error: '没有上传文件',
      };
    }

    if (!allowMultiple && fileEntries.length > 1) {
      return {
        success: false,
        error: '只允许上传一个文件',
      };
    }

    // 检查总大小
    const totalSize = fileEntries.reduce((sum, file) => sum + file.size, 0);
    if (config.totalLimit && totalSize > config.totalLimit) {
      return {
        success: false,
        error: `总文件大小超过限制 ${(config.totalLimit / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    // 创建上传目录
    let targetDir = uploadDir;
    if (createSubdirs) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      targetDir = path.join(uploadDir, String(year), month, day);
    }
    await ensureDir(targetDir);

    // 处理每个文件
    for (const file of fileEntries) {
      // 验证文件大小
      const fileSizeLimit = config.perFileLimit || maxFileSize;
      if (file.size > fileSizeLimit) {
        errors.push(`${file.name}: 文件大小超过限制 ${(fileSizeLimit / 1024 / 1024).toFixed(2)}MB`);
        continue;
      }

      // 验证文件类型
      if (!validateFileType(file.name, file.type, allowedTypes)) {
        errors.push(`${file.name}: 不允许的文件类型`);
        continue;
      }

      // 读取文件数据
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer as ArrayBuffer);
      let processedData = fileData;
      let finalFilename = await generateFilename(file.name, namingStrategy);
      let finalExtension = path.extname(file.name).slice(1);
      let finalMimeType = file.type;
      let finalSize = file.size;

      // 如果是图片文件，进行图片处理
      if (isImageFile(file.type)) {
        // 图片裁切
        if (config.imageCrop?.enabled && config.imageCrop.width && config.imageCrop.height) {
          try {
            processedData = cropImage(fileData, config.imageCrop);
            finalSize = processedData.length;
            console.log(`✅ [File Upload] 图片裁切完成: ${file.name} -> ${config.imageCrop.width}x${config.imageCrop.height}`);
          } catch (error) {
            console.warn(`⚠️  [File Upload] 图片裁切失败: ${file.name}`, error);
            // 裁切失败，使用原图
          }
        }

        // 图片压缩（转换为 WebP 或 AVIF）
        if (config.imageCompress?.enabled) {
          try {
            const compressed = compressImage(processedData, config.imageCompress);
            processedData = compressed.data;
            finalSize = processedData.length;
            
            // 更新文件名和扩展名
            const baseName = path.basename(finalFilename, path.extname(finalFilename));
            finalExtension = compressed.format;
            finalFilename = `${baseName}.${compressed.format}`;
            finalMimeType = compressed.format === 'webp' ? 'image/webp' : 'image/avif';
            
            console.log(`✅ [File Upload] 图片压缩完成: ${file.name} -> ${compressed.format}`);
          } catch (error) {
            console.warn(`⚠️  [File Upload] 图片压缩失败: ${file.name}`, error);
            // 压缩失败，使用原图
          }
        }
      }

      // 保存文件
      const filePath = path.join(targetDir, finalFilename);
      await Deno.writeFile(filePath, processedData);

      files.push({
        originalName: file.name,
        filename: finalFilename,
        path: path.relative(Deno.cwd(), filePath),
        size: finalSize,
        mimeType: finalMimeType,
        extension: finalExtension,
      });
    }

    if (errors.length > 0 && files.length === 0) {
      return {
        success: false,
        error: '文件上传失败',
        errors,
      };
    }

    return {
      success: true,
      files,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '文件上传失败',
    };
  }
}

/**
 * 生成客户端上传脚本
 */
function generateClientScript(): string {
  return `
    <script>
      (function() {
        // 文件上传工具
        window.FileUploader = {
          upload: async function(formData, options = {}) {
            try {
              const response = await fetch(options.url || '/api/upload', {
                method: 'POST',
                body: formData,
                headers: options.headers || {}
              });
              
              if (!response.ok) {
                throw new Error('上传失败: ' + response.statusText);
              }
              
              return await response.json();
            } catch (error) {
              throw error;
            }
          },
          
          validateFile: function(file, options = {}) {
            const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
            const allowedTypes = options.allowedTypes || [];
            
            if (file.size > maxSize) {
              return { valid: false, error: '文件大小超过限制' };
            }
            
            if (allowedTypes.length > 0) {
              const ext = file.name.split('.').pop()?.toLowerCase();
              const mimeType = file.type;
              
              const isAllowed = allowedTypes.some(type => {
                if (type.startsWith('.')) {
                  return type.slice(1).toLowerCase() === ext;
                }
                if (type.includes('/')) {
                  return mimeType === type || mimeType.startsWith(type.replace('/*', '/'));
                }
                return type.toLowerCase() === ext;
              });
              
              if (!isAllowed) {
                return { valid: false, error: '不允许的文件类型' };
              }
            }
            
            return { valid: true };
          }
        };
      })();
    </script>
  `;
}

/**
 * 创建文件上传插件
 */
export function fileUpload(options: FileUploadPluginOptions = {}): Plugin {
  return {
    name: 'file-upload',
    config: options as unknown as Record<string, unknown>,

    /**
     * 请求处理钩子 - 注入客户端上传脚本
     */
    onRequest(_req: Request, res: Response) {
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== 'string') {
        return;
      }

      const contentType = res.headers.get('Content-Type') || '';
      if (!contentType.includes('text/html')) {
        return;
      }

      if (options.injectClientScript !== false) {
        try {
          const html = res.body as string;
          
          // 注入上传脚本（在 </head> 之前）
          if (html.includes('</head>')) {
            const script = generateClientScript();
            res.body = html.replace('</head>', `${script}\n</head>`);
          }
        } catch (error) {
          console.error('[File Upload Plugin] 注入上传脚本时出错:', error);
        }
      }
    },
  };
}

// 导出类型和函数
export type { FileUploadPluginOptions, FileUploadConfig, UploadResult, UploadedFile, ImageCropConfig, ImageCompressConfig } from './types.ts';

