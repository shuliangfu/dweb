/**
 * 压缩中间件
 * 支持 Gzip 和 Brotli 压缩
 */

import type { Middleware } from '../types/index.ts';

/**
 * 压缩选项
 */
export interface CompressionOptions {
  /**
   * 压缩级别（1-9，默认 6）
   * 级别越高，压缩率越高，但压缩速度越慢
   */
  level?: number;
  
  /**
   * 最小响应大小（字节），小于此大小的响应不压缩（默认 1024）
   */
  threshold?: number;
  
  /**
   * 是否启用 Gzip 压缩（默认 true）
   */
  gzip?: boolean;
  
  /**
   * 是否启用 Brotli 压缩（默认 false，因为 Deno 可能不支持）
   */
  brotli?: boolean;
  
  /**
   * 要压缩的 Content-Type（默认包含文本类型）
   */
  filter?: (contentType: string) => boolean;
}

/**
 * 默认的 Content-Type 过滤器
 * 只压缩文本类型的响应
 */
function defaultFilter(contentType: string): boolean {
  const textTypes = [
    'text/',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/xhtml+xml',
    'application/rss+xml',
    'application/atom+xml',
    'image/svg+xml',
  ];
  
  return textTypes.some(type => contentType.includes(type));
}

/**
 * 压缩数据（Gzip）
 * @param data 要压缩的数据
 * @param level 压缩级别
 * @returns 压缩后的数据
 */
async function compressGzip(data: Uint8Array, _level: number = 6): Promise<Uint8Array> {
  // Deno 2.x 使用 CompressionStream API
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  
  // 写入数据（创建新的 Uint8Array 以确保类型兼容）
  const dataBuffer = new Uint8Array(data);
  writer.write(dataBuffer);
  writer.close();
  
  // 读取压缩后的数据
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  // 合并所有块
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}

/**
 * 压缩数据（Brotli）
 * @param data 要压缩的数据
 * @param level 压缩级别
 * @returns 压缩后的数据
 */
async function compressBrotli(data: Uint8Array, _level: number = 6): Promise<Uint8Array> {
  try {
    // Deno 2.x 使用 CompressionStream API
    // 注意：Deno 可能不支持 'br'，如果失败则回退到 gzip
    // @ts-ignore - Deno 可能支持 br，但类型定义可能不完整
    const stream = new CompressionStream('br' as CompressionFormat);
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    // 写入数据（创建新的 Uint8Array 以确保类型兼容）
    const dataBuffer = new Uint8Array(data);
    writer.write(dataBuffer);
    writer.close();
    
    // 读取压缩后的数据
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    // 合并所有块
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  } catch (_error) {
    // 如果 Brotli 不支持，返回原始数据
    console.warn('Brotli compression not supported, falling back to original data');
    return data;
  }
}

/**
 * 创建压缩中间件
 * @param options 压缩选项
 * @returns 中间件函数
 */
export function compression(options: CompressionOptions = {}): Middleware {
  const {
    level = 6,
    threshold = 1024,
    gzip = true,
    brotli = false,
    filter = defaultFilter,
  } = options;
  
  return async (req, res, next) => {
    // 先执行下一个中间件，获取响应体
    await next();
    
    // 如果响应体为空或已设置 Content-Encoding，跳过压缩
    if (!res.body || res.headers.get('content-encoding')) {
      return;
    }
    
    // 检查 Content-Type
    const contentType = res.headers.get('content-type') || '';
    if (!filter(contentType)) {
      return;
    }
    
    // 保存原始响应体（用于压缩失败时恢复）
    const originalBody = res.body;
    
    // 将响应体转换为 Uint8Array
    let data: Uint8Array;
    if (typeof res.body === 'string') {
      data = new TextEncoder().encode(res.body);
    } else if (res.body instanceof Uint8Array) {
      data = res.body;
    } else if (originalBody && typeof originalBody === 'object' && 'byteLength' in originalBody) {
      // 检查是否为 ArrayBuffer 或类似类型
      try {
        // 先转换为 unknown，再转换为 ArrayBuffer
        data = new Uint8Array(originalBody as unknown as ArrayBuffer);
      } catch {
        // 其他类型不压缩
        return;
      }
    } else {
      // 其他类型不压缩
      return;
    }
    
    // 如果数据小于阈值，不压缩
    if (data.length < threshold) {
      return;
    }
    
    // 检查客户端支持的压缩格式
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    const supportsGzip = gzip && acceptEncoding.includes('gzip');
    const supportsBrotli = brotli && acceptEncoding.includes('br');
    
    // 优先使用 Brotli（压缩率更高），然后是 Gzip
    if (supportsBrotli) {
      try {
        const compressed = await compressBrotli(data, level);
        // 如果压缩后的数据比原始数据小，才使用压缩
        if (compressed.length < data.length) {
          res.body = compressed;
          res.setHeader('Content-Encoding', 'br');
          res.setHeader('Vary', 'Accept-Encoding');
          // 更新 Content-Length
          res.setHeader('Content-Length', compressed.length.toString());
        }
      } catch (_error) {
        // Brotli 压缩失败，尝试 Gzip
        if (supportsGzip) {
          try {
            const compressed = await compressGzip(data, level);
            if (compressed.length < data.length) {
              res.body = compressed;
              res.setHeader('Content-Encoding', 'gzip');
              res.setHeader('Vary', 'Accept-Encoding');
              res.setHeader('Content-Length', compressed.length.toString());
            }
          } catch (_error) {
            // Gzip 压缩也失败，恢复原始响应体
            console.warn('Compression failed:', _error);
            res.body = originalBody;
          }
        }
      }
    } else if (supportsGzip) {
      try {
        const compressed = await compressGzip(data, level);
        // 如果压缩后的数据比原始数据小，才使用压缩
        if (compressed.length < data.length) {
          res.body = compressed;
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Vary', 'Accept-Encoding');
          // 更新 Content-Length
          res.setHeader('Content-Length', compressed.length.toString());
        }
      } catch (error) {
        // Gzip 压缩失败，恢复原始响应体
        console.warn('Gzip compression failed:', error);
        res.body = originalBody;
      }
    }
  };
}

