/**
 * 文件上传插件
 * 处理文件上传，支持多文件、文件类型验证、大小限制
 */

import type { Plugin, Request, Response } from '../../types/index.ts';
import type { FileUploadPluginOptions, UploadResult, UploadedFile } from './types.ts';
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
    case 'original':
      return originalName;
    case 'timestamp':
      return `${Date.now()}-${baseName}${ext}`;
    case 'uuid':
      // 简化实现，使用时间戳 + 随机数
      const random = Math.random().toString(36).substring(2, 15);
      return `${Date.now()}-${random}${ext}`;
    case 'hash':
      // 使用文件内容的 hash（需要文件内容，这里简化处理）
      const hash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(`${originalName}-${Date.now()}`)
      );
      const hashArray = Array.from(new Uint8Array(hash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `${hashHex.substring(0, 16)}${ext}`;
    default:
      return `${Date.now()}-${baseName}${ext}`;
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
    for (const [key, value] of formData.entries()) {
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

      // 生成文件名
      const filename = await generateFilename(file.name, namingStrategy);
      const filePath = path.join(targetDir, filename);

      // 保存文件
      const fileData = await file.arrayBuffer();
      await Deno.writeFile(filePath, new Uint8Array(fileData));

      files.push({
        originalName: file.name,
        filename,
        path: path.relative(Deno.cwd(), filePath),
        size: file.size,
        mimeType: file.type,
        extension: path.extname(file.name).slice(1),
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
export type { FileUploadPluginOptions, FileUploadConfig, UploadResult, UploadedFile } from './types.ts';
export { handleFileUpload };

