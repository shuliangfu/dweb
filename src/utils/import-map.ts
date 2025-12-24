/**
 * Import Map 工具函数
 * 用于创建和管理 import map 脚本
 */

import { readDenoJson } from './file.ts';
import { isServerDependency } from './module.ts';

// 缓存 import map 脚本，避免每次请求都读取文件
let cachedImportMapScript: string | null = null;
let importMapScriptCacheTime = 0;
const IMPORT_MAP_CACHE_TTL = 5000; // 5秒缓存

/**
 * 创建 import map 脚本（让浏览器能够解析 preact 等模块）
 * 支持从多个位置读取并合并 imports（项目根目录、应用目录等）
 * 使用缓存机制，避免频繁读取文件
 * @param searchPaths 可选的搜索路径列表，用于查找 deno.json 文件（默认从当前工作目录开始）
 * @returns import map 脚本 HTML，如果失败返回 null
 */
export async function createImportMapScript(
  searchPaths?: string[],
): Promise<string | null> {
  // 检查缓存是否有效（注意：如果传入了不同的 searchPaths，应该不使用缓存）
  const now = Date.now();
  if (
    !searchPaths &&
    cachedImportMapScript &&
    (now - importMapScriptCacheTime) < IMPORT_MAP_CACHE_TTL
  ) {
    return cachedImportMapScript;
  }
  
  try {
    // 读取 deno.json 或 deno.jsonc（尝试多个可能的位置）
    const possiblePaths = searchPaths || [
      Deno.cwd(),
      ".",
      "./",
    ];
    
    // 收集所有找到的 imports，合并它们
    const allImports: Record<string, string> = {};
    
    for (const basePath of possiblePaths) {
      const denoJson = await readDenoJson(basePath);
      if (denoJson && denoJson.imports) {
        // 合并 imports（后面的会覆盖前面的）
        for (const [key, value] of Object.entries(denoJson.imports)) {
          if (typeof value === "string") {
            allImports[key] = value;
          }
        }
      }
    }
    
    if (Object.keys(allImports).length === 0) {
      return null;
    }
    
    // 过滤出客户端需要的 imports
    const clientImports: Record<string, string> = {};
    
    // 遍历所有 imports，只排除服务端依赖
    for (const [key, value] of Object.entries(allImports)) {
      // 使用通用的服务端依赖判断函数，而不是硬编码排除规则
      // 这样可以支持任何项目，不仅仅是我们的框架项目
      if (isServerDependency(key)) {
        continue;
      }
      
      // 包含所有其他导入（preact、npm 包等客户端依赖）
      clientImports[key] = value;
    }
    
    // 检查 allImports 中是否已经有子路径映射（例如 chart/auto）
    // 如果 deno.json 中已经定义了子路径映射，直接使用
    const subpathImports: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(allImports)) {
      // 如果是子路径导入（包含 / 但不是相对路径）
      if (key.includes("/") && !key.startsWith(".") && !key.startsWith("/")) {
        // 提取父包名
        let parentPackage: string;
        if (key.startsWith("@")) {
          // @scope/package/subpath -> @scope/package
          const parts = key.split("/");
          if (parts.length >= 3) {
            parentPackage = `${parts[0]}/${parts[1]}`;
          } else {
            continue;
          }
        } else {
          // chart/auto -> chart
          parentPackage = key.split("/")[0];
        }
        
        // 如果父包在 clientImports 中，且这个子路径还没有被排除（不是服务端依赖）
        if (parentPackage in clientImports && !isServerDependency(key)) {
          // 如果这个子路径映射还没有在 clientImports 中，添加它
          if (!(key in clientImports)) {
            subpathImports[key] = value;
          }
        }
      }
    }
    
    // 合并基础 imports 和子路径 imports
    const finalImports = { ...clientImports, ...subpathImports };
    
    // 将 npm: 协议转换为浏览器可用的 CDN URL（esm.sh）
    // 浏览器不支持 npm: 协议，需要转换为实际的 HTTP URL
    const browserImports: Record<string, string> = {};
    for (const [key, value] of Object.entries(finalImports)) {
      if (value.startsWith("npm:")) {
        // npm:chart.js@4.4.7 -> https://esm.sh/chart.js@4.4.7
        // npm:chart.js@4.4.7/auto -> https://esm.sh/chart.js@4.4.7/auto
        const npmPath = value.substring(4); // 移除 "npm:" 前缀
        browserImports[key] = `https://esm.sh/${npmPath}`;
      } else {
        // 其他协议（jsr:、http:、https:）或本地路径保持不变
        browserImports[key] = value;
      }
    }
    
    if (Object.keys(browserImports).length === 0) {
      return null;
    }
    
    const importMap = {
      imports: browserImports,
    };
    
    const script = `<script type="importmap">${
      JSON.stringify(importMap)
    }</script>`;
    
    // 更新缓存（只在没有传入 searchPaths 时缓存）
    if (!searchPaths) {
      cachedImportMapScript = script;
      importMapScriptCacheTime = now;
    }
    
    return script;
  } catch (_error) {
    return null;
  }
}

