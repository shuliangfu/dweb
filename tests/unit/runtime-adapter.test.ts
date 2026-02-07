/**
 * 运行时适配器测试
 *
 * 测试 src/core/runtime-adapter.ts 的 re-export：
 * - 常用 API 应从 @dreamer/runtime-adapter 正确导出
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import * as adapter from "../../src/core/runtime-adapter.ts";

describe("运行时适配器 (runtime-adapter.ts)", () => {
  describe("进程与环境", () => {
    it("应导出 getEnv", () => {
      expect(typeof adapter.getEnv).toBe("function");
    });
    it("应导出 setEnv", () => {
      expect(typeof adapter.setEnv).toBe("function");
    });
    it("应导出 cwd", () => {
      expect(typeof adapter.cwd).toBe("function");
    });
    it("应导出 args", () => {
      expect(typeof adapter.args).toBe("function");
    });
    it("应导出 exit", () => {
      expect(typeof adapter.exit).toBe("function");
    });
  });

  describe("路径", () => {
    it("应导出 join", () => {
      expect(typeof adapter.join).toBe("function");
    });
    it("应导出 resolve", () => {
      expect(typeof adapter.resolve).toBe("function");
    });
    it("应导出 dirname", () => {
      expect(typeof adapter.dirname).toBe("function");
    });
    it("应导出 basename", () => {
      expect(typeof adapter.basename).toBe("function");
    });
  });

  describe("文件系统", () => {
    it("应导出 readFileSync", () => {
      expect(typeof adapter.readFileSync).toBe("function");
    });
    it("应导出 readTextFile", () => {
      expect(typeof adapter.readTextFile).toBe("function");
    });
    it("应导出 writeTextFile", () => {
      expect(typeof adapter.writeTextFile).toBe("function");
    });
    it("应导出 mkdir", () => {
      expect(typeof adapter.mkdir).toBe("function");
    });
    it("应导出 ensureDir", () => {
      expect(typeof adapter.ensureDir).toBe("function");
    });
    it("应导出 exists", () => {
      expect(typeof adapter.exists).toBe("function");
    });
  });

  describe("cwd() 返回值", () => {
    it("应返回非空字符串", () => {
      const dir = adapter.cwd();
      expect(typeof dir).toBe("string");
      expect(dir.length).toBeGreaterThan(0);
    });
  });

  describe("join()", () => {
    it("应拼接路径", () => {
      const result = adapter.join("a", "b", "c");
      expect(result).toContain("a");
      expect(result).toContain("b");
      expect(result).toContain("c");
    });
  });
});
