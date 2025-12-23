/**
 * Import Map 工具函数
 * 用于创建和管理 import map 脚本
 */

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
    // 读取 deno.json（尝试多个可能的位置）
    const possiblePaths = [
      "deno.json",
      "./deno.json",
      `${Deno.cwd()}/deno.json`,
    ];
    let denoJsonContent = "";
    let found = false;
    
    for (const denoJsonPath of possiblePaths) {
      try {
        // 使用 await 确保正确等待文件读取
        const fileContent = await Deno.readTextFile(denoJsonPath);
        denoJsonContent = fileContent;
        found = true;
        break;
      } catch (_error) {
        // 继续尝试下一个路径
      }
    }
    
    if (!found) {
      return null;
    }
    
    const denoJson = JSON.parse(denoJsonContent);
    
    // 获取 imports，只保留客户端需要的模块
    const imports = denoJson.imports || {};
    const clientImports: Record<string, string> = {};
    
    // 包含 preact 相关的导入
    if (imports["preact"]) {
      clientImports["preact"] = imports["preact"];
    }
    if (imports["preact/jsx-runtime"]) {
      clientImports["preact/jsx-runtime"] = imports["preact/jsx-runtime"];
    }
    if (imports["preact/hooks"]) {
      clientImports["preact/hooks"] = imports["preact/hooks"];
    }
    // 添加 preact-router 支持（如果存在）
    if (imports["preact-router"]) {
      clientImports["preact-router"] = imports["preact-router"];
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

