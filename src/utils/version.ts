/**
 * 框架版本号（从 deno.json 自动读取，与包根目录 deno.json 的 version 字段同步）
 */

import { dirname, join, readFileSync } from "@dreamer/runtime-adapter";

/** 当前模块所在目录对应的文件系统路径 */
const getCurrentDir = (): string => {
  const url = new URL(import.meta.url);
  // pathname 在 Deno 下为 /path/to/file，在 Windows 下可能为 /C:/path/to/file
  const pathname = url.pathname;
  return dirname(pathname);
};

/** 包根目录的 deno.json 路径（version.ts 在 src/utils/ 下，故上两级为包根） */
const getDenoJsonPath = (): string => {
  return join(getCurrentDir(), "..", "..", "deno.json");
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
