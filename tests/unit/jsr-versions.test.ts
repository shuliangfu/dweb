/**
 * JSR 版本获取测试
 *
 * 测试 src/utils/jsr-versions.ts：
 * - compareVersions / pickNewer 版本比较逻辑（--beta 时稳定版比 beta 新则用稳定版）
 * - fetchJsrLatestVersion 能从 meta.json 获取版本
 * - fetchDreamerVersions 能批量获取 @dreamer/* 版本
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  compareVersions,
  fetchDreamerVersions,
  fetchJsrLatestVersion,
  pickNewer,
} from "../../src/utils/jsr-versions.ts";

describe("jsr-versions", () => {
  describe("compareVersions / pickNewer（版本比较，--beta 时取较新者）", () => {
    it("v1.0.1 应大于 v1.0.0-beta.10（稳定版比 beta 新）", () => {
      expect(compareVersions("1.0.1", "1.0.0-beta.10")).toBeGreaterThan(0);
      expect(compareVersions("1.0.0-beta.10", "1.0.1")).toBeLessThan(0);
    });

    it("v1.0.0-beta.17 应大于 v1.0.0-beta.10", () => {
      expect(compareVersions("1.0.0-beta.17", "1.0.0-beta.10")).toBeGreaterThan(
        0,
      );
      expect(compareVersions("1.0.0-beta.10", "1.0.0-beta.17")).toBeLessThan(0);
    });

    it("v3.0.14 应大于 v3.0.0-beta.1", () => {
      expect(compareVersions("3.0.14", "3.0.0-beta.1")).toBeGreaterThan(0);
      expect(compareVersions("3.0.0-beta.1", "3.0.14")).toBeLessThan(0);
    });

    it("pickNewer 当稳定版更新时应返回稳定版", () => {
      expect(pickNewer("1.0.0-beta.10", "1.0.1")).toBe("1.0.1");
      expect(pickNewer("3.0.0-beta.1", "3.0.14")).toBe("3.0.14");
    });

    it("pickNewer 当 beta 更新时应返回 beta", () => {
      expect(pickNewer("1.0.0-beta.17", "1.0.0")).toBe("1.0.0-beta.17");
    });

    it("pickNewer 当一方为 null 时应返回另一方", () => {
      expect(pickNewer(null, "1.0.0")).toBe("1.0.0");
      expect(pickNewer("1.0.0-beta.10", null)).toBe("1.0.0-beta.10");
      expect(pickNewer(null, null)).toBe(null);
    });
  });

  describe("fetchJsrLatestVersion / fetchDreamerVersions", () => {
    it("fetchJsrLatestVersion 应能获取 @dreamer/dweb 稳定版", async () => {
      const version = await fetchJsrLatestVersion("@dreamer/dweb", false);
      console.log("[稳定版] @dreamer/dweb:", version);
      expect(version).toBeTruthy();
      expect(typeof version).toBe("string");
      // 稳定版不应含 -beta、-alpha 等
      expect(version).not.toMatch(/-\w+\.?\d*$/);
    });

    it("fetchJsrLatestVersion 应能获取 @dreamer/dweb beta 版（若有）", async () => {
      const version = await fetchJsrLatestVersion("@dreamer/dweb", true);
      console.log("[beta 版] @dreamer/dweb:", version);
      expect(version).toBeTruthy();
      expect(typeof version).toBe("string");
    });

    it("fetchDreamerVersions(useBeta=false) 全部从 JSR 获取最新稳定版", async () => {
      const versions = await fetchDreamerVersions(false, null);
      console.log("[未使用 --beta] fetchDreamerVersions (全部从 JSR 稳定版):");
      console.log("  dweb:", versions.dweb);
      console.log("  render:", versions.render);
      console.log("  router:", versions.router);
      console.log("  plugins:", versions.plugins);
      console.log("  view:", versions.view);
      expect(versions.dweb).toBeTruthy();
      expect(versions.render).toBeTruthy();
      expect(versions.router).toBeTruthy();
      expect(versions.plugins).toBeTruthy();
      expect(versions.view).toBeTruthy();
      // 稳定版不应含 -beta、-alpha 等
      for (const [, v] of Object.entries(versions)) {
        expect(v).not.toMatch(/-\w+\.?\d*$/);
      }
    });

    it("fetchDreamerVersions(useBeta=true) 全部从 JSR 获取", async () => {
      const versions = await fetchDreamerVersions(true);
      console.log("[使用 --beta] fetchDreamerVersions (全部从 JSR):");
      console.log("  dweb:", versions.dweb);
      console.log("  render:", versions.render);
      console.log("  router:", versions.router);
      console.log("  plugins:", versions.plugins);
      console.log("  view:", versions.view);
      expect(versions.dweb).toBeTruthy();
      expect(versions.render).toBeTruthy();
      expect(versions.router).toBeTruthy();
      expect(versions.plugins).toBeTruthy();
      expect(versions.view).toBeTruthy();
    });

    it("fetchDreamerVersions(useBeta=true) 当稳定版比 beta 新时应返回稳定版", async () => {
      const [dwebBeta, dwebStable] = await Promise.all([
        fetchJsrLatestVersion("@dreamer/dweb", true),
        fetchJsrLatestVersion("@dreamer/dweb", false),
      ]);
      const versions = await fetchDreamerVersions(true);
      // 关键断言：若 3.0.14 > 3.0.0-beta.1，则 dweb 应返回 3.0.14 而非 beta
      const expectedDweb = pickNewer(dwebBeta, dwebStable);
      expect(versions.dweb).toBe(expectedDweb);
      expect(compareVersions(versions.dweb, "3.0.0")).toBeGreaterThanOrEqual(0);
    });
  });
});
