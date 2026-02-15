/**
 * 框架缓存目录（~/.dreamer）
 *
 * 职责：提供 dweb 与 dreamer 生态共用的用户级缓存根及子路径，
 * 与构建输出目录（build-dirs）分离，仅负责 ~/.dreamer 下的框架级缓存。
 *
 * 使用场景：Session 文件存储、版本号缓存等。
 *
 * @module
 */

import { getEnv, join } from "../core/runtime-adapter.ts";

/**
 * 获取 dweb 框架缓存目录（~/.dreamer/dweb）
 *
 * 用于存放框架级缓存（如 session 文件、版本缓存等）。
 * Unix: ~/.dreamer/dweb，Windows: %USERPROFILE%\.dreamer\dweb
 * 无法获取 HOME/USERPROFILE/LOCALAPPDATA 时返回空字符串，调用方需做判空。
 *
 * @returns 绝对路径或 ""
 */
export function getDreamerDwebCacheDir(): string {
  const home = getEnv("HOME") ?? getEnv("USERPROFILE") ??
    getEnv("LOCALAPPDATA");
  if (!home) return "";
  return join(home, ".dreamer", "dweb");
}
