/**
 * 升级提示客户端：localStorage 记录与比较动作
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { DWEB_APP_VERSION_STORAGE_KEY } from "../../src/utils/constants.ts";
import {
  normalizeStoredAppVersion,
  readStoredAppVersion,
  resolveStoredUpgradeAction,
  writeStoredAppVersion,
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

describe("localStorage 直接读写", () => {
  const memory = new Map<string, string>();
  const fake = {
    getItem(key: string): string | null {
      return memory.has(key) ? memory.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      memory.set(key, value);
    },
    removeItem(key: string): void {
      memory.delete(key);
    },
    clear(): void {
      memory.clear();
    },
  };

  const original = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );

  function install(): void {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: fake,
    });
    memory.clear();
  }

  function restore(): void {
    if (original) {
      Object.defineProperty(globalThis, "localStorage", original);
    } else {
      // deno-lint-ignore no-explicit-any
      delete (globalThis as any).localStorage;
    }
  }

  it("写入纯字符串，并能读回先前 storage 的 JSON 封装", () => {
    install();
    try {
      expect(readStoredAppVersion()).toBeNull();
      writeStoredAppVersion("1.0.1");
      expect(memory.get(DWEB_APP_VERSION_STORAGE_KEY)).toBe("1.0.1");
      expect(readStoredAppVersion()).toBe("1.0.1");
      memory.set(
        DWEB_APP_VERSION_STORAGE_KEY,
        JSON.stringify({ value: "2.0.0" }),
      );
      expect(readStoredAppVersion()).toBe("2.0.0");
    } finally {
      restore();
    }
  });
});
