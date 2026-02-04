/**
 * 框架版本号与 deno.json 配置读取
 * 从包根目录 deno.json 自动读取 version / imports，供 init 等使用
 */

import {
  dirname,
  exists,
  join,
  readFileSync,
  readTextFile,
} from "@dreamer/runtime-adapter";

/** 无法读取 deno.json 时的默认版本与依赖说明 */
export const FALLBACK_DWEB_VERSION = "3.0.0-beta.1";
export const FALLBACK_RUNTIME_ADAPTER_SPEC =
  "jsr:@dreamer/runtime-adapter@^1.0.0-beta.23";
export const FALLBACK_PLUGINS_VERSION = "1.0.0-beta.14";

/**
 * 将 file: URL 转为本地路径（兼容 Unix / Windows）
 */
export function fromFileUrl(url: string): string {
  const u = new URL(url);
  if (u.protocol !== "file:") return url;
  let p = decodeURIComponent(u.pathname);
  if (p.length >= 3 && /^\/[A-Za-z]:\//.test(p)) p = p.slice(1);
  return p;
}

/** 当前模块所在目录对应的文件系统路径（version.ts 在 src/utils/） */
function getCurrentDir(): string {
  return dirname(fromFileUrl(import.meta.url));
}

/** 包根目录路径（dweb 包根，version.ts 在 src/utils/ 故上两级） */
export function getPackageRoot(): string {
  return join(getCurrentDir(), "..", "..");
}

/** 包根目录的 deno.json 路径 */
const getDenoJsonPath = (): string => {
  return join(getPackageRoot(), "deno.json");
};

/**
 * 从 deno.json 读取 version 字段
 * 读取失败时返回 "0.0.0"
 */
function readVersionFromDenoJson(): string {
  try {
    const path = getDenoJsonPath();
    const data = readFileSync(path);
    const text = new TextDecoder().decode(data);
    const json = JSON.parse(text) as { version?: string };
    return json.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** 框架版本号（@dreamer/dweb 的 deno.json version） */
export const DWEB_VERSION = readVersionFromDenoJson();

/**
 * 从 dweb deno.json 读取的配置（version + imports），供 init 生成项目时使用
 */
export interface DwebDenoConfig {
  /** dweb 自身版本（deno.json version） */
  version: string;
  /** deno.json imports 键值对 */
  imports: Record<string, string>;
  /** 若在 monorepo 中读到 plugins/deno.json，则带 plugins 版本（用于 UnoCSS） */
  pluginsVersion?: string;
}

/**
 * 从 dweb 包根 deno.json 读取版本与 imports，若在 monorepo 则再读 ../plugins/deno.json
 * 读取失败时返回 null，调用方使用兜底常量
 */
export async function loadDwebDenoJson(): Promise<DwebDenoConfig | null> {
  try {
    const dwebRoot = getPackageRoot();
    const denoJsonPath = join(dwebRoot, "deno.json");
    if (!(await exists(denoJsonPath))) return null;
    const content = await readTextFile(denoJsonPath);
    const parsed = JSON.parse(content) as {
      version?: string;
      imports?: Record<string, string>;
    };
    const version = parsed.version ?? FALLBACK_DWEB_VERSION;
    const imports = parsed.imports ?? {};
    let pluginsVersion: string | undefined;
    const pluginsDenoPath = join(dwebRoot, "..", "plugins", "deno.json");
    if (await exists(pluginsDenoPath)) {
      const pluginsContent = await readTextFile(pluginsDenoPath);
      const pluginsParsed = JSON.parse(pluginsContent) as { version?: string };
      pluginsVersion = pluginsParsed.version;
    }
    return { version, imports, pluginsVersion };
  } catch {
    return null;
  }
}

export async function getDwebVersion(): Promise<string> {
  const config = await loadDwebDenoJson();
  return config?.version ?? FALLBACK_DWEB_VERSION;
}

export async function getDwebImports(): Promise<Record<string, string>> {
  const config = await loadDwebDenoJson();
  return config?.imports ?? {};
}
