/**
 * 应用版本解析与严格大于比较
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  isProjectVersionGreater,
  parseProjectVersion,
} from "../../src/utils/project-version.ts";

describe("project-version", () => {
  it("parseProjectVersion 应接受前导 v 并忽略预发布后缀", () => {
    expect(parseProjectVersion("1.2.3")).toEqual([1, 2, 3]);
    expect(parseProjectVersion("v1.2.3")).toEqual([1, 2, 3]);
    expect(parseProjectVersion("1.2.3-beta.1")).toEqual([1, 2, 3]);
    expect(parseProjectVersion("  2.0.0  ")).toEqual([2, 0, 0]);
    expect(parseProjectVersion("1.0")).toBeNull();
    expect(parseProjectVersion("")).toBeNull();
    expect(parseProjectVersion("abc")).toBeNull();
  });

  it("isProjectVersionGreater 应只在严格大于时为真", () => {
    expect(isProjectVersionGreater("1.0.1", "1.0.0")).toBe(true);
    expect(isProjectVersionGreater("1.1.0", "1.0.9")).toBe(true);
    expect(isProjectVersionGreater("2.0.0", "1.9.9")).toBe(true);
    expect(isProjectVersionGreater("1.0.0", "1.0.0")).toBe(false);
    expect(isProjectVersionGreater("1.0.0", "1.0.1")).toBe(false);
    expect(isProjectVersionGreater("v1.2.3", "1.2.3")).toBe(false);
    expect(isProjectVersionGreater("1.0.0-beta", "1.0.0")).toBe(false);
    expect(isProjectVersionGreater("not-a-version", "1.0.0")).toBe(false);
    expect(isProjectVersionGreater("1.0.0", "nope")).toBe(false);
  });
});
