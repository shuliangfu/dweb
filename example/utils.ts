/**
 * 工具函数
 * 用于获取 DWeb 框架的版本信息和相关 URL
 */

// 读取根目录的 deno.json 或 deno.jsonc 获取版本号
let _dwebVersion: string = "";
let _denoJson: any = null;

/**
 * 同步读取 deno.json 或 deno.jsonc
 */
function readDenoJsonSync(basePath: string): Record<string, any> | null {
  // 优先尝试 deno.json
  const denoJsonPath = `${basePath}/deno.json`;
  try {
    const content = Deno.readTextFileSync(denoJsonPath);
    return JSON.parse(content);
  } catch {
    // deno.json 不存在，尝试 deno.jsonc
    try {
      const denoJsoncPath = `${basePath}/deno.jsonc`;
      const content = Deno.readTextFileSync(denoJsoncPath);
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

/**
 * 获取 DWeb 版本号
 */
function getDwebVersion(): string {
  if (!_dwebVersion) {
    try {
      const basePath1 = new URL("../../", import.meta.url).pathname;
      _denoJson = readDenoJsonSync(basePath1);
      if (_denoJson && _denoJson.version) {
        _dwebVersion = _denoJson.version;
      } else {
        throw new Error("Version not found");
      }
    } catch (_error) {
      try {
        const basePath2 = new URL("../", import.meta.url).pathname;
        _denoJson = readDenoJsonSync(basePath2);
        if (_denoJson && _denoJson.version) {
          _dwebVersion = _denoJson.version;
        } else {
          throw new Error("Version not found");
        }
      } catch (_error) {
        // 无法读取 deno.json 或 deno.jsonc，使用默认版本号
        _dwebVersion = "0.1.0";
      }
    }
  }
  return _dwebVersion;
}

/**
 * 获取 DWeb 版本号（带 v 前缀，用于显示）
 */
export function getVersionString(): string {
  return `v${getDwebVersion()}`;
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
