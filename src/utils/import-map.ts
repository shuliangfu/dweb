/**
 * Import Map 工具函数
 * 用于创建和管理 import map 脚本
 */

import { readDenoJson } from "./file.ts";
import { isServerDependency } from "./module.ts";

// 缓存 import map 脚本，避免每次请求都读取文件
let cachedImportMapScript: string | null = null;
let importMapScriptCacheTime = 0;
const IMPORT_MAP_CACHE_TTL = 5000; // 5秒缓存

// 调试模式：直接输出日志

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
 * 使用 esm.sh 的 /jsr/ 路径来访问 JSR 包
 * @param jsrUrl jsr: 协议的 URL，例如：jsr:@std/fs@^1.0.20 或 jsr:@dreamer/dweb@1.8.2-beta.11/client
 * @returns 浏览器可访问的 URL，例如：https://esm.sh/jsr/@dreamer/dweb@1.8.2-beta.11/client?bundle
 */
function convertJsrToBrowserUrl(jsrUrl: string): string {
  // 移除 jsr: 前缀
  const jsrPath = jsrUrl.replace(/^jsr:/, "");

  // 匹配格式：@scope/package@version 或 @scope/package@version/subpath
  // 版本号可能包含 ^、~ 等符号，以及预发布版本号（如 -beta.2、-alpha.1、-rc.1）
  const jsrMatch = jsrPath.match(
    /^@([\w-]+)\/([\w-]+)@([\^~]?[\d.]+(?:-[\w.]+)?)(?:\/(.+))?$/,
  );

  if (!jsrMatch) {
    // 如果无法匹配，尝试直接使用（可能是不标准的格式）
    // 这种情况下，使用 esm.sh 的格式
    return `https://esm.sh/jsr/${jsrPath}?bundle`;
  }

  const [, scope, packageName, versionWithPrefix, subPath] = jsrMatch;

  // 移除版本号前缀（^ 或 ~），只保留版本号本身
  const version = versionWithPrefix.replace(/^[\^~]/, "");

  // 使用 esm.sh 的 /jsr/ 路径格式
  // 格式：https://esm.sh/jsr/@scope/package@version/subpath?bundle
  if (subPath) {
    // 有子路径，直接使用子路径（不需要映射到文件路径）
    // esm.sh 会自动处理 JSR 包的子路径解析
    return `https://esm.sh/jsr/@${scope}/${packageName}@${version}/${subPath}?bundle`;
  } else {
    // 没有子路径，指向包的默认入口（esm.sh 会自动处理）
    return `https://esm.sh/jsr/@${scope}/${packageName}@${version}?bundle`;
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
  // 使用 esm.sh 的 /jsr/ 路径来访问 JSR 包
  // esm.sh 会自动处理 JSR 包的编译和打包
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
        "preact": "https://esm.sh/preact@latest",
        "preact/hooks": "https://esm.sh/preact@latest/hooks?external=preact",
        "preact/jsx-runtime":
          "https://esm.sh/preact@latest/jsx-runtime?external=preact",
        "preact/signals":
          "https://esm.sh/@preact/signals@latest?external=preact",
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
