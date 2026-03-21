/**
 * 框架缓存目录（~/.dreamer）
 *
 * 职责：提供 dweb 与 dreamer 生态共用的用户级缓存根及子路径，
 * 与构建输出目录（build-dirs）分离，仅负责 ~/.dreamer 下的框架级缓存。
 *
 * 使用场景：Session 文件存储、版本号缓存、按项目目录区分的用户级缓存等。
 *
 * @module
 */

import {
  basename,
  cwd,
  getEnv,
  join,
  resolve,
} from "../core/runtime-adapter.ts";

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

/**
 * 将项目目录名片段规范化为可安全作为 `~/.dreamer/<segment>/` 的一级目录名
 *
 * @param segment 一般为项目根文件夹名
 * @returns 非空安全名，失败时为 `"project"`
 */
function sanitizeDreamerProjectDirSegment(segment: string): string {
  const s = segment
    .replace(/\\/g, "-")
    .replace(/[/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 120)
    .trim();
  return s || "project";
}

/**
 * 用**项目根目录的文件夹名**区分不同项目（与 `cwd` 解析后的末级目录一致）
 *
 * 例：`/home/user/bgb` → `bgb`。多份克隆若路径末级同名会共用同一缓存子目录。
 *
 * @param projectRoot 项目根路径，默认当前工作目录
 * @returns 安全化后的目录名片段
 */
export function getDreamerProjectDirCacheSegment(
  projectRoot: string = cwd(),
): string {
  const root = resolve(projectRoot);
  return sanitizeDreamerProjectDirSegment(basename(root));
}

/**
 * 当前项目在用户主目录下的缓存根：`~/.dreamer/<项目目录名>/`
 *
 * 规则：用 {@link getDreamerProjectDirCacheSegment} 区分项目；无法取得 HOME 等时返回 `null`，
 * 调用方应回退到项目内目录（如 `.dweb/`）。
 *
 * @param projectRoot 项目根路径
 * @returns 绝对路径或 `null`
 */
export function getDreamerProjectCacheRoot(
  projectRoot: string = cwd(),
): string | null {
  const home = getEnv("HOME") ?? getEnv("USERPROFILE") ??
    getEnv("LOCALAPPDATA");
  if (!home) return null;
  const segment = getDreamerProjectDirCacheSegment(projectRoot);
  return join(home, ".dreamer", segment);
}
