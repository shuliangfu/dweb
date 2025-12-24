/**
 * Import Map 工具函数
 * 用于创建和管理 import map 脚本
 */

import { readDenoJson } from './file.ts';

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
      // 排除服务端依赖（这些不应该在浏览器中加载）
      if (
        key === "@dreamer/dweb" ||
        (key.startsWith("@dreamer/dweb/") && key !== "@dreamer/dweb/client") ||
        key === "preact-render-to-string" ||
        key.startsWith("@std/") ||
        key.startsWith("deno:") ||
        key.startsWith("@sqlite") ||
        key.startsWith("@postgres") ||
        key.startsWith("@mysql") ||
        key.startsWith("@mongodb") ||
        key === "sharp"
      ) {
        continue;
      }
      
      // 包含所有其他导入（preact、npm 包等）
      clientImports[key] = value;
    }
    
    if (Object.keys(clientImports).length === 0) {
      return null;
    }
    
    const importMap = {
      imports: clientImports,
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

