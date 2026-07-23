/**
 * test-launcher 纯逻辑测试
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  parseTestRuntime,
  resolveTestLayers,
  resolveTestPaths,
  shouldPreferTestTask,
  splitAppAndPaths,
  TEST_LAYER_DIRS,
} from "../../src/utils/test-launcher.ts";

describe("test-launcher", () => {
  describe("resolveTestLayers()", () => {
    it("无 flag 时应为空", () => {
      expect(resolveTestLayers({})).toEqual([]);
    });

    it("应支持多选分层", () => {
      expect(resolveTestLayers({ unit: true, e2e: true })).toEqual([
        "unit",
        "e2e",
      ]);
    });
  });

  describe("resolveTestPaths()", () => {
    it("显式路径应优先", () => {
      expect(resolveTestPaths(["tests/foo"], ["unit"])).toEqual(["tests/foo"]);
    });

    it("分层应映射默认目录", () => {
      expect(resolveTestPaths([], ["unit", "integration"])).toEqual([
        TEST_LAYER_DIRS.unit,
        TEST_LAYER_DIRS.integration,
      ]);
    });

    it("无路径无分层时应默认 tests", () => {
      expect(resolveTestPaths([], [])).toEqual(["tests"]);
    });
  });

  describe("shouldPreferTestTask()", () => {
    it("默认 tests 且无 flag 时应优先 task", () => {
      expect(
        shouldPreferTestTask({
          paths: ["tests"],
          layers: [],
        }),
      ).toBe(true);
    });

    it("有 filter 时不应走 task", () => {
      expect(
        shouldPreferTestTask({
          paths: ["tests"],
          layers: [],
          filter: "chunk",
        }),
      ).toBe(false);
    });

    it("有 coverage 时不应走 task", () => {
      expect(
        shouldPreferTestTask({
          paths: ["tests"],
          layers: [],
          coverage: true,
        }),
      ).toBe(false);
    });

    it("有分层时不应走 task", () => {
      expect(
        shouldPreferTestTask({
          paths: ["tests/unit"],
          layers: ["unit"],
        }),
      ).toBe(false);
    });

    it("自定义路径时不应走 task", () => {
      expect(
        shouldPreferTestTask({
          paths: ["tests/unit"],
          layers: [],
        }),
      ).toBe(false);
    });
  });

  describe("parseTestRuntime()", () => {
    it("空值应返回无 runtime", () => {
      expect(parseTestRuntime(undefined)).toEqual({});
      expect(parseTestRuntime("")).toEqual({});
    });

    it("应规范化 deno / bun", () => {
      expect(parseTestRuntime("Deno")).toEqual({ runtime: "deno" });
      expect(parseTestRuntime("bun")).toEqual({ runtime: "bun" });
    });

    it("非法值应返回 invalid", () => {
      expect(parseTestRuntime("node")).toEqual({ invalid: "node" });
    });
  });

  describe("splitAppAndPaths()", () => {
    it("option app 应优先", () => {
      expect(
        splitAppAndPaths(["tests/unit"], "backend", ["backend", "frontend"]),
      ).toEqual({ app: "backend", paths: ["tests/unit"] });
    });

    it("首参为 app 名时应剥离", () => {
      expect(
        splitAppAndPaths(["backend", "tests/e2e"], undefined, [
          "backend",
          "frontend",
        ]),
      ).toEqual({ app: "backend", paths: ["tests/e2e"] });
    });

    it("单应用时应把参数当作路径", () => {
      expect(splitAppAndPaths(["tests/unit"], undefined, [])).toEqual({
        paths: ["tests/unit"],
      });
    });
  });
});
