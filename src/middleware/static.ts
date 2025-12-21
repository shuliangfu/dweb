/**
 * 静态资源中间件
 * 服务静态文件
 */

import type { Middleware, StaticOptions } from '../types/index.ts';
import * as path from '@std/path';
import { isPathSafe } from '../utils/security.ts';

/**
 * 根据文件扩展名获取 MIME 类型
 * @param filePath 文件路径
 * @returns MIME 类型字符串
 */
function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'html': 'text/html; charset=utf-8',
    'htm': 'text/html; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'js': 'application/javascript; charset=utf-8',
    'mjs': 'application/javascript; charset=utf-8',
    'json': 'application/json; charset=utf-8',
    'xml': 'application/xml; charset=utf-8',
    'txt': 'text/plain; charset=utf-8',
    'md': 'text/markdown; charset=utf-8',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'eot': 'application/vnd.ms-fontobject',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 创建静态资源中间件
 * @param options 静态资源选项
 * @returns 中间件函数
 */
export function staticFiles(options: StaticOptions): Middleware {
  let {
    dir,
    prefix,
    index = ['index.html'],
    dotfiles = 'ignore',
    etag = true,
    lastModified = true,
    maxAge = 0,
    outDir,
    isProduction,
    extendDirs = []
  } = options;
  
  const cwd = Deno.cwd();
  
  // 处理主配置的 prefix：如果未配置，默认使用 dir 的名称
  if (!prefix) {
    const dirName = path.basename(dir);
    prefix = `/${dirName}`;
  }
  
  // 处理 extendDirs：支持字符串或对象格式
  interface NormalizedExtendDir {
    dir: string; // 绝对路径
    prefix: string; // URL 前缀
  }
  
  const normalizedExtendDirs: NormalizedExtendDir[] = extendDirs.map(extendDir => {
    if (typeof extendDir === 'string') {
      // 字符串格式：['uploads'] -> prefix 默认为目录名
      const dirPath = path.isAbsolute(extendDir) ? extendDir : path.join(cwd, extendDir);
      const dirName = path.basename(extendDir);
      return {
        dir: dirPath,
        prefix: `/${dirName}`
      };
    } else {
      // 对象格式：[{dir: 'uploads', prefix: '/uploads'}]
      const dirPath = path.isAbsolute(extendDir.dir) 
        ? extendDir.dir 
        : path.join(cwd, extendDir.dir);
      const extendPrefix = extendDir.prefix || `/${path.basename(extendDir.dir)}`;
      return {
        dir: dirPath,
        prefix: extendPrefix
      };
    }
  });
  
  // 如果 dir 是相对路径，根据环境自动选择目录
  // 开发环境：使用项目目录
  // 生产环境：使用构建输出目录
  if (dir && !path.isAbsolute(dir)) {
    const cwd = Deno.cwd();
    
    // 如果明确指定了 isProduction 和 outDir，使用它们
    if (isProduction !== undefined && outDir) {
      // 生产环境：使用构建输出目录
      dir = path.join(cwd, outDir, dir);
    } else if (isProduction !== undefined && !isProduction) {
      // 明确指定为开发环境：使用项目目录
      dir = path.join(cwd, dir);
    } else {
      // 自动检测环境：检查构建输出目录是否存在
      // 如果提供了 outDir，使用它；否则默认使用 'dist'
      const buildOutDir = outDir || 'dist';
      const buildPath = path.join(cwd, buildOutDir, dir);
      
      try {
        const buildStat = Deno.statSync(buildPath);
        if (buildStat.isDirectory) {
          // 构建输出目录存在，使用构建输出目录（生产环境）
          dir = buildPath;
        } else {
          // 构建输出目录不存在，使用项目目录（开发环境）
          dir = path.join(cwd, dir);
        }
      } catch {
        // 构建输出目录不存在，使用项目目录（开发环境）
        dir = path.join(cwd, dir);
      }
		}
  }
  
  return async (req, res, next) => {
    const url = new URL(req.url);
    let pathname = url.pathname;
    
    // 检查是否匹配 extendDirs（优先检查，因为这些目录始终从项目根目录读取）
    // 例如：如果 extendDirs 包含 'uploads'，请求 /uploads/file.jpg 应该从项目根目录的 uploads 读取
    if (normalizedExtendDirs.length > 0) {
      for (const extendDirConfig of normalizedExtendDirs) {
        const extendPrefix = extendDirConfig.prefix;
        // 检查路径是否以 prefix 开头（如 /uploads/... 或 /uploads）
        if (pathname === extendPrefix || pathname.startsWith(`${extendPrefix}/`)) {
          // 移除 prefix，获取相对路径
          const relativePath = pathname.slice(extendPrefix.length + 1) || '';
          
          // 处理点文件
          if (dotfiles === 'deny' && relativePath.includes('/.')) {
            await next();
            return;
          }
          
          // 构建文件路径
          let filePath = relativePath;
          
          // 处理索引文件
          if (filePath.endsWith('/') || filePath === '') {
            const indexFiles = Array.isArray(index) ? index : [index];
            let foundIndex = false;
            for (const indexFile of indexFiles) {
              const indexPath = path.join(extendDirConfig.dir, filePath, indexFile);
              if (!isPathSafe(indexPath, extendDirConfig.dir)) {
                continue;
              }
              try {
                const stat = await Deno.stat(indexPath);
                if (stat.isFile) {
                  filePath = filePath ? `${filePath}${indexFile}` : indexFile;
                  foundIndex = true;
                  break;
                }
              } catch {
                continue;
              }
            }
            if (!foundIndex) {
              await next();
              return;
            }
          }
          
          // 构建完整路径
          const fullPath = filePath ? path.join(extendDirConfig.dir, filePath) : extendDirConfig.dir;
          
          // 安全检查
          if (!isPathSafe(fullPath, extendDirConfig.dir)) {
            await next();
            return;
          }
          
          // 检查文件是否存在
          let fileStat: Deno.FileInfo;
          try {
            fileStat = await Deno.stat(fullPath);
            if (!fileStat.isFile) {
              await next();
              return;
            }
          } catch {
            await next();
            return;
          }
          
          // 读取并返回文件
          try {
            const file = await Deno.readFile(fullPath);
            const mimeType = getContentType(filePath);
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Length', fileStat.size.toString());
            
            if (etag) {
              const etagValue = `"${fileStat.mtime?.getTime() || fileStat.size}"`;
              res.setHeader('ETag', etagValue);
              const ifNoneMatch = req.headers.get('if-none-match');
              if (ifNoneMatch === etagValue) {
                res.status = 304;
                res.body = undefined;
                return;
              }
            }
            
            if (lastModified && fileStat.mtime) {
              res.setHeader('Last-Modified', fileStat.mtime.toUTCString());
              const ifModifiedSince = req.headers.get('if-modified-since');
              if (ifModifiedSince) {
                const modifiedSince = new Date(ifModifiedSince);
                if (fileStat.mtime <= modifiedSince) {
                  res.status = 304;
                  res.body = undefined;
                  return;
                }
              }
            }
            
            if (maxAge > 0) {
              res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
            }
            
            const isTextFile = mimeType.startsWith('text/') || 
                               mimeType.includes('javascript') || 
                               mimeType.includes('json') || 
                               mimeType.includes('xml') ||
                               mimeType.includes('svg');
            
            if (isTextFile) {
              try {
                const decoder = new TextDecoder('utf-8');
                res.body = decoder.decode(file);
              } catch {
                res.body = file;
              }
            } else {
              res.body = file;
            }
            
            res.status = 200;
            return;
          } catch (error) {
            console.error('读取静态文件失败:', error);
            await next();
            return;
          }
        }
      }
    }
    
    // 移除主目录的前缀
    if (pathname.startsWith(prefix)) {
      pathname = pathname.slice(prefix.length);
    } else {
      // 如果不匹配主目录的 prefix，也不匹配 extendDirs，跳过
      await next();
      return;
    }
    
    // 处理点文件
    if (dotfiles === 'deny' && pathname.includes('/.')) {
      await next();
      return;
    }
    
    // 构建文件路径（主目录）
    let filePath = pathname;
    if (filePath.endsWith('/')) {
      // 尝试查找索引文件
      const indexFiles = Array.isArray(index) ? index : [index];
      let foundIndex = false;
      for (const indexFile of indexFiles) {
        const indexPath = path.join(dir, filePath, indexFile);
        // 安全检查：确保索引文件路径在 dir 目录内
        if (!isPathSafe(indexPath, dir)) {
          // 路径不在允许的目录内，跳过
          continue;
        }
        try {
          const stat = await Deno.stat(indexPath);
          if (stat.isFile) {
            filePath = `${filePath}${indexFile}`;
            foundIndex = true;
            break;
          }
        } catch {
          // 文件不存在，继续查找
          continue;
        }
      }
      // 如果没有找到索引文件，跳过
      if (!foundIndex) {
        await next();
        return;
      }
    }
    
    // 使用 path.join 规范化路径，防止路径遍历攻击
    const fullPath = path.join(dir, filePath);
    // 安全检查：确保文件路径在 dir 目录内
    if (!isPathSafe(fullPath, dir)) {
      // 路径不在允许的目录内，拒绝访问
      await next();
      return;
    }
    
    // 检查文件是否存在且是文件（不是目录）
    let fileStat: Deno.FileInfo;
    try {
      fileStat = await Deno.stat(fullPath);
      if (!fileStat.isFile) {
        // 如果是目录，跳过
        await next();
        return;
      }
    } catch {
      // 文件不存在，跳过
      await next();
      return;
    }
    
    try {
      // 读取文件
      const file = await Deno.readFile(fullPath);
      
      // 设置内容类型
      const mimeType = getContentType(filePath);
      res.setHeader('Content-Type', mimeType);
      
      // 设置内容长度
      res.setHeader('Content-Length', fileStat.size.toString());
      
      // 设置 ETag
      if (etag) {
        const etagValue = `"${fileStat.mtime?.getTime() || fileStat.size}"`;
        res.setHeader('ETag', etagValue);
        
        // 检查 If-None-Match
        const ifNoneMatch = req.headers.get('if-none-match');
        if (ifNoneMatch === etagValue) {
          res.status = 304;
          res.body = undefined;  // 304 响应不应该有 body
          return;
        }
      }
      
      // 设置 Last-Modified
      if (lastModified && fileStat.mtime) {
        res.setHeader('Last-Modified', fileStat.mtime.toUTCString());
        
        // 检查 If-Modified-Since
        const ifModifiedSince = req.headers.get('if-modified-since');
        if (ifModifiedSince) {
          const modifiedSince = new Date(ifModifiedSince);
          if (fileStat.mtime <= modifiedSince) {
            res.status = 304;
            res.body = undefined;  // 304 响应不应该有 body
            return;
          }
        }
      }
      
      // 设置缓存控制
      if (maxAge > 0) {
        res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      }
      
      // 返回文件内容
      // 注意：静态文件中间件应该直接设置响应并返回，不调用 next()
      // 对于文本文件（如 HTML、CSS、JS），可以转换为字符串
      // 对于二进制文件（如图片、字体），直接使用 Uint8Array
      const isTextFile = mimeType.startsWith('text/') || 
                         mimeType.includes('javascript') || 
                         mimeType.includes('json') || 
                         mimeType.includes('xml') ||
                         mimeType.includes('svg');
      
      if (isTextFile) {
        // 文本文件：转换为字符串
        try {
          const decoder = new TextDecoder('utf-8');
          res.body = decoder.decode(file);
        } catch {
          // 如果解码失败，使用原始数据（可能是二进制文件被误判为文本）
          res.body = file;
        }
      } else {
        // 二进制文件：直接使用 Uint8Array
        res.body = file;
      }
      
      res.status = 200;
      // 不调用 next()，直接返回文件
      return;
    } catch (error) {
      console.error('读取静态文件失败:', error);
      await next();
    }
  };
}

