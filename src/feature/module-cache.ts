/**
 * 模块缓存版本管理
 *
 * 开发模式下，Deno/Bun 会缓存 import() 的模块。
 * 文件变更后若不失效缓存，刷新页面时 SSR 仍会加载旧模块。
 * 本模块在文件变更时记录版本号，loadRouteModule 等通过 URL 查询参数绕过缓存，
 * 使项目内所有模块更新后都能热重载。
 */

import { cwd, resolve } from "../core/runtime-adapter.ts";

/** 文件路径 -> 版本号（变更时递增），用于 import URL 的 cache-busting */
const versionMap = new Map<string, number>();

/**
 * 将路径规范化为绝对路径，用于版本 map 的 key
 */
function normalizePath(pathOrUrl: string): string {
  let path = pathOrUrl;
  if (path.startsWith("file://")) {
    path = path.slice(7);
  }
  if (!path.startsWith("/") && !path.match(/^[A-Za-z]:/)) {
    path = resolve(cwd(), path);
  }
  return path.replace(/\\/g, "/");
}

/**
 * 使指定路径的模块缓存失效
 *
 * 文件变更时（watch 触发 rebuild）调用，下次加载该模块时会拿到最新内容
 *
 * @param changedPath 变更的文件路径（相对或绝对）
 */
export function invalidateModule(changedPath: string): void {
  const key = normalizePath(changedPath);
  const prev = versionMap.get(key) ?? 0;
  versionMap.set(key, prev + 1);
}

/**
 * 获取路径对应的缓存版本号
 *
 * 用于构造 import URL 的 ?t= 参数，绕过模块缓存
 *
 * @param pathOrUrl 文件路径或 file:// URL
 * @returns 版本号，未记录则返回 0
 */
export function getModuleVersion(pathOrUrl: string): number {
  const key = normalizePath(pathOrUrl);
  return versionMap.get(key) ?? 0;
}
