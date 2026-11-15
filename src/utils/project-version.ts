/**
 * 应用版本号解析与严格大于比较（major.minor.patch）。
 *
 * 升级提示比较用：允许前导 `v`，忽略预发布后缀。
 */

/** 解析后的 major.minor.patch（忽略前导 `v` 与预发布后缀） */
export type ProjectVersionParts = readonly [number, number, number];

/**
 * 将版本字符串解析为 major.minor.patch。允许前导 `v`，忽略 `-beta` 等后缀。
 *
 * @param value 原始版本
 * @returns 三个非负整数，无法解析时返回 `null`
 */
export function parseProjectVersion(value: string): ProjectVersionParts | null {
  const m = value.trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * 判断 `left` 是否严格大于 `right`（major.minor.patch）。
 * 任一侧无法解析时返回 `false`。
 *
 * @param left 左侧版本
 * @param right 右侧版本
 */
export function isProjectVersionGreater(left: string, right: string): boolean {
  const a = parseProjectVersion(left);
  const b = parseProjectVersion(right);
  if (!a || !b) return false;
  if (a[0] !== b[0]) return a[0] > b[0];
  if (a[1] !== b[1]) return a[1] > b[1];
  return a[2] > b[2];
}
