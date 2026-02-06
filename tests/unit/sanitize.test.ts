/**
 * 请求参数安全过滤测试
 *
 * 测试 src/utils/sanitize.ts 的 sanitizeRequestParams 功能：
 * - 过滤危险键（__proto__、constructor、prototype）
 * - 过滤含 NUL 字符的键名
 * - 空值、非对象、数组的处理
 */

import { describe, expect, it } from "@dreamer/test";
import { sanitizeRequestParams } from "../../src/utils/sanitize.ts";

describe("sanitizeRequestParams (sanitize.ts)", () => {
  describe("空值与非法输入", () => {
    it("null 应返回空对象", () => {
      expect(sanitizeRequestParams(null)).toEqual({});
    });

    it("undefined 应返回空对象", () => {
      expect(sanitizeRequestParams(undefined)).toEqual({});
    });

    it("数组应返回空对象", () => {
      expect(
        sanitizeRequestParams(["a", "b"] as unknown as Record<string, unknown>),
      ).toEqual({});
    });

    it("非对象类型应返回空对象", () => {
      expect(
        sanitizeRequestParams("string" as unknown as Record<string, unknown>),
      ).toEqual({});
      expect(sanitizeRequestParams(123 as unknown as Record<string, unknown>))
        .toEqual({});
    });
  });

  describe("危险键过滤", () => {
    it("应过滤 __proto__ 键", () => {
      const input = { __proto__: "polluted", id: "1" };
      expect(sanitizeRequestParams(input)).toEqual({ id: "1" });
    });

    it("应过滤 constructor 键", () => {
      const input = { constructor: "polluted", name: "test" };
      expect(sanitizeRequestParams(input)).toEqual({ name: "test" });
    });

    it("应过滤 prototype 键", () => {
      const input = { prototype: "polluted", value: 42 };
      expect(sanitizeRequestParams(input)).toEqual({ value: 42 });
    });

    it("应同时过滤多个危险键", () => {
      const input = {
        __proto__: "a",
        constructor: "b",
        prototype: "c",
        safeKey: "ok",
      };
      expect(sanitizeRequestParams(input)).toEqual({ safeKey: "ok" });
    });
  });

  describe("NUL 字符过滤", () => {
    it("应过滤含 NUL 字符的键名", () => {
      const input = { "key\0evil": "value", normalKey: "ok" };
      expect(sanitizeRequestParams(input)).toEqual({ normalKey: "ok" });
    });

    it("应过滤键名中间含 NUL 的情况", () => {
      const input = { "a\0b": "v" };
      expect(sanitizeRequestParams(input)).toEqual({});
    });
  });

  describe("安全键值保留", () => {
    it("应保留普通字符串键值", () => {
      const input = { id: "123", name: "test" };
      expect(sanitizeRequestParams(input)).toEqual({ id: "123", name: "test" });
    });

    it("应保留 string[] 类型的值（query 场景）", () => {
      const input = { tags: ["a", "b"] };
      expect(sanitizeRequestParams(input)).toEqual({ tags: ["a", "b"] });
    });

    it("应保留数字、布尔等值", () => {
      const input = { count: 42, active: true };
      expect(sanitizeRequestParams(input)).toEqual({ count: 42, active: true });
    });

    it("空对象应返回空对象", () => {
      expect(sanitizeRequestParams({})).toEqual({});
    });
  });

  describe("Record<string, string> 兼容", () => {
    it("应正确处理 params 风格的 string 值", () => {
      const input: Record<string, string> = { slug: "hello-world" };
      expect(sanitizeRequestParams(input)).toEqual({ slug: "hello-world" });
    });
  });
});
