/**
 * isMainModule 单元测试
 */

import { describe, expect, it } from "@dreamer/test";
import { isMainModule } from "../../src/utils/main-module.ts";

describe("isMainModule", () => {
  it("当传入对象包含 main: true 时应返回 true", () => {
    const mockMeta = {
      url: "file:///mock/path/cli.ts",
      main: true,
    } as unknown as ImportMeta;
    expect(isMainModule(mockMeta)).toBe(true);
  });

  it("当传入对象包含 main: false 时应返回 false", () => {
    const mockMeta = {
      url: "file:///mock/path/cli.ts",
      main: false,
    } as unknown as ImportMeta;
    expect(isMainModule(mockMeta)).toBe(false);
  });

  it("当传入与 Deno.mainModule 相同的 URL 字符串时应返回 true", () => {
    const deno = (globalThis as { Deno?: { mainModule?: string } }).Deno;
    if (deno?.mainModule) {
      expect(isMainModule(deno.mainModule)).toBe(true);
    }
  });

  it("当传入不匹配的随机 URL 时应返回 false", () => {
    expect(isMainModule("file:///non-existent-module-xyz.ts")).toBe(false);
  });
});
