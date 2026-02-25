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

import {
  cwd,
  pathToFileUrl,
  platform,
  resolve,
} from "../core/runtime-adapter.ts";
import { getCacheOptions } from "../utils/constants.ts";

/** 文件路径 -> 版本号（变更时递增），用于 import URL 的 cache-busting */
const versionMap = new Map<string, number>();

/** 写入计数器，用于定期触发淘汰 */
let writeCountSinceEviction = 0;

/**
 * 从 file:// URL 的 href 中取出路径部分（Windows: /D:/path -> D:/path）
 */
function pathFromFileUrl(fileUrl: string): string {
  let path = fileUrl.slice(7);
  if (path.length >= 3 && path[0] === "/" && path[2] === ":") {
    path = path.slice(1);
  }
  return path;
}

/**
 * 将路径规范化为绝对路径，用于版本 map 的 key
 * Windows：路径统一经 pathToFileUrl 再取 path，保证 pathToFileUrl(testPath) 与 testPath 查同一 key
 * 非 Windows：已是 X:/ 或 X:\ 的合成路径不经过 pathToFileUrl，避免 D:/ 被当普通路径段导致 key 不一致
 */
function normalizePath(pathOrUrl: string): string {
  let path: string;
  if (pathOrUrl.startsWith("file://")) {
    path = pathFromFileUrl(pathOrUrl);
  } else if (pathOrUrl.match(/^[A-Za-z]:[/\\]/) && platform() !== "windows") {
    // 非 Windows 上 D:/path 为合成路径，按 file URL 规则归一（跨平台测试）
    path = pathFromFileUrl("file:///" + pathOrUrl.replace(/\\/g, "/"));
  } else {
    const abs = !pathOrUrl.startsWith("/") && !pathOrUrl.match(/^[A-Za-z]:/)
      ? resolve(cwd(), pathOrUrl)
      : pathOrUrl;
    path = pathFromFileUrl(pathToFileUrl(abs));
  }
  path = path.replace(/\\/g, "/");
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
