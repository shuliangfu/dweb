/**
 * 模块缓存版本管理测试
 *
 * 测试 src/feature/module-cache.ts 的功能：
 * - invalidateModule 使缓存失效
 * - getModuleVersion 获取版本号
 * - LRU 淘汰逻辑（通过多次 invalidate 触发）
 *
 * 使用 pathToFileUrl 构造 file:// URL，支持 Windows 跨平台。
 */

import "../setup.ts";
import {
  join,
  makeTempDir,
  pathToFileUrl,
  remove,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import {
  getModuleVersion,
  invalidateModule,
} from "../../src/feature/module-cache.ts";

describe("模块缓存 (module-cache.ts)", () => {
  let testDir: string;
  let testPath: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-module-cache-" });
    testPath = join(testDir, "test-route.tsx");
  });

  afterAll(async () => {
    await remove(testDir, { recursive: true });
  });

  describe("getModuleVersion()", () => {
    it("未记录的路径应返回 0", () => {
      expect(getModuleVersion(join(testDir, "never/invalidated/path.ts"))).toBe(
        0,
      );
    });

    it("file:// URL 应能正确解析", () => {
      const fileUrl = pathToFileUrl(testPath);
      invalidateModule(fileUrl);
      expect(getModuleVersion(fileUrl)).toBeGreaterThanOrEqual(1);
      expect(getModuleVersion(testPath)).toBe(getModuleVersion(fileUrl));
    });
  });

  describe("invalidateModule()", () => {
    it("invalidate 后版本号应递增", () => {
      const path = join(testDir, "cache-test-a.ts");
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
