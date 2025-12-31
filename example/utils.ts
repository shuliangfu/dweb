/**
 * 工具函数
 * 用于获取 DWeb 框架的版本信息和相关 URL
 */

import * as path from "@std/path";

/**
 * 获取 DWeb 版本号
 */
function getDwebVersion(): string { 
	let basePath1 = new URL("../", import.meta.url).pathname;        
	
  const jsonPath = path.join(basePath1, "deno.json");
	const jsoncPath = path.join(basePath1, "deno.jsonc");
	
  try {
    const json = Deno.readTextFileSync(jsonPath);
    return JSON.parse(json).version;
  } catch {
    try {
      const jsonc = Deno.readTextFileSync(jsoncPath);
      return JSON.parse(jsonc).version;
    } catch {
      basePath1 = new URL("../../", import.meta.url).pathname;
      const jsonPath = path.join(basePath1, "deno.json");
			const jsoncPath = path.join(basePath1, "deno.jsonc");
      try {
        const json = Deno.readTextFileSync(jsonPath);
        return JSON.parse(json).version;
      } catch {
        try {
          const jsonc = Deno.readTextFileSync(jsoncPath);
          return JSON.parse(jsonc).version;
        } catch {
          return "1.0.0";
        }
      }
    }
  }
}

/**
 * 获取 DWeb 版本号（带 v 前缀，用于显示）
 */
export function getVersionString(): string {
  return `${getDwebVersion()}`;
}

/**
 * 获取 JSR 包 URL（带版本号）
 * @param path 可选的子路径，如 '/cli'
 */
export function getJsrPackageUrl(path: string = ""): string {
  const version = getDwebVersion();
  // 使用 ^ 前缀表示兼容版本范围
  return `jsr:@dreamer/dweb@^${version}${path}`;
}

/**
 * 获取 ESM.sh URL（用于 esm.sh CDN）
 */
export function getEsmUrl(): string {
  const version = getDwebVersion();
  return `https://esm.sh/dweb@${version}`;
}

// 导出版本号（向后兼容）
export const dwebVersion = getDwebVersion();
export const dwebUrl = getEsmUrl();
