/**
 * Import Map 工具函数
 * 用于创建和管理 import map 脚本
 */

import * as path from "@std/path";
import { readDenoJson } from "./file.ts";

/**
 * 缓存的 import map 脚本
 */
let cachedImportMapScript: string | null = null;
let importMapScriptCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 分钟缓存

/**
 * 将 npm: 或 jsr: specifier 转换为浏览器可用的 URL (esm.sh)
 * @param specifier npm: 或 jsr: specifier
 * @returns 浏览器可用的 URL
 */
function convertSpecifierToBrowserUrl(specifier: string): string | null {
  // 处理 npm: 前缀
  if (specifier.startsWith("npm:")) {
    const pkg = specifier.slice(4);
    return `https://esm.sh/${pkg}`;
  }

  // 处理 jsr: 前缀
  if (specifier.startsWith("jsr:")) {
    // jsr:@scope/pkg -> https://esm.sh/jsr/@scope/pkg
    const pkg = specifier.slice(4);
    return `https://esm.sh/jsr/${pkg}`;
  }

  // 如果已经是 http/https URL，直接返回
  if (specifier.startsWith("http:") || specifier.startsWith("https:")) {
    return specifier;
  }

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
            if (typeof value !== "string") continue;
            // 预处理：转换 npm:/jsr:/http 为浏览器 URL
            const browserUrl = convertSpecifierToBrowserUrl(value);
            if (!browserUrl) continue;

            // 规则 1：preact 相关导入
            if (
              value.includes("@preact") || value.includes("preact@") ||
              key.startsWith("preact")
            ) {
              browserImports[key] = browserUrl;
              continue;
            }

            // 规则 2：框架导入（@dreamer/dweb）
            if (key === "@dreamer/dweb" || key.startsWith("@dreamer/dweb")) {
              // 根映射
              browserImports[key] = browserUrl;
              // 前缀映射（支持子路径，如 @dreamer/dweb/client）
              const withSlashKey = "@dreamer/dweb/";
              // 仅当未显式配置子路径时，提供前缀映射
              if (!(withSlashKey in browserImports)) {
                // 确保末尾带 /
                const baseUrl = browserUrl.endsWith("/")
                  ? browserUrl
                  : `${browserUrl}/`;
                browserImports[withSlashKey] = baseUrl;
              }
              continue;
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
    (now - importMapScriptCacheTime) < CACHE_TTL;

  // 如果使用缓存，直接返回
  if (useCache) {
    return cachedImportMapScript;
  }

  try {
    // 默认的 import map（作为后备）
    const defaultImports: Record<string, string> = {
      "preact": "https://esm.sh/preact@10.28.0",
      "preact/hooks": "https://esm.sh/preact@10.28.0/hooks",
      "preact/compat": "https://esm.sh/preact@10.28.0/compat",
      "preact/jsx-runtime": "https://esm.sh/preact@10.28.0/jsx-runtime",
      "preact/signals": "https://esm.sh/@preact/signals@1.2.2?external=preact",
    };

    // 从用户的 deno.json 读取 imports 配置
    const userImports = await loadImportsFromDenoJson(searchPaths);

    // 处理用户导入：如果是 @preact/signals 且是 esm.sh URL，确保添加 ?external=preact
    const processedUserImports: Record<string, string> = {};
    for (const [key, value] of Object.entries(userImports)) {
      let processedValue = value;
      // 如果是 preact/signals 且是 esm.sh URL，确保添加 ?external=preact
      if (
        key === "preact/signals" && value.includes("@preact/signals") &&
        value.includes("esm.sh")
      ) {
        // 检查是否已经有查询参数
        if (value.includes("?")) {
          // 如果已经有查询参数，检查是否包含 external=preact
          if (!value.includes("external=preact")) {
            processedValue = `${value}&external=preact`;
          }
        } else {
          // 如果没有查询参数，添加 ?external=preact
          processedValue = `${value}?external=preact`;
        }
      }
      processedUserImports[key] = processedValue;
    }

    // 合并 imports（用户配置优先，然后使用默认配置）
    const imports = { ...defaultImports, ...processedUserImports };

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
