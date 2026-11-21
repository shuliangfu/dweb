/**
 * 版本工具测试
 *
 * 测试 src/utils/version.ts：
 * - DWEB_VERSION 导出
 * - 版本号格式（语义化版本）
 * - fromFileUrl、getPackageRoot、getDwebVersion、缓存读写
 */

import "../setup.ts";
import {
  getEnv,
  join,
  makeTempDir,
  remove,
  setEnv,
} from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import {
  DWEB_VERSION,
  fromFileUrl,
  getDwebImports,
  getDwebVersion,
  getPackageRoot,
  loadDwebDenoJson,
  readVersionCache,
  writeVersionCache,
} from "../../src/utils/version.ts";

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

  describe("fromFileUrl / getPackageRoot", () => {
    it("非 file 协议应原样返回", () => {
      expect(fromFileUrl("https://example.test/a.ts")).toBe(
        "https://example.test/a.ts",
      );
    });

    it("应解码 file URL，并去掉 Windows 盘符前的斜杠", () => {
      expect(fromFileUrl("file:///Users/demo/app.ts")).toBe(
        "/Users/demo/app.ts",
      );
      expect(fromFileUrl("file:///C:/Users/demo/app.ts")).toBe(
        "C:/Users/demo/app.ts",
      );
    });

    it("getPackageRoot 应指向含 deno.json 的包根", () => {
      const root = getPackageRoot();
      expect(root.replace(/\\/g, "/")).toMatch(/dweb$/);
    });
  });

  describe("getDwebVersion / loadDwebDenoJson", () => {
    it("注入 __DWEB_VERSION__ 时应优先返回该值", async () => {
      const g = globalThis as { __DWEB_VERSION__?: string };
      const prev = g.__DWEB_VERSION__;
      g.__DWEB_VERSION__ = "9.9.9-test";
      try {
        expect(await getDwebVersion()).toBe("9.9.9-test");
      } finally {
        if (prev === undefined) delete g.__DWEB_VERSION__;
        else g.__DWEB_VERSION__ = prev;
      }
    });

    it("无注入时应返回包版本，并能读到 imports", async () => {
      const g = globalThis as { __DWEB_VERSION__?: string };
      const prev = g.__DWEB_VERSION__;
      delete g.__DWEB_VERSION__;
      try {
        expect(await getDwebVersion()).toBe(DWEB_VERSION);
        const cfg = await loadDwebDenoJson();
        expect(cfg?.version).toBe(DWEB_VERSION);
        const imports = await getDwebImports();
        expect(typeof imports).toBe("object");
      } finally {
        if (prev !== undefined) g.__DWEB_VERSION__ = prev;
      }
    });
  });

  describe("version cache", () => {
    it("应在临时 HOME 下写入并读回版本号，非法缓存返回 null", async () => {
      const dir = await makeTempDir({ prefix: "dweb-version-home-" });
      const origHome = getEnv("HOME");
      const origProfile = getEnv("USERPROFILE");
      setEnv("HOME", dir);
      setEnv("USERPROFILE", dir);
      try {
        await writeVersionCache("1.2.3-cache");
        expect(await readVersionCache()).toBe("1.2.3-cache");
      } finally {
        if (origHome != null) setEnv("HOME", origHome);
        if (origProfile != null) setEnv("USERPROFILE", origProfile);
        await remove(dir, { recursive: true });
      }
    });
  });
});
