/**
 * 模块缓存版本管理
 *
 * 开发模式下，Deno/Bun 会缓存 import() 的模块。
 * 文件变更后若不失效缓存，刷新页面时 SSR 仍会加载旧模块。
 * 本模块在文件变更时记录版本号，loadRouteModule 等通过 URL 查询参数绕过缓存，
 * 使项目内所有模块更新后都能热重载。
 *
 * 淘汰策略：LRU（Least Recently Used）
 * - 写入时 delete+set 将 key 移到 Map 末尾（Map 保持插入顺序）
 * - 超出容量时淘汰最前面的条目（最久未修改）
 * - 容量与淘汰间隔由 getCacheOptions() 决定（可由 config.build.devCache 覆盖）
 */

import { cwd, resolve } from "../core/runtime-adapter.ts";
import { getCacheOptions } from "../utils/constants.ts";

/** 文件路径 -> 版本号（变更时递增），用于 import URL 的 cache-busting */
const versionMap = new Map<string, number>();

/** 写入计数器，用于定期触发淘汰 */
let writeCountSinceEviction = 0;

/**
 * 将路径规范化为绝对路径，用于版本 map 的 key
 * Windows 兼容：file:///D:/path、file:///d:/path、D:\path 应归一为同一 key
 */
function normalizePath(pathOrUrl: string): string {
  let path = pathOrUrl;
  if (path.startsWith("file://")) {
    path = path.slice(7);
    // Windows: file:///D:/path -> /D:/path，归一为 D:/path 以匹配直接路径
    if (path.length >= 3 && path[0] === "/" && path[2] === ":") {
      path = path.slice(1);
    }
  }
  if (!path.startsWith("/") && !path.match(/^[A-Za-z]:/)) {
    path = resolve(cwd(), path);
  }
  path = path.replace(/\\/g, "/");
  // Windows：盘符统一为大写，使 pathToFileUrl 的 file:///c:/ 与 C:\ 或 c:\ 归为同一 key
  if (path.length >= 2 && path[1] === ":") {
    path = path[0].toUpperCase() + path.slice(1);
  }
  return path;
}

/**
 * 使指定路径的模块缓存失效
 *
 * 文件变更时（watch 触发 rebuild）调用，下次加载该模块时会拿到最新内容。
 * LRU：先 delete 再 set，将 key 移到 Map 末尾，淘汰时删除最前面的（最久未修改）。
 *
 * @param changedPath 变更的文件路径（相对或绝对）
 */
export function invalidateModule(changedPath: string): void {
  const key = normalizePath(changedPath);
  const prev = versionMap.get(key) ?? 0;
  // 先删除再设置，使 key 移到 Map 末尾（LRU：最近写入的视为最近使用）
  versionMap.delete(key);
  versionMap.set(key, prev + 1);

  writeCountSinceEviction++;
  const opts = getCacheOptions();
  if (
    versionMap.size > opts.maxVersionMapSize &&
    writeCountSinceEviction >= opts.evictionBatchInterval
  ) {
    writeCountSinceEviction = 0;
    const toDelete = versionMap.size - opts.maxVersionMapSize;
    let deleted = 0;
    for (const k of versionMap.keys()) {
      versionMap.delete(k);
      if (++deleted >= toDelete) break;
    }
  }
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
