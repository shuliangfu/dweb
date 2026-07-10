/**
 * cache-dirs 单元测试
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  getDreamerDwebCacheDir,
  getDreamerProjectCacheRoot,
  getDreamerProjectDirCacheSegment,
} from "../../src/utils/cache-dirs.ts";

describe("cache-dirs", () => {
  it("getDreamerDwebCacheDir 在有 HOME 时应含 .dreamer/dweb", () => {
    const dir = getDreamerDwebCacheDir();
    if (!dir) return; // 极端无 HOME 环境跳过断言
    expect(dir.replace(/\\/g, "/")).toMatch(/\.dreamer\/dweb$/);
  });

  it("getDreamerProjectDirCacheSegment 应清洗不安全字符", () => {
    expect(getDreamerProjectDirCacheSegment("/tmp/my project")).toBe(
      "my-project",
    );
    // basename(C:\Work\app:name) → app:name → app-name
    expect(getDreamerProjectDirCacheSegment("C:\\Work\\app:name")).toBe(
      "app-name",
    );
    // * 替换为 -，非空则保留
    expect(getDreamerProjectDirCacheSegment("***")).toBe("---");
    // 全被去掉后回退 project
    expect(getDreamerProjectDirCacheSegment("...")).toBe("project");
  });

  it("getDreamerProjectCacheRoot 应含项目片段", () => {
    const root = getDreamerProjectCacheRoot("/Users/u/my-app");
    if (!root) return;
    expect(root.replace(/\\/g, "/")).toMatch(/\.dreamer\/my-app$/);
  });
});
