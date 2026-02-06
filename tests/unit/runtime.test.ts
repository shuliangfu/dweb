/**
 * 运行时命令工具测试
 *
 * 测试 src/utils/runtime.ts 的功能：
 * - getRuntime 返回 deno 或 bun
 * - getTaskArgs 任务参数
 * - getTestArgs 测试参数
 * - getLintArgs 格式化参数
 * - getFmtArgs 格式化参数
 * - getRunArgs 运行脚本参数
 * - isWindows 平台判断
 *
 * 注：不测试 @dreamer/runtime-adapter 的 IS_DENO/IS_BUN，仅测试本框架对返回值的处理逻辑。
 */

import { describe, expect, it } from "@dreamer/test";
import {
  getFmtArgs,
  getLintArgs,
  getRuntime,
  getRunArgs,
  getTaskArgs,
  getTestArgs,
  isWindows,
} from "../../src/utils/runtime.ts";

describe("运行时工具 (runtime.ts)", () => {
  describe("getRuntime()", () => {
    it("应返回 deno 或 bun", () => {
      const rt = getRuntime();
      expect(["deno", "bun"]).toContain(rt);
    });
  });

  describe("getTaskArgs()", () => {
    it("应返回 [task, name] 或 [run, name] 格式", () => {
      const args = getTaskArgs("dev");
      expect(args).toHaveLength(2);
      expect(args[1]).toBe("dev");
    });
  });

  describe("getTestArgs()", () => {
    it("默认应包含 tests 路径", () => {
      const args = getTestArgs();
      expect(args.length).toBeGreaterThanOrEqual(2);
      expect(args).toContain("tests");
    });

    it("应支持自定义路径", () => {
      const args = getTestArgs("tests/unit");
      expect(args).toContain("tests/unit");
    });
  });

  describe("getLintArgs()", () => {
    it("应返回有效参数数组", () => {
      const withTask = getLintArgs(true);
      const withoutTask = getLintArgs(false);
      expect(withTask.length).toBeGreaterThanOrEqual(1);
      expect(withoutTask.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getFmtArgs()", () => {
    it("应返回有效参数数组", () => {
      const args = getFmtArgs();
      expect(args.length).toBeGreaterThanOrEqual(1);
    });

    it("useTask 为 true 时应使用 task", () => {
      const args = getFmtArgs(true);
      expect(args.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getRunArgs()", () => {
    it("应包含文件路径", () => {
      const args = getRunArgs("src/main.ts");
      expect(args).toContain("src/main.ts");
    });
  });

  describe("isWindows()", () => {
    it("应返回布尔值", () => {
      expect(typeof isWindows()).toBe("boolean");
    });
  });
});
