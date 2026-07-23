/**
 * 统一错误处理模块单元测试
 *
 * 测试 DwebError、createDwebError、throwDwebError、i18n 翻译器等
 * 使用 @dreamer/test 与 runtime-adapter 保证 Deno/Bun 兼容
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { assertRejects } from "@dreamer/test";
import {
  createDwebError,
  DwebError,
  DwebErrorCode,
  getDwebErrorTranslator,
  isDwebError,
  setDwebErrorTranslator,
  throwDwebError,
} from "../../src/utils/errors.ts";

describe("统一错误处理 (errors.ts)", () => {
  describe("createDwebError", () => {
    it("创建错误实例", () => {
      const err = createDwebError(DwebErrorCode.CONFIG_NAME_INVALID);
      expect(err.code).toBe(DwebErrorCode.CONFIG_NAME_INVALID);
      expect(err.messageKey).toBe("errors.DWEB_E01");
      expect(err.message).toMatch(
        /配置项 'name' 必须是字符串类型|Config 'name' must be a string/,
      );
      expect(err.name).toBe("DwebError");
    });

    it("带参数创建", () => {
      const err = createDwebError(DwebErrorCode.ENTRY_PATH_INVALID, {
        reason: "段数过多",
        hint: "支持 main.ts 或 src/main.ts",
        path: "/foo/bar/baz",
      });
      expect(err.code).toBe(DwebErrorCode.ENTRY_PATH_INVALID);
      expect(err.message).toMatch(
        /入口路径格式不支持|Entry path format not supported|段数过多|\/foo\/bar\/baz/,
      );
    });
  });

  describe("throwDwebError", () => {
    it("抛出错误", () => {
      expect(() => throwDwebError(DwebErrorCode.RUNTIME_UNSUPPORTED)).toThrow(
        DwebError,
      );
      expect(() => throwDwebError(DwebErrorCode.RUNTIME_UNSUPPORTED)).toThrow(
        /仅支持 Deno.*运行时环境|Only Deno.*runtime is supported/i,
      );
    });

    it("带 cause 抛出", async () => {
      const cause = new Error("原始错误");
      let caught: DwebError | null = null;
      try {
        await (async () => {
          throw createDwebError(DwebErrorCode.FILE_READ_FAILED, { path: "x" }, {
            cause,
          });
        })();
      } catch (e) {
        caught = e as DwebError;
      }
      expect(caught).not.toBeNull();
      expect(isDwebError(caught)).toBe(true);
      if (caught) {
        expect(caught.cause).toBe(cause);
        expect(caught.message).toMatch(/无法读取 x|Cannot read x/);
      }
    });
  });

  describe("assertRejects - 异步错误断言", () => {
    it("应正确断言 DwebError 抛出", async () => {
      await assertRejects(
        async () => {
          throw createDwebError(DwebErrorCode.FILE_READ_FAILED, {
            path: "test.json",
          });
        },
        DwebError,
        /无法读取 test\.json|Cannot read test\.json/,
      );
    });
  });

  describe("isDwebError", () => {
    it("DwebError 实例返回 true", () => {
      const dwebErr = createDwebError(DwebErrorCode.APP_NOT_INITIALIZED);
      expect(isDwebError(dwebErr)).toBe(true);
    });

    it("普通 Error 返回 false", () => {
      const nativeErr = new Error("普通错误");
      expect(isDwebError(nativeErr)).toBe(false);
    });

    it("null 返回 false", () => {
      expect(isDwebError(null)).toBe(false);
    });
  });

  describe("DwebError 实例方法", () => {
    it("toString", () => {
      const err = createDwebError(DwebErrorCode.CONFIG_NAME_INVALID);
      expect(err.toString()).toMatch(
        /\[dweb\] DWEB_E01:.*(配置项 'name' 必须是字符串类型|Config 'name' must be a string)/,
      );
    });

    it("toJSON", () => {
      const err = createDwebError(DwebErrorCode.GENERATE_TYPE_UNSUPPORTED, {
        type: "unknown",
      });
      const json = err.toJSON();
      expect(json.code).toBe("DWEB_E26");
      expect(json.messageKey).toBe("errors.DWEB_E26");
      expect(json.params).toEqual({ type: "unknown" });
    });
  });

  describe("setDwebErrorTranslator - i18n 翻译器", () => {
    it("注册翻译器后使用翻译消息", () => {
      setDwebErrorTranslator((key, params) => {
        if (key === "errors.DWEB_E01") return "Config 'name' must be string";
        if (key === "errors.DWEB_E26" && params?.type) {
          return `Unsupported type: ${params.type}`;
        }
        return key;
      });
      const err = createDwebError(DwebErrorCode.CONFIG_NAME_INVALID);
      expect(err.message).toBe("Config 'name' must be string");
      const err2 = createDwebError(DwebErrorCode.GENERATE_TYPE_UNSUPPORTED, {
        type: "foo",
      });
      expect(err2.message).toBe("Unsupported type: foo");
    });

    it("传入 null 清除翻译器，恢复默认消息", () => {
      setDwebErrorTranslator((key) => (key === "errors.DWEB_E01" ? "x" : key));
      const errBefore = createDwebError(DwebErrorCode.CONFIG_NAME_INVALID);
      expect(errBefore.message).toBe("x");
      setDwebErrorTranslator(null);
      expect(getDwebErrorTranslator()).toBeNull();
      const errAfter = createDwebError(DwebErrorCode.CONFIG_NAME_INVALID);
      expect(errAfter.message).toBe("Config 'name' must be a string");
    });
  });
});
