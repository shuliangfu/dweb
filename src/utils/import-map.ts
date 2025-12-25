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
 * 将 npm: 协议转换为浏览器可访问的 URL
 * @param npmUrl npm: 协议的 URL，例如：npm:chart.js@4.4.7 或 npm:@scope/package@1.0.0
 * @returns 浏览器可访问的 URL，例如：https://esm.sh/chart.js@4.4.7
 */
function convertNpmToBrowserUrl(npmUrl: string): string {
  // 移除 npm: 前缀
  const packageSpec = npmUrl.replace(/^npm:/, "");
  
  // 使用 esm.sh 作为 CDN（支持 ESM 格式）
  return `https://esm.sh/${packageSpec}`;
}

/**
 * 将 jsr: 协议转换为浏览器可访问的 URL
 * @param jsrUrl jsr: 协议的 URL，例如：jsr:@std/fs@^1.0.20 或 jsr:@dreamer/dweb@1.0.0/client
 * @returns 浏览器可访问的 URL，例如：https://jsr.io/@std/fs/1.0.20/mod.ts
 */
function convertJsrToBrowserUrl(jsrUrl: string): string {
  // 移除 jsr: 前缀
  const jsrPath = jsrUrl.replace(/^jsr:/, "");
  
  // 匹配格式：@scope/package@version 或 @scope/package@version/subpath
  // 版本号可能包含 ^、~ 等符号
  const jsrMatch = jsrPath.match(/^@([\w-]+)\/([\w-]+)@([\^~]?[\d.]+)(?:\/(.+))?$/);
  
  if (!jsrMatch) {
    // 如果无法匹配，尝试直接使用（可能是不标准的格式）
    // 这种情况下，返回一个基于 jsr.io 的 URL
    return `https://jsr.io/${jsrPath}`;
  }
  
  const [, scope, packageName, versionWithPrefix, subPath] = jsrMatch;
  
  // 移除版本号前缀（^ 或 ~），只保留版本号本身
  const version = versionWithPrefix.replace(/^[\^~]/, "");
  
  // 构建 JSR URL
  // JSR URL 格式：https://jsr.io/@scope/package/version/path
  if (subPath) {
    // 有子路径，直接使用
    // 确保子路径以 / 开头
    const normalizedSubPath = subPath.startsWith("/") ? subPath : `/${subPath}`;
    // 如果子路径没有扩展名，尝试添加 .ts
    if (!normalizedSubPath.match(/\.(ts|tsx|js|jsx)$/)) {
      return `https://jsr.io/@${scope}/${packageName}/${version}${normalizedSubPath}.ts`;
    }
    return `https://jsr.io/@${scope}/${packageName}/${version}${normalizedSubPath}`;
  } else {
    // 没有子路径，指向包的 mod.ts（JSR 包的标准入口文件）
    return `https://jsr.io/@${scope}/${packageName}/${version}/mod.ts`;
  }
}

/**
 * 将 import map 中的 URL 转换为浏览器可访问的 URL
 * 处理 npm: 和 jsr: 协议，将它们转换为浏览器可访问的 HTTP URL
 * @param importValue import map 中的原始值
 * @returns 转换后的浏览器可访问的 URL
 */
function convertToBrowserUrl(importValue: string): string {
  // 如果已经是 HTTP URL，直接返回
  if (importValue.startsWith("http://") || importValue.startsWith("https://")) {
    return importValue;
  }
  
  // 处理 npm: 协议
  if (importValue.startsWith("npm:")) {
    return convertNpmToBrowserUrl(importValue);
  }
  
  // 处理 jsr: 协议
  if (importValue.startsWith("jsr:")) {
    return convertJsrToBrowserUrl(importValue);
  }
  
  // 其他情况（本地路径等），直接返回
  return importValue;
}

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
      
      // 将 npm: 和 jsr: 协议转换为浏览器可访问的 URL
      // 包含所有其他导入（preact、npm 包等客户端依赖）
      clientImports[key] = convertToBrowserUrl(value);
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
            // 将 npm: 和 jsr: 协议转换为浏览器可访问的 URL
            subpathImports[key] = convertToBrowserUrl(value);
          }
        }
      }
    }
    
    // 为所有客户端包自动生成子路径映射
    // 根据 import map 规范，如果父包映射存在，子路径应该能够自动解析
    // 但某些浏览器或 npm 包的实现可能不支持自动解析，所以我们需要显式添加
    // 例如：chart -> npm:chart.js@4.4.7，自动生成 chart/auto -> npm:chart.js@4.4.7/auto
    for (const [_packageName, packageUrl] of Object.entries(clientImports)) {
      // 只处理 npm:、jsr:、http: 等远程包，不处理本地路径
      if (
        packageUrl.startsWith("npm:") ||
        packageUrl.startsWith("jsr:") ||
        packageUrl.startsWith("http://") ||
        packageUrl.startsWith("https://")
      ) {
        // 为所有可能的子路径自动生成映射
        // 注意：我们无法预知所有可能的子路径，但可以根据常见的模式生成
        // 对于 npm 包，子路径通常是 /auto、/helpers、/utils 等
        // 但为了通用性，我们只处理已经在 allImports 中定义的子路径
        // 如果用户需要使用子路径，应该在 deno.json 中显式定义
        // 例如：在 deno.json 中添加 "chart/auto": "npm:chart.js@4.4.7/auto"
        
        // 实际上，根据 import map 规范，如果父包映射存在，浏览器应该能够自动解析子路径
        // 但如果浏览器不支持，我们需要显式添加
        // 为了简化，我们只处理已经在 allImports 中定义的子路径
      }
    }
    
    // 合并基础 imports 和子路径 imports
    // 注意：如果 deno.json 中没有显式定义子路径映射（如 chart/auto），
    // 根据 import map 规范，浏览器应该能够自动解析子路径
    // 例如：如果 "chart": "npm:chart.js@4.4.7"，浏览器应该能够自动解析 "chart/auto" 为 "npm:chart.js@4.4.7/auto"
    // 但如果浏览器不支持自动解析，用户需要在 deno.json 中显式定义子路径映射
    // 例如：在 deno.json 中添加 "chart/auto": "npm:chart.js@4.4.7/auto"
    const finalImports = { ...clientImports, ...subpathImports };
    
    if (Object.keys(finalImports).length === 0) {
      return null;
    }
    
    const importMap = {
      imports: finalImports,
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

