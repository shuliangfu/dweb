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
 * 使用缓存机制，避免频繁读取文件
 * @returns import map 脚本 HTML，如果失败返回 null
 */
export async function createImportMapScript(): Promise<string | null> {
  // 检查缓存是否有效
  const now = Date.now();
  if (
    cachedImportMapScript &&
    (now - importMapScriptCacheTime) < IMPORT_MAP_CACHE_TTL
  ) {
    return cachedImportMapScript;
  }
  
  try {
    // 读取 deno.json 或 deno.jsonc（尝试多个可能的位置）
    const possiblePaths = [
      Deno.cwd(),
      ".",
      "./",
    ];
    let denoJson: Record<string, any> | null = null;
    
    for (const basePath of possiblePaths) {
      denoJson = await readDenoJson(basePath);
      if (denoJson) {
        break;
      }
    }
    
    if (!denoJson) {
      return null;
    }
    
    // 获取 imports，包含所有客户端需要的模块
    const imports = denoJson.imports || {};
    const clientImports: Record<string, string> = {};
    
    // 遍历所有 imports，只排除服务端依赖
    for (const [key, value] of Object.entries(imports)) {
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
      if (typeof value === "string") {
        clientImports[key] = value;
      }
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
    
    // 更新缓存
    cachedImportMapScript = script;
    importMapScriptCacheTime = now;
    
    return script;
  } catch (_error) {
    return null;
  }
}

