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

/** 无法读取 deno.json 时的默认框架版本 */
export const FALLBACK_DWEB_VERSION = "3.0.0-beta.1";
/** 无法读取 deno.json 时的默认 runtime-adapter 依赖说明符 */
export const FALLBACK_RUNTIME_ADAPTER_SPEC =
  "jsr:@dreamer/runtime-adapter@^1.0.0-beta.23";
/** 无法读取 deno.json 时的默认 plugins 版本 */
export const FALLBACK_PLUGINS_VERSION = "1.0.0-beta.14";

/**
 * 将 file: URL 转为本地路径（兼容 Unix / Windows）
 *
 * @param url file: 协议 URL
 * @returns 本地文件系统路径
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

/**
 * 包根目录路径（dweb 包根）
 *
 * version.ts 在 src/utils/，故上两级为包根。
 *
 * @returns 包根绝对路径
 */
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

/** 框架版本号（从 deno.json 读取，读取失败时使用 "0.0.0"） */
export const DWEB_VERSION: string = readVersionFromDenoJson();

/**
 * 从 dweb deno.json 读取的配置
 *
 * 包含 version、imports，供 init 生成项目时使用。
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
 * 判断当前是否从 JSR/远程 URL 运行（非本地 file:）
 */
function isRemoteRun(): boolean {
  try {
    const url = import.meta.url;
    return url.startsWith("http:") || url.startsWith("https:");
  } catch {
    return false;
  }
}

/**
 * 从 dweb 包根 deno.json 读取版本与 imports，若在 monorepo 则再读 ../plugins/deno.json
 * - 本地运行：从文件系统读取
 * - JSR 运行：通过 fetch 从包根 URL 获取 deno.json（version.ts 在 src/utils/，故 ../../deno.json）
 * 读取失败时返回 null，调用方使用兜底常量
 */
export async function loadDwebDenoJson(): Promise<DwebDenoConfig | null> {
  try {
    let parsed: { version?: string; imports?: Record<string, string>; pluginsVersion?: string };

    if (isRemoteRun()) {
      // JSR 运行：fetch 包根 deno.json
      const denoJsonUrl = new URL("../../deno.json", import.meta.url).href;
      const res = await fetch(denoJsonUrl);
      if (!res.ok) return null;
      const content = await res.text();
      parsed = JSON.parse(content) as {
        version?: string;
        imports?: Record<string, string>;
      };
    } else {
      const dwebRoot = getPackageRoot();
      const denoJsonPath = join(dwebRoot, "deno.json");
      if (!(await exists(denoJsonPath))) return null;
      const content = await readTextFile(denoJsonPath);
      parsed = JSON.parse(content) as {
        version?: string;
        imports?: Record<string, string>;
      };
    }

    const version = parsed.version ?? FALLBACK_DWEB_VERSION;
    const imports = parsed.imports ?? {};
    let pluginsVersion: string | undefined;

    if (!isRemoteRun()) {
      const dwebRoot = getPackageRoot();
      const pluginsDenoPath = join(dwebRoot, "..", "plugins", "deno.json");
      if (await exists(pluginsDenoPath)) {
        const pluginsContent = await readTextFile(pluginsDenoPath);
        const pluginsParsed = JSON.parse(pluginsContent) as { version?: string };
        pluginsVersion = pluginsParsed.version;
      }
    }

    return { version, imports, pluginsVersion };
  } catch {
    return null;
  }
}

/**
 * 获取 dweb 框架版本号
 *
 * 从 deno.json 读取，失败时返回 FALLBACK_DWEB_VERSION。
 *
 * @returns 版本号字符串
 */
export async function getDwebVersion(): Promise<string> {
  const config = await loadDwebDenoJson();
  return config?.version ?? FALLBACK_DWEB_VERSION;
}

/**
 * 获取 dweb deno.json 的 imports 配置
 *
 * 供 init 生成项目时写入新项目的 deno.json。
 *
 * @returns imports 键值对
 */
export async function getDwebImports(): Promise<Record<string, string>> {
  const config = await loadDwebDenoJson();
  return config?.imports ?? {};
}
