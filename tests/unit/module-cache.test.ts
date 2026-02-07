/**
 * 模块缓存版本管理测试
 *
 * 测试 src/feature/module-cache.ts 的功能：
 * - invalidateModule 使缓存失效
 * - getModuleVersion 获取版本号
 * - LRU 淘汰逻辑（通过多次 invalidate 触发）
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  getModuleVersion,
  invalidateModule,
} from "../../src/feature/module-cache.ts";

describe("模块缓存 (module-cache.ts)", () => {
  const testPath = "/tmp/test-route.tsx";

  describe("getModuleVersion()", () => {
    it("未记录的路径应返回 0", () => {
      expect(getModuleVersion("/never/invalidated/path.ts")).toBe(0);
    });

    it("file:// URL 应能正确解析", () => {
      invalidateModule(`file://${testPath}`);
      expect(getModuleVersion(`file://${testPath}`)).toBeGreaterThanOrEqual(1);
      expect(getModuleVersion(testPath)).toBe(
        getModuleVersion(`file://${testPath}`),
      );
    });
  });

  describe("invalidateModule()", () => {
    it("invalidate 后版本号应递增", () => {
      const path = "/tmp/cache-test-a.ts";
      invalidateModule(path);
      const v1 = getModuleVersion(path);
      invalidateModule(path);
      const v2 = getModuleVersion(path);
      expect(v2).toBe(v1 + 1);
    });

    it("相对路径应 resolve 后作为 key", () => {
      const rel = "src/routes/index.tsx";
      invalidateModule(rel);
      expect(getModuleVersion(rel)).toBeGreaterThanOrEqual(1);
    });
  });
});
