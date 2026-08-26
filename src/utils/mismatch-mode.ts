/**
 * View Hybrid/SSR 水合错位策略（AppConfig.render.hydration.mismatchMode）。
 * 未设置时客户端保持清空再 mount；仅 continue|assert 走 view hydrate。
 */

export type DwebMismatchMode = "continue" | "assert" | "remount";

/** 规范化配置/全局注入值；非法则 undefined（视为未设置）。 */
export function normalizeMismatchMode(
  value: unknown,
): DwebMismatchMode | undefined {
  if (value === "continue" || value === "assert" || value === "remount") {
    return value;
  }
  return undefined;
}

/** continue|assert 时 View 首屏应 hydrate 复用 SSR DOM；remount/未设置走 wipe+mount。 */
export function shouldViewHydrateReuseDom(
  mode: DwebMismatchMode | undefined,
): boolean {
  return mode === "continue" || mode === "assert";
}
