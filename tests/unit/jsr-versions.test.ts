/**
 * JSR 版本获取测试
 *
 * 测试 src/utils/jsr-versions.ts：
 * - fetchJsrLatestVersion 能从 meta.json 获取版本
 * - fetchDreamerVersions 能批量获取 @dreamer/* 版本
 */

import { describe, expect, it } from "@dreamer/test";
import {
  fetchDreamerVersions,
  fetchJsrLatestVersion,
} from "../../src/utils/jsr-versions.ts";

describe("jsr-versions", () => {
  it("fetchJsrLatestVersion 应能获取 @dreamer/dweb 稳定版", async () => {
    const version = await fetchJsrLatestVersion("@dreamer/dweb", false);
    expect(version).toBeTruthy();
    expect(typeof version).toBe("string");
    // 稳定版不应含 -beta、-alpha 等
    expect(version).not.toMatch(/-\w+\.?\d*$/);
  });

  it("fetchJsrLatestVersion 应能获取 @dreamer/dweb beta 版（若有）", async () => {
    const version = await fetchJsrLatestVersion("@dreamer/dweb", true);
    expect(version).toBeTruthy();
    expect(typeof version).toBe("string");
  });

  it("fetchDreamerVersions 应返回 dweb、render、router、plugins 版本", async () => {
    const versions = await fetchDreamerVersions(false);
    expect(versions.dweb).toBeTruthy();
    expect(versions.render).toBeTruthy();
    expect(versions.router).toBeTruthy();
    expect(versions.plugins).toBeTruthy();
  });
});
