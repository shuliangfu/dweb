/**
 * Import Map 工具函数
 * 用于创建和管理 import map 脚本
 */

// 缓存 import map 脚本，避免每次请求都读取文件
let cachedImportMapScript: string | null = null;
let importMapScriptCacheTime = 0;
const IMPORT_MAP_CACHE_TTL = 5000; // 5秒缓存

// 调试模式：直接输出日志

/**
 * 创建 import map 脚本（让浏览器能够解析 preact 等模块）
 * 支持从多个位置读取并合并 imports（项目根目录、应用目录等）
 * 使用缓存机制，避免频繁读取文件
 * @param searchPaths 可选的搜索路径列表，用于查找 deno.json 文件（默认从当前工作目录开始）
 * @returns import map 脚本 HTML，如果失败返回 null
 */
export function createImportMapScript(
  searchPaths?: string[],
): string | null {
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
    const importMap = {
      imports: {
        "preact": "https://esm.sh/preact@10.28.0",
        "preact/hooks": "https://esm.sh/preact@10.28.0/hooks",
        "preact/jsx-runtime": "https://esm.sh/preact@10.28.0/jsx-runtime",
        "preact/compat": "https://esm.sh/preact@10.28.0/compat",
        "preact/signals": "https://esm.sh/@preact/signals@2.5.1?external=preact",
      },
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
  } catch (error) {
    console.error("Error generating import map script:", error);
    return null;
  }
}
