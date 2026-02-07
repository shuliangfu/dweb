/**
 * 版本工具测试
 *
 * 测试 src/utils/version.ts：
 * - DWEB_VERSION 导出
 * - 版本号格式（语义化版本）
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { DWEB_VERSION } from "../../src/utils/version.ts";

describe("版本 (version.ts)", () => {
  describe("DWEB_VERSION", () => {
    it("应该导出字符串", () => {
      expect(typeof DWEB_VERSION).toBe("string");
      expect(DWEB_VERSION.length).toBeGreaterThan(0);
    });

    it("应为语义化版本格式（x.y.z 或 x.y.z-prerelease）", () => {
      const semverRe = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
      expect(DWEB_VERSION).toMatch(semverRe);
    });

    it("不应为空或纯空格", () => {
      expect(DWEB_VERSION.trim()).toBe(DWEB_VERSION);
      expect(DWEB_VERSION).not.toBe("");
    });
  });
});
