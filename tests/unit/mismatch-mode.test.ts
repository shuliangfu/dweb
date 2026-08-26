/**
 * render.hydration.mismatchMode 规范化与 View 首屏策略
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  normalizeMismatchMode,
  shouldViewHydrateReuseDom,
} from "../../src/utils/mismatch-mode.ts";

describe("mismatch-mode", () => {
  it("normalizeMismatchMode：仅接受 continue|assert|remount", () => {
    expect(normalizeMismatchMode("continue")).toBe("continue");
    expect(normalizeMismatchMode("assert")).toBe("assert");
    expect(normalizeMismatchMode("remount")).toBe("remount");
    expect(normalizeMismatchMode(undefined)).toBeUndefined();
    expect(normalizeMismatchMode("")).toBeUndefined();
    expect(normalizeMismatchMode("wipe")).toBeUndefined();
    expect(normalizeMismatchMode(1)).toBeUndefined();
  });

  it("shouldViewHydrateReuseDom：仅 continue|assert 为 true（默认/remount 保持 wipe+mount）", () => {
    expect(shouldViewHydrateReuseDom(undefined)).toBe(false);
    expect(shouldViewHydrateReuseDom("remount")).toBe(false);
    expect(shouldViewHydrateReuseDom("continue")).toBe(true);
    expect(shouldViewHydrateReuseDom("assert")).toBe(true);
  });
});
