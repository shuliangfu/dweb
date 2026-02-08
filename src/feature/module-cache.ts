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
 * - 每 EVICTION_BATCH_INTERVAL 次写入且超容时触发一次淘汰，减少淘汰频率
 */

import { cwd, resolve } from "../core/runtime-adapter.ts";

/** 文件路径 -> 版本号（变更时递增），用于 import URL 的 cache-busting */
const versionMap = new Map<string, number>();

/** 最大缓存条目数，超出时淘汰最早条目，防止长期开发时 versionMap 无界增长 */
const MAX_VERSION_MAP_SIZE = 2000;

/** 淘汰触发间隔：每 N 次写入且超容时触发一次淘汰，减少 Map 迭代频率 */
const EVICTION_BATCH_INTERVAL = 50;

/** 写入计数器，用于定期触发淘汰 */
let writeCountSinceEviction = 0;

/**
 * 将路径规范化为绝对路径，用于版本 map 的 key
 * Windows 兼容：file:///D:/path 与 D:\path 应归一为同一 key
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
  return path.replace(/\\/g, "/");
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
  // 每 EVICTION_BATCH_INTERVAL 次写入且超容时触发淘汰，减少 Map 迭代频率
  if (
    versionMap.size > MAX_VERSION_MAP_SIZE &&
    writeCountSinceEviction >= EVICTION_BATCH_INTERVAL
  ) {
    writeCountSinceEviction = 0;
    const toDelete = versionMap.size - MAX_VERSION_MAP_SIZE;
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
