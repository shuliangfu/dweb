/**
 * Import Map 工具函数
 * 用于创建和管理 import map 脚本
 */

import * as path from "@std/path";

// 缓存 import map 脚本，避免每次请求都读取文件
let cachedImportMapScript: string | null = null;
let importMapScriptCacheTime = 0;
const IMPORT_MAP_CACHE_TTL = 5000; // 5秒缓存

/**
 * 读取并解析 deno.json 或 deno.jsonc 文件
 * @param filePath 文件路径
 * @returns 解析后的 JSON 对象，如果失败返回 null
 */
async function readDenoJson(
  filePath: string,
): Promise<Record<string, unknown> | null> {
  try {
    const content = await Deno.readTextFile(filePath);

    // 如果是 JSONC，去除注释（简单处理：去除单行注释和块注释）
    let jsonContent = content;
    if (filePath.endsWith(".jsonc")) {
      // 去除单行注释 (// ...)
      jsonContent = jsonContent.replace(/\/\/.*$/gm, "");
      // 去除块注释 (/* ... */)
      jsonContent = jsonContent.replace(/\/\*[\s\S]*?\*\//g, "");
    }

    return JSON.parse(jsonContent) as Record<string, unknown>;
  } catch (error) {
    // 文件不存在或解析失败，返回 null
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }
    console.debug(`[ImportMap] 读取 ${filePath} 失败:`, error);
    return null;
  }
}

/**
 * 将 npm: 或 jsr: specifier 转换为浏览器可用的 esm.sh URL
 * @param specifier 原始 specifier（如 "npm:preact@10.28.0" 或 "jsr:@std/fs@^1.0.20"）
 * @returns 转换后的 URL，如果无法转换则返回 null
 */
function convertSpecifierToBrowserUrl(specifier: string): string | null {
  // 如果已经是 http:// 或 https:// URL，直接返回
  if (specifier.startsWith("http://") || specifier.startsWith("https://")) {
    return specifier;
  }

  // npm: 格式：npm:package@version 或 npm:package@version/subpath
  if (specifier.startsWith("npm:")) {
    const npmSpec = specifier.slice(4); // 移除 "npm:" 前缀
    // 提取版本号（可能包含 @ 符号）
    // 例如：npm:preact@10.28.0 -> preact@10.28.0
    // 例如：npm:@preact/signals@1.2.2 -> @preact/signals@1.2.2
    const lastAtIndex = npmSpec.lastIndexOf("@");
    if (lastAtIndex > 0) {
      const packageName = npmSpec.slice(0, lastAtIndex);
      const versionAndPath = npmSpec.slice(lastAtIndex + 1);
      const [version, ...subpathParts] = versionAndPath.split("/");
      const subpath = subpathParts.length > 0
        ? "/" + subpathParts.join("/")
        : "";

      // 转换为 esm.sh URL
      return `https://esm.sh/${packageName}@${version}${subpath}`;
    }
  }

  // jsr: 格式：jsr:@scope/package@version 或 jsr:@scope/package@version/subpath
  if (specifier.startsWith("jsr:")) {
    const jsrSpec = specifier.slice(4); // 移除 "jsr:" 前缀
    // JSR 包通常使用 @scope/package@version 格式
    // 例如：jsr:@std/fs@^1.0.20 -> @std/fs@^1.0.20
    const lastAtIndex = jsrSpec.lastIndexOf("@");
    if (lastAtIndex > 0) {
      const scopeAndPackage = jsrSpec.slice(0, lastAtIndex);
      const versionAndPath = jsrSpec.slice(lastAtIndex + 1);
      const [version, ...subpathParts] = versionAndPath.split("/");
      const subpath = subpathParts.length > 0
        ? "/" + subpathParts.join("/")
        : "";

      // 转换为 esm.sh URL（JSR 包在 esm.sh 上使用 jsr/ 前缀）
      return `https://esm.sh/jsr/${scopeAndPackage}@${version}${subpath}`;
    }
  }

  // 其他格式无法转换
  return null;
}

/**
 * 从 deno.json 或 deno.jsonc 读取 imports 配置
 * @param searchPaths 可选的搜索路径列表（默认从当前工作目录开始）
 * @returns imports 对象，如果失败返回空对象
 */
async function loadImportsFromDenoJson(
  searchPaths?: string[],
): Promise<Record<string, string>> {
  const cwd = Deno.cwd();
  const pathsToSearch = searchPaths || [cwd];

  // 尝试查找 deno.json 或 deno.jsonc
  for (const basePath of pathsToSearch) {
    const denoJsonPath = path.join(basePath, "deno.json");
    const denoJsoncPath = path.join(basePath, "deno.jsonc");

    // 先尝试 deno.jsonc，再尝试 deno.json
    for (const filePath of [denoJsoncPath, denoJsonPath]) {
      const config = await readDenoJson(filePath);
      if (config && typeof config === "object" && "imports" in config) {
        const imports = config.imports;
        if (imports && typeof imports === "object") {
          // 转换 imports 对象，将 npm: 和 jsr: specifier 转换为浏览器可用的 URL
          const browserImports: Record<string, string> = {};

          for (const [key, value] of Object.entries(imports)) {
            if (typeof value === "string") {
              // 只保留 preact 相关的导入（检查 value 中是否包含 @preact 或 preact@）
              if (value.includes("@preact") || value.includes("preact@")) {
                // 转换 specifier
                const browserUrl = convertSpecifierToBrowserUrl(value);
                if (browserUrl) {
                  browserImports[key] = browserUrl;
                }
              }
            }
          }

          return browserImports;
        }
      }
    }
  }

  return {};
}

/**
 * 创建 import map 脚本（让浏览器能够解析 preact 等模块）
 * 支持从用户的 deno.json 或 deno.jsonc 读取 imports 配置
 * 使用缓存机制，避免频繁读取文件
 * @param searchPaths 可选的搜索路径列表，用于查找 deno.json 文件（默认从当前工作目录开始）
 * @returns import map 脚本 HTML，如果失败返回 null
 */
export async function createImportMapScript(
  searchPaths?: string[],
): Promise<string | null> {
  // 检查缓存是否有效（注意：如果传入了不同的 searchPaths，应该不使用缓存）
  const now = Date.now();
  const useCache = !searchPaths &&
    cachedImportMapScript &&
    (now - importMapScriptCacheTime) < IMPORT_MAP_CACHE_TTL;

  // 如果使用缓存，直接返回
  if (useCache) {
    return cachedImportMapScript;
  }

  try {
    // 默认的 import map（作为后备）
    const defaultImports: Record<string, string> = {
      "preact": "https://esm.sh/preact@10.28.0",
      "preact/hooks": "https://esm.sh/preact@10.28.0/hooks",
      "preact/jsx-runtime": "https://esm.sh/preact@10.28.0/jsx-runtime",
      "preact/compat": "https://esm.sh/preact@10.28.0/compat",
      "preact/signals": "https://esm.sh/@preact/signals@1.2.2",
    };

    // 从用户的 deno.json 读取 imports 配置
    const userImports = await loadImportsFromDenoJson(searchPaths);

    // 合并 imports（用户配置优先，然后使用默认配置）
    const imports = { ...defaultImports, ...userImports };

    const importMap = { imports };

    const script = `<script type="importmap">${
      JSON.stringify(importMap)
    }</script>`;

    // 更新缓存（只在没有传入 searchPaths 时缓存）
    if (!searchPaths) {
      cachedImportMapScript = script;
      importMapScriptCacheTime = now;
    }

    return script;
  } catch (error) {
    console.error("Error generating import map script:", error);
    return null;
  }
}
