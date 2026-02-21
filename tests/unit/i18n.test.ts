/**
 * i18n 国际化模块测试
 *
 * 测试 src/utils/i18n.ts 的功能：
 * - $tr 框架翻译函数（init 后返回翻译，init 前返回 key）
 * - setDwebLocale 设置待用 locale
 * - detectLocale 从环境变量检测语言
 *
 * 注：i18n 模块加载时自动初始化，import 本模块后 $tr 即可用；本测试验证行为。
 */

import "../setup.ts";
import { deleteEnv, getEnv, setEnv } from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import { $tr, detectLocale, setDwebLocale } from "../../src/utils/i18n.ts";

describe("i18n (i18n.ts)", () => {
  describe("$tr()", () => {
    it("应返回已翻译的文案（init 后）", () => {
      const result = $tr("cli.usage");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toBe("cli.usage");
    });

    it("应支持带参数的翻译", () => {
      const result = $tr("errors.DWEB_E01", { path: "name" });
      expect(typeof result).toBe("string");
      expect(result).toContain("name");
    });

    it("未知 key 时应返回 key 本身（fallback）", () => {
      const result = $tr("nonexistent.key.xyz");
      expect(result).toBe("nonexistent.key.xyz");
    });
  });

  describe("setDwebLocale()", () => {
    it("应接受 zh-CN 不抛错", () => {
      expect(() => setDwebLocale("zh-CN")).not.toThrow();
    });

    it("应接受 en-US 不抛错", () => {
      expect(() => setDwebLocale("en-US")).not.toThrow();
    });

    it("应接受 undefined 清除待用 locale", () => {
      expect(() => setDwebLocale(undefined)).not.toThrow();
    });

    it("应接受 null 清除待用 locale", () => {
      expect(() => setDwebLocale(null)).not.toThrow();
    });
  });

  describe("detectLocale()", () => {
    const LANG = "LANG";
    const LC_ALL = "LC_ALL";
    const LANGUAGE = "LANGUAGE";

    /** 保存并清除语言相关环境变量，测试后恢复 */
    function withLocaleEnv(
      overrides: Partial<Record<string, string>>,
      fn: () => void,
    ) {
      const orig: Record<string, string | undefined> = {};
      for (const k of [LANG, LC_ALL, LANGUAGE]) {
        orig[k] = getEnv(k);
        deleteEnv(k);
      }
      for (const [k, v] of Object.entries(overrides)) {
        if (v !== undefined) setEnv(k, v);
      }
      try {
        fn();
      } finally {
        for (const k of [LANG, LC_ALL, LANGUAGE]) {
          const v = orig[k];
          if (v !== undefined) setEnv(k, v);
          else deleteEnv(k);
        }
      }
    }

    it("无环境变量时应返回 null", () => {
      withLocaleEnv({}, () => {
        const result = detectLocale();
        expect(result).toBeNull();
      });
    });

    it("LANGUAGE=zh_CN 时应规范化为 zh-CN", () => {
      withLocaleEnv({ [LANGUAGE]: "zh_CN" }, () => {
        const result = detectLocale();
        expect(result).toBe("zh-CN");
      });
    });

    it("LANG=en_US 时应规范化为 en-US", () => {
      withLocaleEnv({ [LANG]: "en_US" }, () => {
        const result = detectLocale();
        expect(result).toBe("en-US");
      });
    });

    it("LC_ALL=zh_CN.UTF-8 时应规范化为 zh-CN", () => {
      withLocaleEnv({ [LC_ALL]: "zh_CN.UTF-8" }, () => {
        const result = detectLocale();
        expect(result).toBe("zh-CN");
      });
    });

    it("LANGUAGE=zh_CN:en_US:en 时应取第一个并规范化为 zh-CN", () => {
      withLocaleEnv({ [LANGUAGE]: "zh_CN:en_US:en" }, () => {
        const result = detectLocale();
        expect(result).toBe("zh-CN");
      });
    });

    it("不支持的语言代码应返回 null", () => {
      withLocaleEnv({ [LANGUAGE]: "it_IT" }, () => {
        const result = detectLocale();
        expect(result).toBeNull();
      });
    });
  });
});
