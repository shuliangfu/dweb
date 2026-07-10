/**
 * csr-client-chunk 直接覆盖（不经 builder re-export）
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  buildRouteChunkUrlMap,
  getChunkBaseName,
  getChunkFileNameForComponent,
  isClientChunkFile,
} from "../../src/feature/csr-client-chunk.ts";

describe("csr-client-chunk", () => {
  it("buildRouteChunkUrlMap 应映射存在的 chunk", () => {
    const map = buildRouteChunkUrlMap(
      [{ componentPath: "about" }, { componentPath: "missing" }],
      ["about-ABCDEF.js", "_client.js"],
    );
    expect(map.about).toBe("/about-ABCDEF.js");
    expect(map.missing).toBeUndefined();
  });

  it("getChunkBaseName / isClientChunkFile 边界", () => {
    expect(getChunkBaseName("index-Ab12Cd.js")).toBe("index");
    expect(isClientChunkFile("/chunk-ABCDEF.js")).toBe(true);
    expect(isClientChunkFile("/_client.js")).toBe(false);
  });

  it("末段唯一 create-*.js 应匹配深层路径", () => {
    expect(
      getChunkFileNameForComponent("workspace/projects/create", [
        "create-HASH01.js",
        "_client.js",
      ]),
    ).toBe("create-HASH01.js");
  });
});
