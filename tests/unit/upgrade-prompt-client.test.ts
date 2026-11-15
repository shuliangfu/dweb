/**
 * 升级提示客户端：localStorage 记录与比较动作
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  normalizeStoredAppVersion,
  resolveStoredUpgradeAction,
} from "../../src/feature/upgrade-prompt-client.ts";

describe("normalizeStoredAppVersion", () => {
  it("应收下字符串、包封装对象和控制台手写的对象", () => {
    expect(normalizeStoredAppVersion(" 1.2.3 ")).toBe("1.2.3");
    expect(normalizeStoredAppVersion("")).toBeNull();
    expect(normalizeStoredAppVersion(null)).toBeNull();
    expect(normalizeStoredAppVersion({ value: "2.0.0" })).toBe("2.0.0");
    expect(normalizeStoredAppVersion({ version: "0.0.0" })).toBe("0.0.0");
  });
});

describe("resolveStoredUpgradeAction", () => {
  it("没有线上版本时不动作", () => {
    expect(resolveStoredUpgradeAction(null, "")).toBe("idle");
    expect(resolveStoredUpgradeAction("1.0.0", "   ")).toBe("idle");
  });

  it("没有记录时应静默写入，不弹层", () => {
    expect(resolveStoredUpgradeAction(null, "1.0.0")).toBe("seed");
    expect(resolveStoredUpgradeAction("", "1.0.0")).toBe("seed");
  });

  it("线上版本更大时应弹层，否则不动作", () => {
    expect(resolveStoredUpgradeAction("1.0.0", "1.0.1")).toBe("prompt");
    expect(resolveStoredUpgradeAction("1.0.0", "1.0.0")).toBe("idle");
    expect(resolveStoredUpgradeAction("1.2.0", "1.1.9")).toBe("idle");
    expect(resolveStoredUpgradeAction("0.0.0", "1.0.0")).toBe("prompt");
  });
});
